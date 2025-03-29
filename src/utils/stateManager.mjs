import { getConfig } from '../config/appConfig.mjs';
import { initRedisClient, saveStateToRedis, loadStateFromRedis } from './redisClient.mjs';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';

const STATE_FILE_PATH = path.join(process.cwd(), 'src/config/systemState.json');

// Estructura base del estado
const createInitialState = () => {
    const config = getConfig();
    const now = new Date().toISOString();

    return {
        timestamp: now,
        system: {
            hostname: os.hostname(),
            platform: process.platform,
            arch: process.arch,
            release: os.release(),
            cpus: os.cpus().length,
            totalMem: os.totalmem(),
            freeMem: os.freemem(),
            uptime: os.uptime(),
            loadavg: os.loadavg(),
            network: Object.entries(os.networkInterfaces()).reduce((acc, [name, interfaces]) => {
                acc[name] = interfaces.find(iface => iface.family === 'IPv4') || {};
                return acc;
            }, {}),
            timestamp: now
        },
        storage: {
            playlistDirectory: config.paths.playlists,
            videosStats: {
                exists: false,
                isDirectory: false,
                size: 0,
                fileCount: 0
            },
            totalSpace: 0,
            freeSpace: 0,
            usedSpace: 0,
            timestamp: now
        },
        vlc: {
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
        },
        app: {
            deviceId: config.device.id,
            deviceName: config.device.name,
            deviceType: config.device.type,
            deviceGroup: config.device.group,
            server: {
                port: config.appServer.port,
                host: config.appServer.host
            },
            vlcConfig: {
                host: config.vlc.host,
                port: config.vlc.port
            },
            version: config.app.version,
            startTime: now,
            nodeVersion: process.version
        },
        activePlaylist: {
            playlistName: null,
            playlistPath: null,
            lastLoaded: null,
            isActive: false,
            currentIndex: 0,
            fileCount: 0,
            isDefault: false,
            defaultPlaylistData: {
                description: "Playlist por defecto",
                createdDate: now,
                creator: "Sistema"
            }
        },
        defaultPlaylist: {
            playlistName: config.app.defaultPlaylist,
            playlistPath: null
        },
        snapshot: {
            url: null,
            createdAt: null
        }
    };
};

// Clase para manejar el estado
class StateManager {
    constructor() {
        this.state = null;
        this.redis = initRedisClient();
    }

    async initialize() {
        try {
            // Intentar cargar desde Redis primero
            this.state = await loadStateFromRedis();

            // Si no hay estado en Redis, intentar cargar desde archivo
            if (!this.state && fs.existsSync(STATE_FILE_PATH)) {
                const data = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
                this.state = JSON.parse(data);
                // Guardar en Redis para la próxima vez
                await saveStateToRedis(this.state);
            }

            // Si aún no hay estado, crear uno nuevo
            if (!this.state) {
                this.state = createInitialState();
                await this.save();
            }

            return true;
        } catch (error) {
            console.error('Error al inicializar el estado:', error);
            return false;
        }
    }

    async save() {
        try {
            // Actualizar timestamp
            this.state.timestamp = new Date().toISOString();

            // Guardar en Redis (primario)
            const redisSaved = await saveStateToRedis(this.state);

            // Guardar en archivo (respaldo)
            const dir = path.dirname(STATE_FILE_PATH);
            if (!fs.existsSync(dir)) {
                await fsPromises.mkdir(dir, { recursive: true });
            }
            await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(this.state, null, 2));

            return redisSaved;
        } catch (error) {
            console.error('Error al guardar el estado:', error);
            return false;
        }
    }

    getState() {
        return this.state;
    }

    updateState(updates) {
        if (!this.state) return false;

        this.state = {
            ...this.state,
            ...updates
        };

        return true;
    }

    // Métodos específicos para actualizar secciones del estado
    updateSystemInfo(systemInfo) {
        return this.updateState({
            system: {
                ...this.state.system,
                ...systemInfo,
                timestamp: new Date().toISOString()
            }
        });
    }

    updateStorageInfo(storageInfo) {
        return this.updateState({
            storage: {
                ...this.state.storage,
                ...storageInfo,
                timestamp: new Date().toISOString()
            }
        });
    }

    updateVLCStatus(vlcStatus) {
        return this.updateState({
            vlc: {
                ...this.state.vlc,
                ...vlcStatus
            }
        });
    }

    updateActivePlaylist(playlistInfo) {
        return this.updateState({
            activePlaylist: {
                ...this.state.activePlaylist,
                ...playlistInfo,
                lastLoaded: new Date().toISOString()
            }
        });
    }

    updateDefaultPlaylist(playlistInfo) {
        return this.updateState({
            defaultPlaylist: {
                ...this.state.defaultPlaylist,
                ...playlistInfo
            }
        });
    }

    updateSnapshot(snapshotInfo) {
        return this.updateState({
            snapshot: {
                ...this.state.snapshot,
                ...snapshotInfo,
                createdAt: new Date().toISOString()
            }
        });
    }
}

// Crear una única instancia del StateManager
const stateManager = new StateManager();

export default stateManager; 