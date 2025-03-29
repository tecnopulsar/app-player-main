/**
 * @file socketClient.mjs
 * @description Cliente Socket.IO para conectar el player con la app de administración
 * @module clients/socketClient
 * 
 * @requires socket.io-client - Biblioteca para comunicación en tiempo real como cliente
 * @requires ../config/appConfig.mjs - Configuración de la aplicación
 */

import { io } from 'socket.io-client';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';

// Variables para el cliente Socket.IO
export const portSocket = appConfig.socket.port;
let socket = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;
let commandHandlers = {};

/**
 * Registra los manejadores de comandos predeterminados para VLC
 */
function registerDefaultCommandHandlers() {
    // Comando para reproducir
    registerCommandHandler('vlc:play', async () => {
        try {
            const response = await axios.get(`http://localhost:${appConfig.appServer.port}/api/vlc/play`);
            return response.data;
        } catch (error) {
            console.error('Error al ejecutar comando vlc:play:', error);
            throw new Error(`Error al reproducir: ${error.message}`);
        }
    });

    // Comando para pausar
    registerCommandHandler('vlc:pause', async () => {
        try {
            const response = await axios.get(`http://localhost:${appConfig.appServer.port}/api/vlc/pause`);
            return response.data;
        } catch (error) {
            console.error('Error al ejecutar comando vlc:pause:', error);
            throw new Error(`Error al pausar: ${error.message}`);
        }
    });

    // Comando para detener
    registerCommandHandler('vlc:stop', async () => {
        try {
            const response = await axios.get(`http://localhost:${appConfig.appServer.port}/api/vlc/stop`);
            return response.data;
        } catch (error) {
            console.error('Error al ejecutar comando vlc:stop:', error);
            throw new Error(`Error al detener: ${error.message}`);
        }
    });

    // Comando para cambiar a pantalla completa
    registerCommandHandler('vlc:fullscreen', async () => {
        try {
            const response = await axios.get(`http://localhost:${appConfig.appServer.port}/api/vlc/fullscreen`);
            return response.data;
        } catch (error) {
            console.error('Error al ejecutar comando vlc:fullscreen:', error);
            throw new Error(`Error al activar pantalla completa: ${error.message}`);
        }
    });

    // Comando para obtener captura de pantalla
    registerCommandHandler('vlc:snapshot', async () => {
        try {
            const response = await axios.get(`http://localhost:${appConfig.appServer.port}/api/vlc/snapshot`);
            return response.data;
        } catch (error) {
            console.error('Error al ejecutar comando vlc:snapshot:', error);
            throw new Error(`Error al obtener captura: ${error.message}`);
        }
    });

    console.log('Manejadores de comandos VLC registrados correctamente');
}

/**
 * Inicializa el cliente Socket.IO para conectarse al servidor de administración
 * @param {Object} options - Opciones adicionales para el cliente
 * @returns {Object} - Instancia del cliente Socket.IO
 */
