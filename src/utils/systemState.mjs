/**
 * @file systemMonitor.js
 * @description Módulo completo para monitorear y gestionar el estado de un sistema multimedia basado en VLC
 * @module systemMonitor
 * 
 * @requires fs - Operaciones sincrónicas del sistema de archivos
 * @requires fs/promises - Operaciones asíncronas del sistema de archivos
 * @requires path - Manejo de rutas de archivos
 * @requires os - Información del sistema operativo
 * @requires axios - Cliente HTTP para comunicación con VLC
 * @requires ./activePlaylist.mjs - Gestión de playlists activas
 * @requires ../config/appConfig.mjs - Configuración de la aplicación
 * 
 * @version 2.1.0
 * @license MIT
 * @author [Equipo de Desarrollo]
 * @created 2023-08-15
 * @updated 2024-03-25
 * 
 * @todo MEJORAS PENDIENTES:
 * [⚠️] 1. Configuración dinámica del intervalo de monitoreo
 * [⚠️] 2. Implementar EventEmitter para notificaciones de cambios
 * [⚠️] 3. Adoptar sistema de logging estructurado (Winston/Pino)
 * [⚠️] 4. Añadir pruebas unitarias para funciones críticas
 * [⚠️] 5. Implementar cache en memoria para acceso rápido al estado
 * [⚠️] 6. Mejorar manejo de errores con códigos personalizados
 * [⚠️] 7. Añadir sistema de reintentos para conexión con VLC
 * [⚠️] 8. Implementar rotación automática del archivo de estado
 * [⚠️] 9. Añadir validación de esquema para el estado guardado
 * [⚠️] 10. Soporte para múltiples instancias de VLC
 * 
 * @example
 * // Uso básico
 * import { getSystemState, startSystemStateMonitor } from './systemMonitor.js';
 * 
 * // Obtener estado actual
 * const state = await getSystemState();
 * 
 * // Iniciar monitoreo automático
 * const monitor = startSystemStateMonitor(30000); // 30 segundos
 * 
 * // Detener monitoreo
 * monitor.stop();
 */

// ======================= IMPORTS ======================= //

import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { getActivePlaylist } from './activePlaylist.mjs';
import { getConfig } from '../config/appConfig.mjs';

// Ruta del archivo de estado
const STATE_FILE_PATH = path.join(process.cwd(), 'src/config/systemState.json');

// Función para obtener información del sistema
async function getSystemInfo() {
    const networkInterfaces = os.networkInterfaces();
    const network = {};

    // Filtrar y formatear interfaces de red
    Object.keys(networkInterfaces).forEach(name => {
        const iface = networkInterfaces[name].find(i => i.family === 'IPv4');
        if (iface) {
            network[name] = {
                address: iface.address,
                netmask: iface.netmask,
                mac: iface.mac,
                internal: iface.internal
            };
        }
    });

    return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        cpus: os.cpus().length,
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        network,
        timestamp: new Date().toISOString()
    };
}

// Función para obtener un resumen de interfaces de red
function getNetworkSummary() {
    const interfaces = os.networkInterfaces();
    const ipAddresses = {};

    Object.keys(interfaces).forEach(ifaceName => {
        const iface = interfaces[ifaceName];
        const ipv4 = iface.find(addr => addr.family === 'IPv4' && !addr.internal);

        if (ipv4) {
            ipAddresses[ifaceName] = {
                address: ipv4.address,
                mac: ipv4.mac
            };
        }
    });

    return ipAddresses;
}

