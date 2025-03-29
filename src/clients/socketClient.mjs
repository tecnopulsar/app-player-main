/**
 * @file socketClient.mjs
 * @description Cliente Socket.IO para conectar el player con la app de administración
 * @module clients/socketClient
 * 
 * @requires socket.io-client - Biblioteca para comunicación en tiempo real como cliente
 * @requires ../config/appConfig.mjs - Configuración de la aplicación
 */

import { io } from 'socket.io-client';
import axios from 'axios';
import stateManager from '../utils/stateManager.mjs';
import { getConfig } from '../config/appConfig.mjs';

class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.commandHandlers = new Map();
        this.config = null;
    }

    async initialize() {
        try {
            this.config = await getConfig();
            this.registerDefaultCommandHandlers();
            this.connect();
            return true;
        } catch (error) {
            console.error('Error al inicializar SocketClient:', error);
            return false;
        }
    }

    connect() {
        if (this.socket) {
            console.log('El cliente Socket.IO ya está inicializado');
            return;
        }

        const socketUrl = this.config.socket.socketUrl;
        console.log(`Inicializando cliente Socket.IO para conectar a ${socketUrl}...`);

        this.socket = io(socketUrl, {
            reconnection: true,
            reconnectionAttempts: this.config.socket.retryAttempts,
            reconnectionDelay: this.config.socket.reconnectInterval,
            timeout: 30000,
            auth: {
                deviceId: this.config.device.id,
                authToken: this.config.device.authToken
            }
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log(`🔌 Conectado al servidor de administración. ID: ${this.socket.id}`);
            this.sendDeviceInfo();
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.log(`🔌 Desconectado del servidor (Razón: ${reason})`);
        });

        this.socket.on('player:command', this.handleCommand.bind(this));
        this.socket.on('player:request:state', () => this.sendPlayerState());
        this.socket.on('player:request:snapshot', () => this.handleSnapshotRequest());
    }

    registerDefaultCommandHandlers() {
        const commands = {
            'vlc:play': () => this.executeVLCCommand('play'),
            'vlc:pause': () => this.executeVLCCommand('pause'),
            'vlc:stop': () => this.executeVLCCommand('stop'),
            'vlc:fullscreen': () => this.executeVLCCommand('fullscreen'),
            'vlc:snapshot': () => this.executeVLCCommand('snapshot')
        };

        Object.entries(commands).forEach(([command, handler]) => {
            this.registerCommandHandler(command, handler);
        });
    }

    async executeVLCCommand(command) {
        try {
            const response = await axios.get(`http://localhost:${this.config.appServer.port}/api/vlc/${command}`);
            return response.data;
        } catch (error) {
            console.error(`Error al ejecutar comando vlc:${command}:`, error);
            throw new Error(`Error al ejecutar ${command}: ${error.message}`);
        }
    }

    registerCommandHandler(command, handler) {
        if (typeof handler !== 'function') {
            throw new Error('El manejador debe ser una función');
        }
        this.commandHandlers.set(command, handler);
        console.log(`Manejador registrado para comando: ${command}`);
    }

    async handleCommand(data) {
        const { command, params = {}, commandId } = data;
        console.log(`📥 Comando recibido desde servidor:`, data);

        try {
            const handler = this.commandHandlers.get(command);
            if (handler) {
                const result = await handler(params);
                this.socket.emit('player:command:response', {
                    commandId,
                    status: 'success',
                    result
                });
            } else {
                throw new Error(`Comando no soportado: ${command}`);
            }
        } catch (error) {
            console.error('Error al procesar comando:', error);
            this.socket.emit('player:command:response', {
                commandId,
                status: 'error',
                message: error.message
            });
        }
    }

    sendDeviceInfo() {
        const state = stateManager.getState();
        if (!state) return;

        this.socket.emit('player:register', {
            deviceId: state.app.deviceId,
            deviceName: state.app.deviceName,
            deviceType: state.app.deviceType,
            deviceGroup: state.app.deviceGroup,
            appVersion: state.app.version,
            deviceNetwork: state.system.network
        });
    }

    sendPlayerState() {
        if (!this.isConnected) {
            console.warn('Intento de enviar estado sin conexión al servidor');
            return;
        }

        const state = stateManager.getState();
        if (!state) return;

        this.socket.emit('player:state', {
            ...state,
            timestamp: new Date().toISOString()
        });
    }

    async handleSnapshotRequest() {
        try {
            const response = await this.executeVLCCommand('snapshot');
            if (response.success) {
                await stateManager.updateSnapshot({
                    url: response.snapshotUrl,
                    createdAt: new Date().toISOString()
                });
                await stateManager.save();
            }
        } catch (error) {
            console.error('Error al procesar solicitud de snapshot:', error);
        }
    }

    sendEvent(event, data) {
        if (!this.isConnected) {
            console.warn('Intento de enviar evento sin conexión al servidor');
            return;
        }

        this.socket.emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            deviceId: this.config.device.id
        });
    }

    disconnect() {
        if (this.socket) {
            console.log('Desconectando cliente Socket.IO...');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.commandHandlers.clear();
        }
    }

    isConnected() {
        return this.isConnected;
    }
}

// Crear una única instancia del SocketClient
const socketClient = new SocketClient();

export default socketClient;
