import axios from 'axios';
import { appConfig } from '../config/appConfig.mjs';

// Instancia de axios para VLC
let axiosInstance = null;

// Cliente controlador para notificaciones
let controllerClient = null;

// Establecer el cliente controlador
export function setControllerClient(client) {
    controllerClient = client;
}

// Crear o configurar la instancia de axios
function createAxiosInstance() {
    if (axiosInstance !== null) {
        return axiosInstance;
    }

    const { host, port, password } = appConfig.vlc;
    const auth = Buffer.from(`:${password}`).toString('base64');

    axiosInstance = axios.create({
        baseURL: `http://${host}:${port}/requests/status.json`,
        headers: {
            'Authorization': `Basic ${auth}`
        },
        timeout: 5000  // Tiempo de espera predeterminado: 5 segundos
    });

    return axiosInstance;
}

// Función auxiliar para hacer peticiones a VLC con manejo mejorado de errores
export async function vlcRequest(command = '', method = 'GET', params = {}, timeoutMs = 5000, retries = 2) {
    const instance = createAxiosInstance();
    let attempt = 0;

    // Actualizar timeout si es diferente del predeterminado
    if (timeoutMs !== 5000) {
        instance.defaults.timeout = timeoutMs;
    }

    // Preparar los parámetros según el comando
    const requestParams = command ? { command, ...params } : params;

    while (attempt <= retries) {
        try {
            const response = await instance({
                method,
                url: '', // La URL base ya incluye status.json
                params: requestParams
            });

            // Si tenemos acceso al controlador, notificar éxito
            if (controllerClient && controllerClient.sendStatus) {
                controllerClient.sendStatus({
                    code: 'VLC_CONNECTED',
                    message: 'Conexión exitosa con VLC',
                    timestamp: new Date().toISOString()
                });
            }

            return response.data;
        } catch (error) {
            attempt++;

            // Construir un mensaje de error detallado
            let errorMsg = '';

            if (error.response) {
                const statusCode = error.response.status;

                if (statusCode === 401) {
                    errorMsg = `Error de autenticación (401): La contraseña de VLC parece ser incorrecta`;
                } else if (statusCode === 404) {
                    errorMsg = `Recurso no encontrado (404): El endpoint solicitado no existe`;
                } else if (statusCode >= 500) {
                    errorMsg = `Error del servidor VLC (${statusCode}): Problema interno en VLC`;
                } else {
                    errorMsg = `Error HTTP ${statusCode}: ${error.response.statusText}`;
                }
            } else if (error.code === 'ECONNREFUSED') {
                errorMsg = `Conexión rechazada - VLC no está en ejecución o no escucha en el puerto ${appConfig.vlc.port}`;
            } else if (error.code === 'ETIMEDOUT' || error.code === 'ETIMEOUT') {
                errorMsg = `Tiempo de espera agotado - VLC podría estar iniciándose o estar sobrecargado`;
            } else {
                errorMsg = error.message || 'Error desconocido al conectar con VLC';
            }

            // Si es el último intento, lanzar el error
            if (attempt > retries) {
                // Si tenemos acceso al controlador, notificar error
                if (controllerClient && controllerClient.sendStatus) {
                    controllerClient.sendStatus({
                        code: 'VLC_CONNECTION_ERROR',
                        message: errorMsg,
                        timestamp: new Date().toISOString()
                    });
                }

                throw new Error(errorMsg);
            }

            // Si no es el último intento, esperar y reintentar
            console.log(`Intento ${attempt}/${retries + 1} fallido: ${errorMsg}. Reintentando...`);

            // Espera exponencial entre reintentos
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

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
    snapshot: 'snapshot', // Comando para tomar un snapshot
    clear: 'pl_empty' // Comando para limpiar la playlist
};

/**
 * Obtiene la URL del arte/miniatura actual en VLC
 * @returns {string} URL para obtener la miniatura
 */
export const getArtUrl = () => {
    return `http://${appConfig.vlc.host}:${appConfig.vlc.port}/art`;
};