// Función auxiliar para hacer peticiones a VLC
async function vlcRequest(endpoint = '', method = 'GET', params = {}, timeout = 5000) {
    const config = getConfig();
    const { host, port, password } = config.vlc;
    const auth = Buffer.from(`:${password}`).toString('base64');

    try {
        const response = await axios({
            method,
            url: `http://${host}:${port}/requests/status.json${endpoint}`,
            params,
            headers: {
                'Authorization': `Basic ${auth}`
            },
            timeout: timeout // Aumentar el tiempo de espera a 5 segundos por defecto
        });

        return response.data;
    } catch (error) {
        // Mejorar mensajes de error basados en el código de estado HTTP
        if (error.response) {
            const statusCode = error.response.status;
            let errorMsg = '';

            if (statusCode === 401) {
                errorMsg = `Error de autenticación (401): La contraseña de VLC '${password}' parece ser incorrecta`;
            } else if (statusCode === 404) {
                errorMsg = `Recurso no encontrado (404): El endpoint solicitado no existe`;
            } else if (statusCode >= 500) {
                errorMsg = `Error del servidor VLC (${statusCode}): Problema interno en VLC`;
            } else {
                errorMsg = `Error HTTP ${statusCode}: ${error.response.statusText}`;
            }

            console.log(`Error al hacer petición a VLC: ${errorMsg}`);
            throw new Error(errorMsg);
        } else if (error.code === 'ECONNREFUSED') {
            const errorMsg = `Conexión rechazada - VLC no está en ejecución o no escucha en el puerto ${port}`;
            console.log(`Error al hacer petición a VLC: ${errorMsg}`);
            throw new Error(errorMsg);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ETIMEOUT') {
            const errorMsg = `Tiempo de espera agotado conectando a ${host}:${port} - VLC podría estar iniciándose`;
            console.log(`Error al hacer petición a VLC: ${errorMsg}`);
            throw new Error(errorMsg);
        } else {
            console.log(`Error al hacer petición a VLC: ${error.message}`);
            throw error;
        }
    }
}

// Función para obtener el estado de VLC con reintentos
async function getVLCStatus() {
    try {
        const response = await vlcRequest();

        // Procesar la respuesta para extraer información relevante
        const status = {
            connected: true,
            playing: false,
            paused: false,
            stopped: true,
            currentItem: null,
            position: 0,
            time: 0,
            length: 0,
            volume: 0,
            random: false,
            repeat: false,
            fullscreen: false
        };

        if (response) {
            // Actualizar los estados básicos
            status.playing = response.state === 'playing';
            status.paused = response.state === 'paused';
            status.stopped = response.state === 'stopped';
            status.position = response.position || 0;
            status.time = response.time || 0;
            status.length = response.length || 0;
            status.volume = response.volume || 0;
            status.random = response.random || false;
            status.repeat = response.repeat || false;
            status.fullscreen = response.fullscreen || false;

            // Obtener información del elemento actual
            if (response.information && response.information.category) {
                const category = response.information.category;

                if (category.meta) {
                    status.currentItem = category.meta.filename || null;

                    // Si no tenemos filename pero tenemos title, usarlo como alternativa
                    if (!status.currentItem && category.meta.title) {
                        status.currentItem = category.meta.title;
                    }
                }
            }

            // Búsqueda alternativa del nombre del archivo
            if (!status.currentItem && response.state !== 'stopped') {
                // Intentar extraer de information.category.meta en diferentes niveles
                if (response.information && response.information.title) {
                    status.currentItem = response.information.title;
                } else if (response.currentplid) {
                    // Si tenemos un ID de playlist, intentar obtener el nombre del archivo
                    try {
                        const plInfo = await vlcRequest('pl_get');
                        if (plInfo && plInfo.children) {
                            const currentItem = plInfo.children.find(
                                item => item.id === response.currentplid
                            );
                            if (currentItem) {
                                status.currentItem = currentItem.name || null;
                            }
                        }
                    } catch (err) {
                        console.warn(`⚠️ No se pudo obtener información de playlist: ${err.message}`);
                    }
                }
            }
        }

        return status;
    } catch (error) {
        console.error(`Error al obtener estado de VLC: ${error.message}`);
        return {
            connected: false,
            playing: false,
            paused: false,
            stopped: true,
            currentItem: null,
            position: 0,
            time: 0,
            length: 0,
            volume: 0,
            random: false,
            repeat: false,
            fullscreen: false
        };
    }
}

