/**
 * @file socketServer.mjs
 * @description Servidor Socket.IO para monitoreo en tiempo real de la aplicación
 * @module servers/socketServer
 * 
 * @requires socket.io - Biblioteca para comunicación en tiempo real
 * @requires ../config/appConfig.mjs - Configuración de la aplicación
 */

import { Server } from 'socket.io';
import { appConfig } from '../config/appConfig.mjs';

// Variables para el servidor Socket.IO
let io = null;
let connectedClients = 0;

/**
 * Inicializa el servidor Socket.IO
 * @param {Object} httpServer - Servidor HTTP donde se montará Socket.IO
 * @returns {Object} - Instancia del servidor Socket.IO
 */
export function initSocketServer(httpServer) {
    if (io) {
        console.log('El servidor Socket.IO ya está inicializado');
        return io;
    }

    try {
        console.log('Inicializando servidor Socket.IO para monitoreo...');

        // Crear servidor Socket.IO con configuración CORS
        io = new Server(httpServer, {
            cors: {
                origin: "*", // Permitir cualquier origen
                methods: ["GET", "POST"],
                credentials: true
            },
            // Configuración de Engine.IO
            pingTimeout: 60000, // 60 segundos sin respuesta antes de considerar desconectado
            pingInterval: 25000 // Intervalo de ping para mantener la conexión
        });

        // Middleware para autenticación y logging
        io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;

            // Aquí se podría implementar una validación de token real
            if (token === 'dev_token' || process.env.NODE_ENV === 'development') {
                console.log(`Socket ${socket.id} autenticado correctamente`);
                next();
            } else {
                console.log(`Intento de conexión no autorizada desde ${socket.handshake.address}`);
                next(new Error('Autenticación fallida'));
            }
        });

        // Manejar conexiones de clientes
        io.on('connection', (socket) => {
            connectedClients++;
            console.log(`🔌 Cliente conectado: ${socket.id} (Total: ${connectedClients})`);

            // Enviar identificación del dispositivo al cliente
            socket.emit('device:info', {
                id: appConfig.device.id,
                name: appConfig.device.name,
                type: appConfig.device.type,
                group: appConfig.device.group,
                version: appConfig.app.version
            });

            // Manejar comandos recibidos
            socket.on('command', async (data) => {
                console.log(`📥 Comando recibido desde ${socket.id}:`, data);
                try {
                    // Aquí se implementará la lógica para procesar comandos
                    // como control de reproducción, cambio de playlist, etc.
                    socket.emit('command:response', {
                        commandId: data.id || Math.random().toString(36).substring(2, 10),
                        status: 'received',
                        message: 'Comando recibido y en procesamiento'
                    });
                } catch (error) {
                    console.error('Error al procesar comando:', error);
                    socket.emit('command:error', {
                        commandId: data.id,
                        error: error.message
                    });
                }
            });

            // Manejar solicitudes de estado
            socket.on('request:state', () => {
                console.log(`📊 Solicitud de estado desde ${socket.id}`);
                // Este evento emitirá el estado actual del sistema
                // Se implementará en el servicio de monitoreo
            });

            // Manejar desconexión
            socket.on('disconnect', (reason) => {
                connectedClients--;
                console.log(`🔌 Cliente desconectado: ${socket.id} (Razón: ${reason}) (Total: ${connectedClients})`);
            });
        });

        // Log cuando el servidor esté listo
        io.engine.on('initial_headers', () => {
            console.log('✅ Servidor Socket.IO inicializado y listo para conexiones');
        });

        return io;
    } catch (error) {
        console.error('Error al inicializar el servidor Socket.IO:', error);
        throw error;
    }
}

/**
 * Obtiene la instancia actual del servidor Socket.IO
 * @returns {Object|null} - Instancia del servidor Socket.IO o null si no está inicializado
 */
export function getSocketServer() {
    return io;
}

/**
 * Emite un evento a todos los clientes conectados
 * @param {string} event - Nombre del evento a emitir
 * @param {Object} data - Datos a enviar con el evento
 */
export function emitToAll(event, data) {
    if (!io) {
        console.warn('Intento de emitir evento sin servidor Socket.IO inicializado');
        return;
    }

    io.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
        deviceId: appConfig.device.id
    });
}

/**
 * Detiene el servidor Socket.IO
 */
export function stopSocketServer() {
    if (io) {
        console.log('Deteniendo servidor Socket.IO...');
        io.close(() => {
            console.log('Servidor Socket.IO detenido correctamente');
            io = null;
            connectedClients = 0;
        });
    }
}

export default {
    initSocketServer,
    getSocketServer,
    emitToAll,
    stopSocketServer
}; 