export function initSocketClient(options = {}) {
    if (socket) {
        console.log('El cliente Socket.IO ya está inicializado');
        return socket;
    }

    try {
        const socketUrl = options.socketUrl || appConfig.socket.socketUrl || 'http://localhost:3001';
        console.log(`Inicializando cliente Socket.IO para conectar a ${socketUrl}...`);

        // Crear cliente Socket.IO con configuración
        socket = io(socketUrl, {
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 30000,
            auth: {
                token: appConfig.device.authToken || 'player_token'
            },
            query: {
                deviceId: appConfig.device.id,
                deviceName: appConfig.device.name,
                deviceType: appConfig.device.type,
                deviceGroup: appConfig.device.group,
                appVersion: appConfig.app.version,
                deviceNetwork: appConfig.network
            }
        });

        // Manejar eventos de conexión
        socket.on('connect', () => {
            isConnected = true;
            reconnectAttempts = 0;
            console.log(`🔌 Conectado al servidor de administración. ID: ${socket.id}`);

            // Registrar manejadores de comandos predeterminados
            registerDefaultCommandHandlers();

            // Enviar información del dispositivo al conectar
            socket.emit('player:register', {
                deviceId: appConfig.device.id,
                deviceName: appConfig.device.name,
                deviceType: appConfig.device.type,
                deviceGroup: appConfig.device.group,
                appVersion: appConfig.app.version,
                deviceNetwork: appConfig.network
            });
        });

        // Manejar errores de conexión
        socket.on('connect_error', (error) => {
            console.error(`Error de conexión al servidor: ${error.message}`);
            reconnectAttempts++;

            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.error(`Máximo número de intentos alcanzado (${MAX_RECONNECT_ATTEMPTS}). Deteniendo reconexión.`);
                socket.disconnect();
            }
        });

        // Manejar comandos entrantes desde el servidor
        socket.on('player:command', async (data) => {
            console.log(`📥 Comando recibido desde servidor:`, data);
            try {
                const { command, params = {}, commandId } = data;

                if (commandHandlers[command]) {
                    const result = await commandHandlers[command](params);
                    socket.emit('player:command:response', {
                        commandId,
                        status: 'success',
                        result
                    });
                } else {
                    console.warn(`No hay manejador para el comando: ${command}`);
                    socket.emit('player:command:response', {
                        commandId,
                        status: 'error',
                        message: `Comando no soportado: ${command}`
                    });
                }
            } catch (error) {
                console.error('Error al procesar comando:', error);
                socket.emit('player:command:response', {
                    commandId: data.commandId,
                    status: 'error',
                    message: error.message
                });
            }
        });

        // Solicitud de estado desde el servidor
        socket.on('player:request:state', () => {
            console.log(`📊 Solicitud de estado desde el servidor`);
            sendPlayerState();
        });

        // Solicitud de captura de pantalla
        socket.on('player:request:snapshot', () => {
            console.log(`📸 Solicitud de captura de pantalla desde el servidor`);
            // Aquí se implementará la captura a través de algún endpoint a VLC
            // y luego se enviará la imagen al servidor
        });

        // Manejar desconexión
        socket.on('disconnect', (reason) => {
            isConnected = false;
            console.log(`🔌 Desconectado del servidor (Razón: ${reason})`);

            if (reason === 'io socket disconnect') {
                // La desconexión fue iniciada por el servidor, intentar reconectar
                console.log('Reconectando por desconexión del servidor...');
                socket.connect();
            }
        });

        return socket;
    } catch (error) {
        console.error('Error al inicializar el cliente Socket.IO:', error);
        throw error;
    }
}

/**
 * Registra un manejador para un comando específico
 * @param {string} command - Nombre del comando
 * @param {Function} handler - Función que maneja el comando
 */
export function registerCommandHandler(command, handler) {
    if (typeof handler !== 'function') {
        throw new Error('El manejador debe ser una función');
    }

    commandHandlers[command] = handler;
    console.log(`Manejador registrado para comando: ${command}`);
}

/**
 * Envía el estado actual del player al servidor
 * @param {Object} customState - Estado personalizado a enviar (opcional)
 */
export function sendPlayerState(customState = null) {
    if (!socket || !isConnected) {
        console.warn('Intento de enviar estado sin conexión al servidor');
        return;
    }

    const state = customState || {
        playing: false, // o true si está reproduciendo
        currentMedia: {}, // información sobre el medio actual
        volume: 100,
        timestamp: new Date().toISOString(),
        deviceId: appConfig.device.id
    };

    socket.emit('player:state', state);
}

/**
 * Envía un evento al servidor
 * @param {string} event - Nombre del evento a emitir
 * @param {Object} data - Datos a enviar con el evento
 */
export function sendEvent(event, data) {
    if (!socket || !isConnected) {
        console.warn('Intento de enviar evento sin conexión al servidor');
        return;
    }

    socket.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
        deviceId: appConfig.device.id
    });
}

/**
 * Verifica si el cliente está conectado al servidor
 * @returns {boolean} - Estado de la conexión
 */
export function isClientConnected() {
    return isConnected;
}

/**
 * Desconecta el cliente Socket.IO
 */
export function disconnectSocketClient() {
    if (socket) {
        console.log('Desconectando cliente Socket.IO...');
        socket.disconnect();
        socket = null;
        isConnected = false;
        commandHandlers = {};
    }
}