// Función para obtener información de almacenamiento
async function getStorageInfo() {
    const config = getConfig();
    const playlistDirectory = config.videos.directory;

    // Información del directorio de videos
    let videosStats = {
        exists: false,
        isDirectory: false,
        size: 0,
        fileCount: 0
    };

    try {
        const stats = await fsPromises.stat(playlistDirectory);
        videosStats.exists = true;
        videosStats.isDirectory = stats.isDirectory();

        if (videosStats.isDirectory) {
            const files = await fsPromises.readdir(playlistDirectory);
            const videoFiles = files.filter(f => !f.endsWith('.m3u.temp') && (
                f.endsWith('.mp4') ||
                f.endsWith('.avi') ||
                f.endsWith('.mkv') ||
                f.endsWith('.mov')
            ));

            videosStats.fileCount = videoFiles.length;

            // Calcular tamaño total (opcional, puede ser costoso)
            let totalSize = 0;
            for (const file of videoFiles) {
                const filePath = path.join(playlistDirectory, file);
                try {
                    const fileStats = await fsPromises.stat(filePath);
                    totalSize += fileStats.size;
                } catch (err) {
                    console.log(`Error al leer archivo ${file}: ${err.message}`);
                }
            }
            videosStats.size = totalSize;
        }
    } catch (err) {
        console.log(`Error al leer directorio de videos: ${err.message}`);
    }

    // Información del disco
    const diskInfo = await getDiskInfo();

    return {
        playlistDirectory,
        videosStats,
        totalSpace: diskInfo.total,
        freeSpace: diskInfo.free,
        usedSpace: diskInfo.total - diskInfo.free,
        timestamp: new Date().toISOString()
    };
}

// Función para obtener información del disco
async function getDiskInfo() {
    // En sistemas Linux/Unix
    if (os.platform() === 'linux' || os.platform() === 'darwin') {
        try {
            const mountPoint = '/'; // Punto de montaje principal
            const { stdout } = await import('child_process').then(cp => {
                return new Promise((resolve, reject) => {
                    cp.exec(`df -k ${mountPoint}`, (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve({ stdout, stderr });
                    });
                });
            });

            const lines = stdout.trim().split('\n');
            const [_, size, used, available] = lines[1].split(/\s+/);

            return {
                total: parseInt(size) * 1024,
                free: parseInt(available) * 1024,
                used: parseInt(used) * 1024
            };
        } catch (error) {
            console.log(`Error al obtener información del disco: ${error.message}`);
        }
    }

    // En caso de error o si estamos en Windows, intentamos una aproximación
    const root = os.platform() === 'win32' ? 'C:' : '/';
    try {
        // En Windows esto puede no ser preciso
        const { size, free } = await fsPromises.statfs(root);
        return {
            total: size,
            free: free,
            used: size - free
        };
    } catch (error) {
        console.log(`Error al obtener información del disco: ${error.message}`);
        // Valores por defecto
        return {
            total: os.totalmem(), // Usamos memoria como aproximación
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        };
    }
}

// Función para obtener información de la aplicación
function getAppInfo() {
    const config = getConfig();

    return {
        deviceId: config.device?.id || os.hostname(),
        deviceName: config.device?.name || os.hostname(),
        deviceType: config.device?.type || 'player',
        deviceGroup: config.device?.group || 'default',
        server: {
            port: config.server.port,
            host: config.server.host
        },
        vlcConfig: {
            host: config.vlc.host,
            port: config.vlc.port
        },
        version: '1.0.0', // Versión de la aplicación
        startTime: new Date().toISOString(),
        nodeVersion: process.version
    };
}

