import axios from 'axios';

const VLC_HOST = 'localhost';
const VLC_PORT = 8080;
const VLC_USERNAME = '';
const VLC_PASSWORD = 'tecno';


// Configuración global de axios para VLC
const vlcAxios = axios.create({
    baseURL: `http://${VLC_HOST}:${VLC_PORT}/requests/status.json`,
    auth: {
        username: VLC_USERNAME,
        password: VLC_PASSWORD
    },
    timeout: 5000 // Tiempo máximo de espera para evitar bloqueos
});

// Función optimizada para hacer peticiones a VLC
export const vlcRequest = async (command, options = {}) => {
    try {
        const params = { command, ...options };
        const response = await vlcAxios.get('', { params});
        return response.data;
    } catch (error) {
        console.error('Error en la petición VLC:', error);
        throw new Error(`Error al comunicarse con VLC: ${error.message}`);
    }
};

// Comandos comunes para VLC
export const vlcCommands = {
    // Control básico de reproducción
    play: 'pl_play',
    pause: 'pl_pause',
    stop: 'pl_stop',
    next: 'pl_next',
    previous: 'pl_previous',

    // Control de playlist
    loadPlaylist: 'in_play',         // Comando para cargar nueva playlist
    emptyPlaylist: 'pl_empty',       // Vaciar playlist actual
    addToPlaylist: 'in_enqueue',     // Añadir elemento a playlist actual
    playItem: 'pl_play',             // Reproducir elemento específico (con parámetro id)

    fullscreen: 'fullscreen',
    toggleAudio: 'volume',
    getStatus: 'status',
    // Nuevos comandos
    seek: 'seek',
    aspectRatio: 'aspectratio',
    rate: 'rate', // Velocidad de reproducción
    random: 'pl_random',
    loop: 'pl_loop',
    repeat: 'pl_repeat',
    snapshot: 'snapshot' // Comando para tomar un snapshot
};

/**
 * Obtiene la URL del arte/miniatura actual en VLC
 * @returns {string} URL para obtener la miniatura
 */
export const getArtUrl = () => {
    return `http://${VLC_HOST}:${VLC_PORT}/art`;
};
