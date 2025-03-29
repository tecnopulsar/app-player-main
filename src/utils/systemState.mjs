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
 * @requires ./redisClient.mjs - Funciones de Redis
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
 */
// ======================= IMPORTS ======================= //

import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { getActivePlaylist, getDefaultPlaylist } from './activePlaylist.mjs';
import { getConfig } from '../config/appConfig.mjs';
import { saveStateToRedis, loadStateFromRedis } from './redisClient.mjs';

// Rutas de archivos de estado
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
            port: config.appServer.port,
            host: config.appServer.host
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
        // Primero intentamos cargar el estado desde Redis
        let systemState = await loadStateFromRedis();

        // Si no hay estado en Redis, intentamos cargar desde el archivo
        if (!systemState && fs.existsSync(STATE_FILE_PATH)) {
            console.log('ℹ️ Estado no encontrado en Redis, cargando desde archivo...');
            const data = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
            systemState = JSON.parse(data);

            // Guardamos en Redis para la próxima vez
            await saveStateToRedis(systemState);
        } else if (systemState) {
            console.log('ℹ️ Estado cargado desde Redis');
        } else {
            systemState = {};
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

        // Si no hay una propiedad defaultPlaylist, inicializamos una vacía
        if (!systemState.defaultPlaylist) {
            systemState.defaultPlaylist = {
                playlistName: null,
                playlistPath: null
            };
        }

        // Obtenemos el estado actual de VLC para sincronizarlo con activePlaylist
        let vlcStatus = null;
        try {
            vlcStatus = await getVLCStatus();

            // Si VLC está reproduciendo algo, usamos esa información para actualizar activePlaylist
            if (vlcStatus && vlcStatus.connected && vlcStatus.playing && vlcStatus.currentItem) {
                console.log(`ℹ️ VLC está reproduciendo: ${vlcStatus.currentItem}`);

                // Usamos la playlist activa actual como fuente de información
                const activePlaylist = await getActivePlaylist();
                if (activePlaylist && activePlaylist.playlistName) {
                    console.log(`ℹ️ Playlist activa configurada: ${activePlaylist.playlistName}`);

                    // Actualizar activePlaylist con los datos reales de lo que VLC está reproduciendo
                    systemState.activePlaylist = {
                        ...systemState.activePlaylist,
                        ...activePlaylist,
                        // Mantener otros campos si existen
                        currentIndex: vlcStatus.position !== undefined ?
                            Math.floor(vlcStatus.position * activePlaylist.fileCount) :
                            systemState.activePlaylist.currentIndex
                    };

                    console.log(`✅ Información de playlist sincronizada con estado real de VLC`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ No se pudo obtener el estado de VLC para sincronizar: ${error.message}`);
        }

        // Intentamos cargar información de la playlist activa desde systemState.json
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                // Ya tenemos cargado systemState, verificamos si tiene información completa
                // Si no, intentamos complementarla con getActivePlaylist()
                const activePlaylist = await getActivePlaylist();
                if (activePlaylist && activePlaylist.playlistName &&
                    (!systemState.activePlaylist || !systemState.activePlaylist.playlistPath)) {
                    console.log(`ℹ️ Complementando información de playlist desde getActivePlaylist()`);
                    systemState.activePlaylist = {
                        ...systemState.activePlaylist,
                        ...activePlaylist
                    };
                }
            }
        } catch (err) {
            console.error(`Error al verificar la información de la playlist activa: ${err.message}`);
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
        const app = getAppInfo();

        // Obtener información de la playlist por defecto
        let defaultPlaylist = systemState.defaultPlaylist || { playlistName: null, playlistPath: null };
        try {
            const savedDefaultPlaylist = await getDefaultPlaylist();
            if (savedDefaultPlaylist && savedDefaultPlaylist.playlistName) {
                defaultPlaylist = savedDefaultPlaylist;
            }
        } catch (error) {
            console.log(`⚠️ No se pudo recuperar la playlist por defecto: ${error.message}`);
        }

        // Crear el estado del sistema con timestamp
        const newState = {
            timestamp: new Date().toISOString(),
            system,
            storage,
            vlc,
            app,
            activePlaylist: systemState.activePlaylist,
            defaultPlaylist
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
                    const config = getConfig();
                    const playlistsDir = config.paths.playlists;
                    const playlistDir = config.paths.videos || 'public/videos';

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
                    // Verificar la playlist activa actual
                    const activePlaylist = await getActivePlaylist();
                    if (activePlaylist && activePlaylist.playlistName) {
                        console.log(`ℹ️ Playlist activa configurada: ${activePlaylist.playlistName}`);

                        // Actualizar la información de la playlist en el estado
                        stateToSave.activePlaylist = {
                            ...stateToSave.activePlaylist,
                            ...activePlaylist
                        };
                    }
                } catch (error) {
                    console.error(`❌ Error al verificar la playlist activa: ${error.message}`);
                }
            }
        }

        // Asegurar que defaultPlaylist tenga todos los campos necesarios y sean válidos
        if (!stateToSave.defaultPlaylist) {
            stateToSave.defaultPlaylist = {
                playlistName: null,
                playlistPath: null
            };
        } else {
            // Si playlistPath es null pero tenemos playlistName, intentar reconstruir el path
            if (!stateToSave.defaultPlaylist.playlistPath && stateToSave.defaultPlaylist.playlistName) {
                console.log(`⚠️ defaultPlaylist.playlistPath es null pero tenemos defaultPlaylist.playlistName. Intentando reconstruir...`);

                try {
                    // Obtener información actualizada de la playlist por defecto
                    const defaultPlaylist = await getDefaultPlaylist();
                    if (defaultPlaylist && defaultPlaylist.playlistPath) {
                        stateToSave.defaultPlaylist.playlistPath = defaultPlaylist.playlistPath;
                        console.log(`✅ Path de playlist por defecto reconstruido: ${defaultPlaylist.playlistPath}`);
                    } else {
                        // Reconstruir utilizando la misma lógica que para activePlaylist
                        const config = getConfig();
                        const playlistsDir = config.paths.playlists;
                        const playlistDir = config.paths.videos || 'public/videos';

                        const possiblePath = path.join(playlistsDir, stateToSave.defaultPlaylist.playlistName,
                            `${stateToSave.defaultPlaylist.playlistName}.m3u`);

                        if (fs.existsSync(possiblePath)) {
                            stateToSave.defaultPlaylist.playlistPath = possiblePath;
                            console.log(`✅ Path de playlist por defecto reconstruido: ${possiblePath}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error al reconstruir path de playlist por defecto: ${error.message}`);
                }
            }
        }

        // Verificar que el directorio existe
        const dir = path.dirname(STATE_FILE_PATH);
        if (!fs.existsSync(dir)) {
            await fsPromises.mkdir(dir, { recursive: true });
        }

        // 1. Guardar en Redis (primario)
        const redisSaved = await saveStateToRedis(stateToSave);
        if (redisSaved) {
            console.log('✅ Estado del sistema guardado en Redis');
        }

        // 2. Guardar en archivo como respaldo
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(stateToSave, null, 2));
        console.log(`✅ Estado del sistema guardado en: ${STATE_FILE_PATH} (respaldo)`);

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
        // 1. Intentar cargar desde Redis (primario)
        const redisState = await loadStateFromRedis();
        if (redisState) {
            console.log('✅ Estado del sistema cargado desde Redis');
            return redisState;
        }

        // 2. Si no hay estado en Redis, cargar desde archivo (respaldo)
        if (fs.existsSync(STATE_FILE_PATH)) {
            console.log('ℹ️ No hay estado en Redis, cargando desde archivo...');
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

            // Verificar si defaultPlaylist existe pero no tiene playlistPath
            if (state.defaultPlaylist && state.defaultPlaylist.playlistName && !state.defaultPlaylist.playlistPath) {
                // Intentar obtener la información actualizada de la playlist por defecto
                try {
                    const defaultPlaylist = await getDefaultPlaylist();
                    if (defaultPlaylist && defaultPlaylist.playlistPath) {
                        console.log(`ℹ️ Actualizando defaultPlaylist.playlistPath en estado cargado de: null a: ${defaultPlaylist.playlistPath}`);
                        state.defaultPlaylist.playlistPath = defaultPlaylist.playlistPath;
                    }
                } catch (error) {
                    console.log(`⚠️ No se pudo recuperar la playlist por defecto para actualizar playlistPath: ${error.message}`);
                }
            }

            // Guardar en Redis para la próxima vez
            await saveStateToRedis(state);

            return state;
        }

        console.log(`Archivo de estado no encontrado en: ${STATE_FILE_PATH}`);
        return null;
    } catch (error) {
        console.error(`Error al cargar estado del sistema: ${error.message}`);
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
        console.error(`Error al reconstruir la ruta de la playlist: ${error.message}`);
    }
}

// Función para iniciar el monitoreo periódico del estado del sistema
function startSystemStateMonitor(intervalMs = 60000) { // Por defecto cada minuto
    if (monitorInterval) {
        clearInterval(monitorInterval);
    }

    // Guardar estado inmediatamente al iniciar
    saveSystemState().catch(err => {
        console.error(`Error en la primera ejecución del monitor: ${err.message}`);
    });

    // Contador para limpieza periódica de la caché
    let cleanupCounter = 0;

    // Configurar intervalo para actualizaciones periódicas
    monitorInterval = setInterval(() => {
        // Guardar estado
        saveSystemState().catch(err => {
            console.error(`Error en la actualización periódica del estado: ${err.message}`);
        });

        // Incrementar contador
        cleanupCounter++;

        // Cada 24 horas (o 1440 minutos si el intervalo es 1 minuto), forzamos una recarga completa
        // para evitar inconsistencias entre Redis y el archivo
        if (cleanupCounter >= 1440 * 60000 / intervalMs) {
            console.log('🔄 Ejecutando recarga completa de estado (mantenimiento programado)');
            cleanupCounter = 0;

            // Obtener estado desde archivo y actualizar Redis
            try {
                fsPromises.readFile(STATE_FILE_PATH, 'utf8')
                    .then(data => {
                        const state = JSON.parse(data);
                        saveStateToRedis(state).catch(err => {
                            console.error(`Error al actualizar Redis durante mantenimiento: ${err.message}`);
                        });
                    })
                    .catch(err => {
                        console.error(`Error al leer archivo durante mantenimiento: ${err.message}`);
                    });
            } catch (error) {
                console.error(`Error en mantenimiento programado: ${error.message}`);
            }
        }
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