// Función principal para obtener todo el estado del sistema
export async function getSystemState() {
    try {
        // Primero intentamos cargar el estado guardado
        let systemState = {};
        if (fs.existsSync(STATE_FILE_PATH)) {
            const data = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
            systemState = JSON.parse(data);
        }

        // Si no hay una propiedad activePlaylist, inicializamos una vacía
        if (!systemState.activePlaylist) {
            systemState.activePlaylist = {
                playlistName: null,
                playlistPath: null,
                currentIndex: 0,
                fileCount: 0,
                isDefault: false,
                lastLoaded: null
            };
        }

        // Obtenemos el estado actual de VLC para sincronizarlo con activePlaylist
        let vlcStatus = null;
        try {
            vlcStatus = await getVLCStatus();

            // Si VLC está reproduciendo algo, usamos esa información para actualizar activePlaylist
            if (vlcStatus && vlcStatus.connected && vlcStatus.playing && vlcStatus.currentItem) {
                console.log(`ℹ️ VLC está reproduciendo: ${vlcStatus.currentItem}`);

                // Intentar determinar a qué playlist pertenece el archivo actual
                const playlistInfo = await determinarPlaylistDelArchivo(vlcStatus.currentItem);

                if (playlistInfo) {
                    console.log(`ℹ️ El archivo pertenece a la playlist: ${playlistInfo.playlistName}`);

                    // Actualizar activePlaylist con los datos reales de lo que VLC está reproduciendo
                    systemState.activePlaylist = {
                        ...systemState.activePlaylist,
                        playlistName: playlistInfo.playlistName,
                        playlistPath: playlistInfo.playlistPath,
                        // Mantener otros campos si existen
                        currentIndex: vlcStatus.position !== undefined ?
                            Math.floor(vlcStatus.position * playlistInfo.fileCount) :
                            systemState.activePlaylist.currentIndex,
                        fileCount: playlistInfo.fileCount || systemState.activePlaylist.fileCount
                    };

                    console.log(`✅ Información de playlist sincronizada con estado real de VLC`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ No se pudo obtener el estado de VLC para sincronizar: ${error.message}`);
        }

        // Intentamos cargar información de la playlist activa desde activePlaylist.json
        try {
            if (fs.existsSync(ACTIVE_PLAYLIST_PATH)) {
                const activePlaylistData = await fsPromises.readFile(ACTIVE_PLAYLIST_PATH, 'utf8');
                const activePlaylistFile = JSON.parse(activePlaylistData);

                // Verificamos si hay alguna playlist marcada como activa en el archivo
                const activePlaylists = Object.entries(activePlaylistFile).filter(([_, playlist]) =>
                    playlist.active === true
                );

                if (activePlaylists.length > 0) {
                    const [playlistName, playlistInfo] = activePlaylists[0];

                    // Solo actualizamos si la información de VLC no actualizó la playlist
                    if (!vlcStatus || !vlcStatus.connected || systemState.activePlaylist.playlistPath === null) {
                        // Actualizamos la información de activePlaylist con datos de activePlaylist.json
                        // pero preservamos valores existentes para campos no proporcionados
                        systemState.activePlaylist = {
                            ...systemState.activePlaylist,
                            playlistName,
                            playlistPath: playlistInfo.playlistPath || systemState.activePlaylist.playlistPath,
                            // Preservamos estos valores si existen, o usamos los nuevos si están disponibles
                            fileCount: playlistInfo.fileCount || systemState.activePlaylist.fileCount,
                            currentIndex: playlistInfo.currentIndex !== undefined ?
                                playlistInfo.currentIndex : systemState.activePlaylist.currentIndex,
                            isDefault: playlistInfo.isDefault !== undefined ?
                                playlistInfo.isDefault : systemState.activePlaylist.isDefault,
                            lastLoaded: playlistInfo.lastLoaded || systemState.activePlaylist.lastLoaded
                        };
                    }

                    // Si tenemos el nombre pero no la ruta, intentamos reconstruirla
                    if (!systemState.activePlaylist.playlistPath && systemState.activePlaylist.playlistName) {
                        await reconstruirPathPlaylist(systemState.activePlaylist);
                    }
                }
            }
        } catch (err) {
            console.error(`Error al leer activePlaylist.json: ${err.message}`);
        }

        // Aseguramos que playlistPath nunca sea null si tenemos playlistName
        if (systemState.activePlaylist.playlistName && !systemState.activePlaylist.playlistPath) {
            await reconstruirPathPlaylist(systemState.activePlaylist);
        }

        // Obtener información del sistema
        const system = await getSystemInfo();

        // Obtener información de almacenamiento
        const storage = await getStorageInfo();

        // Obtener información de VLC
        let vlc = { connected: false, playing: false, paused: false, stopped: true };
        try {
            vlc = await getVLCStatus() || vlc;
        } catch (error) {
            console.log('ℹ️ No se pudo obtener el estado de VLC:', error.message);
        }

        // Obtener información de la aplicación
        const app = await getAppInfo();

        // Crear el estado del sistema con timestamp
        const newState = {
            timestamp: new Date().toISOString(),
            system,
            storage,
            vlc,
            app,
            activePlaylist: systemState.activePlaylist
        };

        return newState;
    } catch (error) {
        console.error(`Error al obtener estado del sistema: ${error.message}`);
        throw error;
    }
}

// Guardar el estado del sistema en un archivo
export async function saveSystemState(forceState = null) {
    try {
        // Si se proporciona un estado forzado, usarlo
        // Si no, obtener el estado actual del sistema
        const state = forceState || await getSystemState();

        // Hacer una copia del estado para modificarlo antes de guardar
        const stateToSave = JSON.parse(JSON.stringify(state));

        // Asegurar que activePlaylist tenga todos los campos necesarios y sean válidos
        if (stateToSave.activePlaylist) {
            // Si playlistPath es null pero tenemos playlistName, intentar reconstruir el path
            if (!stateToSave.activePlaylist.playlistPath && stateToSave.activePlaylist.playlistName) {
                console.log(`⚠️ playlistPath es null pero tenemos playlistName. Intentando reconstruir...`);

                try {
                    // Importar appConfig para obtener las rutas
                    const { getConfig } = await import('../config/appConfig.mjs');
                    const config = getConfig();
                    const playlistsDir = config.paths.playlists;

                    // Buscar en múltiples ubicaciones posibles
                    const possibleLocations = [
                        // En el directorio de playlists
                        path.join(playlistsDir, stateToSave.activePlaylist.playlistName,
                            `${stateToSave.activePlaylist.playlistName}.m3u`),
                        // En el directorio de videos
                        path.join(playlistDir, stateToSave.activePlaylist.playlistName,
                            `${stateToSave.activePlaylist.playlistName}.m3u`)
                    ];

                    // Verificar cada ubicación posible
                    for (const location of possibleLocations) {
                        if (fs.existsSync(location)) {
                            stateToSave.activePlaylist.playlistPath = location;
                            console.log(`✅ Path reconstruido antes de guardar: ${location}`);
                            break;
                        }
                    }

                    // Si todavía no encontramos la ruta, buscar recursivamente
                    if (!stateToSave.activePlaylist.playlistPath) {
                        const foundPath = await buscarArchivoRecursivo(
                            playlistDir,
                            `${stateToSave.activePlaylist.playlistName}.m3u`
                        );

                        if (foundPath) {
                            stateToSave.activePlaylist.playlistPath = foundPath;
                            console.log(`✅ Path encontrado mediante búsqueda recursiva: ${foundPath}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error al reconstruir path: ${error.message}`);
                }
            }

            // Verificar si VLC está reproduciendo algo para sincronizar los datos
            if (stateToSave.vlc && stateToSave.vlc.playing && stateToSave.vlc.currentItem) {
                console.log(`ℹ️ VLC está reproduciendo: ${stateToSave.vlc.currentItem}`);

                try {
                    // Verificar si el item actual pertenece a la playlist activa
                    const playlistInfo = await determinarPlaylistDelArchivo(stateToSave.vlc.currentItem);

                    if (playlistInfo) {
                        console.log(`ℹ️ El archivo pertenece a la playlist: ${playlistInfo.playlistName}`);

                        // Si la playlist es diferente a la activa o no tenemos path, actualizar
                        if (playlistInfo.playlistName !== stateToSave.activePlaylist.playlistName ||
                            !stateToSave.activePlaylist.playlistPath) {

                            console.log(`⚠️ Sincronizando activePlaylist con lo que VLC está reproduciendo realmente`);

                            stateToSave.activePlaylist = {
                                ...stateToSave.activePlaylist,
                                playlistName: playlistInfo.playlistName,
                                playlistPath: playlistInfo.playlistPath,
                                fileCount: playlistInfo.fileCount || stateToSave.activePlaylist.fileCount,
                                currentIndex: playlistInfo.currentIndex !== undefined ?
                                    playlistInfo.currentIndex : stateToSave.activePlaylist.currentIndex
                            };
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error al verificar el archivo de la playlist: ${error.message}`);
                }
            }
        }

        // Verificar que el directorio existe
        const dir = path.dirname(STATE_FILE_PATH);
        if (!fs.existsSync(dir)) {
            await fsPromises.mkdir(dir, { recursive: true });
        }

        // Guardar el estado en el archivo
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(stateToSave, null, 2));
        console.log(`Estado del sistema guardado en: ${STATE_FILE_PATH}`);

        // Verificar después de guardar que playlistPath no es null
        if (stateToSave.activePlaylist && !stateToSave.activePlaylist.playlistPath &&
            stateToSave.activePlaylist.playlistName) {
            console.warn(`⚠️ A pesar de los intentos, playlistPath sigue siendo null después de guardar`);
        }

        return true;
    } catch (error) {
        console.error(`Error al guardar el estado: ${error.message}`);
        return false;
    }
}

