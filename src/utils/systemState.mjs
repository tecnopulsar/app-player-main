import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import playlistManager from './playlistManager.mjs';
import { getConfig } from '../config/appConfig.mjs';

// Ruta al archivo de estado del sistema
let STATE_FILE_PATH = path.join(process.cwd(), 'config', 'systemState.json');

// Verificar que el directorio config existe, si no, usar src/config
if (!fs.existsSync(path.dirname(STATE_FILE_PATH))) {
    // Intentar usar src/config en su lugar
    const altPath = path.join(process.cwd(), 'src', 'config', 'systemState.json');
    if (fs.existsSync(path.dirname(altPath))) {
        console.log(`Directorio 'config' no encontrado, usando 'src/config' en su lugar`);
        STATE_FILE_PATH = altPath;
    } else {
        // Si ni siquiera existe src/config, crearlos
        try {
            fs.mkdirSync(path.join(process.cwd(), 'config'), { recursive: true });
            console.log(`Directorio 'config' creado correctamente para almacenar estado del sistema`);
        } catch (err) {
            console.error(`Error al crear directorio 'config': ${err.message}`);
        }
    }
}

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
async function getVLCStatus(maxRetries = 5, retryDelay = 3000) {
    let retries = 0;

    // Función interna para intentar obtener el estado
    const tryGetStatus = async () => {
        try {
            // Intentar obtener el estado de VLC
            const status = await vlcRequest('');

            return {
                connected: true,
                playing: status.state === 'playing',
                paused: status.state === 'paused',
                stopped: status.state === 'stopped',
                currentItem: status.information?.category?.meta?.filename || '',
                position: status.position,
                time: status.time,
                length: status.length,
                volume: status.volume,
                random: status.random,
                repeat: status.repeat,
                fullscreen: status.fullscreen
            };
        } catch (error) {
            // Si hemos agotado los reintentos, devolver un estado desconectado
            if (retries >= maxRetries) {
                console.log(`VLC no está disponible después de ${maxRetries} intentos: ${error.message}`);
                return {
                    connected: false,
                    playing: false,
                    paused: false,
                    stopped: true,
                    message: `VLC no está disponible: ${error.message}`,
                    currentItem: null,
                    position: 0,
                    time: 0,
                    length: 0
                };
            }

            // Incrementar contador de reintentos y esperar antes de reintentar
            retries++;

            // Aumentar progresivamente el tiempo de espera con cada intento
            const adjustedDelay = retryDelay * (1 + (retries * 0.5));
            console.log(`Intento ${retries}/${maxRetries} fallido, reintentando en ${adjustedDelay}ms...`);

            // Esperar el tiempo de retraso
            await new Promise(resolve => setTimeout(resolve, adjustedDelay));

            // Reintentar recursivamente
            return tryGetStatus();
        }
    };

    // Iniciar el proceso de obtención del estado con reintentos
    return tryGetStatus();
}

// Función para obtener información de almacenamiento
async function getStorageInfo() {
    const config = getConfig();
    const videosDirectory = config.videos.directory;

    // Información del directorio de videos
    let videosStats = {
        exists: false,
        isDirectory: false,
        size: 0,
        fileCount: 0
    };

    try {
        const stats = await fsPromises.stat(videosDirectory);
        videosStats.exists = true;
        videosStats.isDirectory = stats.isDirectory();

        if (videosStats.isDirectory) {
            const files = await fsPromises.readdir(videosDirectory);
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
                const filePath = path.join(videosDirectory, file);
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
        videosDirectory,
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
async function getSystemState() {
    try {
        // Intentar cargar primero el estado guardado
        const savedState = await loadSystemState();

        // Si existe un estado guardado, lo usamos como base
        let baseState = null;
        if (savedState) {
            baseState = savedState;

            // Verificar si la playlist activa existe y es accesible
            if (baseState.activePlaylist && baseState.activePlaylist.playlistPath) {
                try {
                    await fsPromises.access(baseState.activePlaylist.playlistPath);
                    console.log(`✅ Verificación de playlist activa: ${baseState.activePlaylist.playlistPath} existe`);
                } catch (error) {
                    console.warn(`⚠️ La playlist activa no existe en la ruta: ${baseState.activePlaylist.playlistPath}`);
                    console.log('ℹ️ Buscando playlist por nombre en la carpeta estándar de playlists...');

                    const playlistName = baseState.activePlaylist.playlistName;
                    if (playlistName) {
                        const config = getConfig();
                        const standardPath = path.join(config.paths.playlists, playlistName, `${playlistName}.m3u`);

                        try {
                            await fsPromises.access(standardPath);
                            console.log(`✅ Playlist encontrada en ubicación estándar: ${standardPath}`);
                            baseState.activePlaylist.playlistPath = standardPath;
                        } catch (altError) {
                            console.warn(`⚠️ No se encontró la playlist en ubicación estándar: ${standardPath}`);
                        }
                    }
                }
            }
        }

        // Obtener toda la información actualizada del sistema
        const [systemInfo, storageInfo, vlcStatus] = await Promise.all([
            getSystemInfo(),
            getStorageInfo(),
            getVLCStatus()
        ]);

        // Crear el estado actualizado
        const newState = {
            timestamp: new Date().toISOString(),
            system: systemInfo,
            storage: storageInfo,
            vlc: vlcStatus,
            app: getAppInfo(),
            activePlaylist: baseState?.activePlaylist || {
                playlistName: null,
                playlistPath: null,
                fileCount: 0,
                currentIndex: 0
            }
        };

        return newState;
    } catch (error) {
        console.error(`Error al obtener estado del sistema: ${error.message}`);
        throw error;
    }
}

// Función para guardar el estado del sistema
async function saveSystemState(providedState = null) {
    try {
        // Si no se proporciona un estado, obtenerlo
        const state = providedState || await getSystemState();

        // Crear el directorio si no existe
        const dir = path.dirname(STATE_FILE_PATH);
        if (!fs.existsSync(dir)) {
            await fsPromises.mkdir(dir, { recursive: true });
        }

        // Asegurar que existe la sección activePlaylist
        if (!state.activePlaylist) {
            state.activePlaylist = {
                playlistName: null,
                playlistPath: null,
                fileCount: 0,
                currentIndex: 0
            };
        }

        // Actualizar timestamp solo si no se proporcionó un estado
        if (!providedState) {
            state.timestamp = new Date().toISOString();
        }

        // Guardar el estado en formato JSON
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(state, null, 2));
        console.log(`Estado del sistema guardado en: ${STATE_FILE_PATH}`);

        return state;
    } catch (error) {
        console.error(`Error al guardar estado del sistema: ${error.message}`);
        throw error;
    }
}

// Función para cargar el estado guardado del sistema
async function loadSystemState() {
    try {
        if (fs.existsSync(STATE_FILE_PATH)) {
            const data = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
            const state = JSON.parse(data);

            // Asegurar que existe la sección activePlaylist
            if (!state.activePlaylist) {
                state.activePlaylist = {
                    playlistName: null,
                    playlistPath: null,
                    fileCount: 0,
                    currentIndex: 0
                };
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

export {
    getSystemInfo,
    getNetworkSummary,
    getVLCStatus,
    vlcRequest,
    getStorageInfo,
    getDiskInfo,
    getAppInfo,
    getSystemState,
    saveSystemState,
    loadSystemState,
    startSystemStateMonitor
}; 