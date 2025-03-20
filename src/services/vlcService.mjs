import axios from 'axios';

const VLC_HOST = 'localhost';
const VLC_PORT = 8080;
const VLC_USERNAME = '';
const VLC_PASSWORD = 'tecno';

// Configuración global de axios para VLC
const vlcAxios = axios.create({
    baseURL: `http://${VLC_HOST}:${VLC_PORT}/requests/status.xml`,
    auth: {
        username: VLC_USERNAME,
        password: VLC_PASSWORD
    },
    timeout: 5000 // Tiempo máximo de espera para evitar bloqueos
});

// Función optimizada para hacer peticiones a VLC
export const vlcRequest = async (command) => {
    try {
        const response = await vlcAxios.get('', { params: { command } });
        return response.data;
    } catch (error) {
        console.error('Error en la petición VLC:', error);
        throw new Error(`Error al comunicarse con VLC: ${error.message}`);
    }
};

// Comandos comunes para VLC
export const vlcCommands = {
    play: 'pl_play',
    pause: 'pl_pause',
    stop: 'pl_stop',
    next: 'pl_next',
    previous: 'pl_previous',
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