// Función para cargar el estado guardado del sistema
async function loadSystemState() {
    try {
        if (fs.existsSync(STATE_FILE_PATH)) {
            const data = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
            const state = JSON.parse(data);

            // Verificar si activePlaylist existe pero no tiene playlistPath
            if (state.activePlaylist && state.activePlaylist.playlistName && !state.activePlaylist.playlistPath) {
                // Intentar obtener la información actualizada de la playlist activa
                try {
                    const activePlaylist = await getActivePlaylist();
                    if (activePlaylist && activePlaylist.playlistPath) {
                        console.log(`ℹ️ Actualizando playlistPath en estado cargado de: null a: ${activePlaylist.playlistPath}`);
                        state.activePlaylist.playlistPath = activePlaylist.playlistPath;
                    }
                } catch (error) {
                    console.log(`⚠️ No se pudo recuperar la playlist activa para actualizar playlistPath: ${error.message}`);
                }
            }

            return state;
        }

        console.log(`Archivo de estado no encontrado en: ${STATE_FILE_PATH}`);
        return null;
    } catch (error) {
        console.error(`Error al cargar estado del sistema: ${error.message}`);
        return null;
    }
}

// Variable para almacenar el intervalo de monitoreo
let monitorInterval = null;

// Función para iniciar el monitoreo periódico del estado del sistema
function startSystemStateMonitor(intervalMs = 60000) { // Por defecto cada minuto
    if (monitorInterval) {
        clearInterval(monitorInterval);
    }

    // Guardar estado inmediatamente al iniciar
    saveSystemState().catch(err => {
        console.error(`Error en la primera ejecución del monitor: ${err.message}`);
    });

    // Configurar intervalo para actualizaciones periódicas
    monitorInterval = setInterval(() => {
        saveSystemState().catch(err => {
            console.error(`Error en la actualización periódica del estado: ${err.message}`);
        });
    }, intervalMs);

    console.log(`Monitor de estado del sistema iniciado (intervalo: ${intervalMs}ms)`);

    // Devolver una función para detener el monitoreo
    return {
        stop: () => {
            if (monitorInterval) {
                clearInterval(monitorInterval);
                monitorInterval = null;
                console.log('Monitor de estado del sistema detenido');
            }
        }
    };
}

