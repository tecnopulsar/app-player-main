import os from 'os';
import crypto from 'crypto';
import stateManager from '../utils/stateManager.mjs';

// Generar un ID de dispositivo único basado en el hostname y MAC
function generateDeviceId() {
    const hostname = os.hostname();
    let mac = '';

    // Intentar obtener la dirección MAC de la primera interfaz no interna
    const interfaces = os.networkInterfaces();
    for (const [name, ifaces] of Object.entries(interfaces)) {
        // Ignorar interfaces loopback y buscar la primera interfaz con IPv4
        if (name !== 'lo') {
            const ipv4Interface = ifaces.find(iface => iface.family === 'IPv4');
            if (ipv4Interface) {
                mac = ipv4Interface.mac;
                break;
            }
        }
    }

    // Generar hash MD5 combinando hostname y MAC
    const hash = crypto.createHash('md5').update(`${hostname}:${mac}`).digest('hex');

    // Usar los primeros 8 caracteres como ID (suficiente para evitar colisiones)
    return hash.substring(0, 8);
}

// Configuración base de la aplicación
const baseConfig = {
    app: {
        name: 'App Player',
        version: '1.0.0',
        defaultPlaylist: 'default'
    },
    device: {
        id: generateDeviceId(),
        name: os.hostname(),
        type: 'player',
        group: 'default',
        authToken: process.env.AUTH_TOKEN || 'default_player_token'
    },
    appServer: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0'
    },
    socket: {
        socketUrl: process.env.SOCKET_URL || 'http://192.168.1.200:3001',
        port: process.env.SOCKET_PORT || 3001,
        reconnectInterval: 5000,
        retryAttempts: 10
    },
    vlc: {
        host: 'localhost',
        port: 8080,
        password: 'tecno',
        options: [
            '--no-video-title-show',
            '--fullscreen',
            '--repeat',
            '--no-sub-autodetect-file'
        ]
    },
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        keyPrefix: 'player:',
        retryInterval: 1000,
        maxRetries: 10
    },
    videos: {
        directory: './public/videos',
        extensions: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v']
    },
    paths: {
        uploads: './public/uploads',
        public: './public',
        playlists: './public/videos',
        screenshots: './public/screenshots',
        snapshots: './public/snapshots',
        images: './public/images',
        temp: './public/temp'
    },
    security: {
        maxFileSize: 1000 * 1024 * 1024,
        allowedFileTypes: ['video/mp4', 'video/x-matroska', 'video/avi', 'video/quicktime', 'video/webm'],
        allowedExtensions: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.m3u']
    }
};

// Función para obtener la configuración
export async function getConfig() {
    // Inicializar el estado si no está inicializado
    if (!stateManager.state) {
        await stateManager.initialize();
    }

    // Obtener el estado actual
    const state = stateManager.getState();

    // Combinar la configuración base con el estado actual
    return {
        ...baseConfig,
        device: {
            ...baseConfig.device,
            id: state.app.deviceId,
            name: state.app.deviceName,
            type: state.app.deviceType,
            group: state.app.deviceGroup
        },
        appServer: {
            ...baseConfig.appServer,
            port: state.app.server.port,
            host: state.app.server.host
        },
        vlc: {
            ...baseConfig.vlc,
            host: state.app.vlcConfig.host,
            port: state.app.vlcConfig.port
        }
    };
}

export { baseConfig };
