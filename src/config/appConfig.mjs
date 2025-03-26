import os from 'os';
import crypto from 'crypto';

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

// Configuración de la aplicación
const appConfig = {
    app: {
        name: 'App Player',
        version: '1.0.0',
        defaultPlaylist: 'default'
    },
    // Información del dispositivo
    device: {
        id: generateDeviceId(),
        name: os.hostname(),
        type: 'player',  // Tipo de dispositivo (player, controller, etc.)
        group: 'default' // Grupo al que pertenece el dispositivo
    },
    // Configuración del servidor
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0'  // Escuchar en todas las interfaces
    },
    // Configuración de VLC
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
    // Configuración de Redis
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        keyPrefix: 'player:',
        retryInterval: 1000, // ms
        maxRetries: 10
    },
    // Configuración de videos
    videos: {
        directory: './public/videos',
        extensions: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v']
    },
    // Configuración de rutas
    paths: {
        uploads: './public/uploads',
        public: './public',
        playlists: './public/videos',
        screenshots: './public/screenshots',
        snapshots: './public/snapshots',
        images: './public/images',
        temp: './public/temp'
    },
    // Configuración de seguridad
    security: {
        maxFileSize: 1000 * 1024 * 1024, // 1000 MB
        allowedFileTypes: ['video/mp4', 'video/x-matroska', 'video/avi', 'video/quicktime', 'video/webm'],
        allowedExtensions: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.m3u']
    }
};

// Función para obtener la configuración
export function getConfig() {
    return appConfig;
}

export { appConfig };