/**
 * Intenta determinar a qué playlist pertenece un archivo específico
 * @param {string} filename - Nombre del archivo que se está reproduciendo
 * @returns {Promise<Object|null>} - Información de la playlist o null si no se encontró
 */
async function determinarPlaylistDelArchivo(filename) {
    try {
        console.log(`🔍 Buscando a qué playlist pertenece el archivo: ${filename}`);

        // Obtener rutas de directorios
        const { getConfig } = await import('../config/appConfig.mjs');
        const config = getConfig();
        const playlistsDir = config.paths.playlists

        // Buscar en todas las carpetas de playlists
        const playlists = [];

        // Primero buscar en el directorio de playlists
        if (fs.existsSync(playlistsDir)) {
            const playlistFolders = await fsPromises.readdir(playlistsDir, { withFileTypes: true });

            for (const dirent of playlistFolders) {
                if (dirent.isDirectory()) {
                    const playlistName = dirent.name;
                    const playlistPath = path.join(playlistsDir, playlistName, `${playlistName}.m3u`);

                    if (fs.existsSync(playlistPath)) {
                        playlists.push({
                            playlistName,
                            playlistPath,
                            directoryPath: path.join(playlistsDir, playlistName)
                        });
                    }
                }
            }
        }

        // También buscar en el directorio de videos si es diferente
        if (playlistDir !== playlistsDir && fs.existsSync(playlistDir)) {
            const videosFolders = await fsPromises.readdir(playlistDir, { withFileTypes: true });

            for (const dirent of videosFolders) {
                if (dirent.isDirectory()) {
                    const playlistName = dirent.name;
                    const playlistPath = path.join(playlistDir, playlistName, `${playlistName}.m3u`);

                    if (fs.existsSync(playlistPath)) {
                        playlists.push({
                            playlistName,
                            playlistPath,
                            directoryPath: path.join(playlistDir, playlistName)
                        });
                    }
                }
            }
        }

        // Buscar el archivo en cada playlist
        for (const playlist of playlists) {
            try {
                const playlistContent = await fsPromises.readFile(playlist.playlistPath, 'utf8');
                const lines = playlistContent.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'));

                const fileCount = lines.length;

                // Verificar si el archivo está en la playlist
                const foundIndex = lines.findIndex(line => {
                    const entryFilename = path.basename(line.trim());
                    return entryFilename === filename || entryFilename.includes(filename);
                });

                if (foundIndex !== -1) {
                    return {
                        playlistName: playlist.playlistName,
                        playlistPath: playlist.playlistPath,
                        fileCount,
                        currentIndex: foundIndex
                    };
                }

                // También buscar el archivo físicamente en el directorio de la playlist
                const filesInDir = await fsPromises.readdir(playlist.directoryPath);
                if (filesInDir.includes(filename)) {
                    return {
                        playlistName: playlist.playlistName,
                        playlistPath: playlist.playlistPath,
                        fileCount,
                        currentIndex: 0 // No sabemos el índice exacto
                    };
                }
            } catch (err) {
                console.warn(`⚠️ Error al leer playlist ${playlist.playlistPath}: ${err.message}`);
            }
        }

        console.log(`⚠️ No se encontró el archivo ${filename} en ninguna playlist`);
        return null;
    } catch (error) {
        console.error(`❌ Error al determinar playlist del archivo: ${error.message}`);
        return null;
    }
}

/**
 * Reconstruye la ruta de una playlist basada en su nombre
 * @param {Object} activePlaylist - Objeto de playlist activa a actualizar
 */
async function reconstruirPathPlaylist(activePlaylist) {
    try {
        console.log(`🔄 Reconstruyendo ruta para playlist: ${activePlaylist.playlistName}`);

        // Obtener rutas de directorios
        const { getConfig } = await import('../config/appConfig.mjs');
        const config = getConfig();
        const playlistDir = config.paths.videos || 'public/videos';
        const playlistsDir = config.paths.playlists || playlistDir;

        // Intentar en el directorio de playlists primero
        let possiblePath = path.join(playlistsDir, activePlaylist.playlistName, `${activePlaylist.playlistName}.m3u`);

        if (fs.existsSync(possiblePath)) {
            activePlaylist.playlistPath = possiblePath;
            console.log(`✅ Ruta reconstruida (playlists): ${possiblePath}`);
            return;
        }

        // Si no, intentar en el directorio de videos
        possiblePath = path.join(playlistDir, activePlaylist.playlistName, `${activePlaylist.playlistName}.m3u`);

        if (fs.existsSync(possiblePath)) {
            activePlaylist.playlistPath = possiblePath;
            console.log(`✅ Ruta reconstruida (videos): ${possiblePath}`);
            return;
        }

        // Última opción: buscar en todo el directorio de videos recursivamente
        console.log(`🔍 Buscando playlist en todo el directorio de videos...`);

        const foundPath = await buscarArchivoRecursivo(playlistDir, `${activePlaylist.playlistName}.m3u`);

        if (foundPath) {
            activePlaylist.playlistPath = foundPath;
            console.log(`✅ Ruta encontrada mediante búsqueda recursiva: ${foundPath}`);
            return;
        }

        console.warn(`⚠️ No se pudo reconstruir la ruta para ${activePlaylist.playlistName}`);
    } catch (error) {
        console.error(`❌ Error al reconstruir ruta de playlist: ${error.message}`);
    }
}

/**
 * Busca un archivo recursivamente en un directorio
 * @param {string} directory - Directorio donde buscar
 * @param {string} filename - Nombre del archivo a buscar
 * @returns {Promise<string|null>} - Ruta completa del archivo o null si no se encontró
 */
async function buscarArchivoRecursivo(directory, filename) {
    try {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                const found = await buscarArchivoRecursivo(fullPath, filename);
                if (found) return found;
            } else if (entry.name === filename) {
                return fullPath;
            }
        }

        return null;
    } catch (error) {
        console.error(`Error en búsqueda recursiva: ${error.message}`);
        return null;
    }
}

export {
    getSystemInfo,
    getNetworkSummary,
    getVLCStatus,
    vlcRequest,
    getStorageInfo,
    getDiskInfo,
    getAppInfo,
    loadSystemState,
    startSystemStateMonitor,
    buscarArchivoRecursivo,
    determinarPlaylistDelArchivo
}; 