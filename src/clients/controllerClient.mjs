import { io } from 'socket.io-client';
import { getVLCStatus, getPlaylistInfo } from '../utils/vlcStatus.js';
import { getLocalIP, getMACAddress } from '../utils/networkUtils.mjs';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';
import { promises as fsPromises } from 'fs';
import { v4 as uuidv4 } from 'uuid';

class ControllerClient {
    constructor(serverUrl = null, monitorUrl = null) {
        this.config = {
            serverUrl: serverUrl || appConfig.controller?.url || 'http://localhost:3001',
            monitorUrl: monitorUrl || appConfig.monitor?.url || 'http://localhost:3002',
            heartbeatInterval: appConfig.controller?.heartbeatInterval || 25000,
            verboseLogs: appConfig.controller?.verboseLogs || false,
            maxReconnectAttempts: appConfig.controller?.maxReconnectAttempts || 5,
            reconnectDelay: appConfig.controller?.reconnectDelay || 1000,
            connectionTimeout: appConfig.controller?.connectionTimeout || 20000
        };

        this.state = {
            deviceInfo: {
                id: uuidv4(),
                name: appConfig.device?.name || `Device-${this.generateShortId()}`,
                ip: getLocalIP(),
                mac: getMACAddress(),
                status: 'active',
                lastSeen: null
            },
            vlcData: {
                status: null,
                playlist: null
            },
            sockets: {
                controller: null,
                monitor: null
            },
            reconnectAttempts: 0,
            intervals: {
                heartbeat: null
            }
        };
    }

    // Genera un ID corto para nombres de dispositivo
    generateShortId() {
        return Math.random().toString(36).substring(2, 8);
    }

    async initialize() {
        try {
            console.log('\n=== Iniciando Conexión ===');

            await this.checkServersAvailability();
            this.setupEventHandlers();

            console.log('==========================\n');
        } catch (error) {
            this.handleInitializationError(error);
        }
    }

    async checkServersAvailability() {
        const [controllerAvailable, monitorAvailable] = await Promise.all([
            this.checkServerAvailability(this.config.serverUrl),
            this.checkServerAvailability(this.config.monitorUrl)
        ]);

        if (controllerAvailable) {
            this.connectToController();
        } else {
            console.warn(`⚠️ Servidor controlador no disponible en ${this.config.serverUrl}`);
        }

        if (monitorAvailable) {
            this.connectToMonitor();
        } else {
            console.warn(`⚠️ Servidor monitor no disponible en ${this.config.monitorUrl}`);
        }
    }

    async checkServerAvailability(url) {
        try {
            const response = await axios.get(`${url}/health`, {
                timeout: this.config.connectionTimeout / 2
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    connectToController() {
        this.state.sockets.controller = io(this.config.serverUrl, {
            reconnection: true,
            reconnectionAttempts: this.config.maxReconnectAttempts,
            reconnectionDelay: this.config.reconnectDelay,
            timeout: this.config.connectionTimeout
        });

        this.setupControllerEvents();
    }

    connectToMonitor() {
        this.state.sockets.monitor = io(this.config.monitorUrl, {
            reconnection: true,
            reconnectionAttempts: this.config.maxReconnectAttempts,
            reconnectionDelay: this.config.reconnectDelay,
            timeout: this.config.connectionTimeout
        });

        this.setupMonitorEvents();
    }

    setupEventHandlers() {
        this.setupControllerEvents();
        this.setupMonitorEvents();
    }

    setupControllerEvents() {
        const { controller } = this.state.sockets;
        if (!controller) return;

        controller
            .on('connect', () => this.handleControllerConnect())
            .on('AUTH_SUCCESS', (data) => this.handleAuthSuccess(data))
            .on('disconnect', () => this.handleControllerDisconnect())
            .on('error', (error) => this.handleControllerError(error))
            .on('PLAY', (data) => this.emitControlEvent('PLAY', data))
            .on('PAUSE', (data) => this.emitControlEvent('PAUSE', data))
            .on('STOP', (data) => this.emitControlEvent('STOP', data))
            .on('NEXT', (data) => this.emitControlEvent('NEXT', data))
            .on('PREVIOUS', (data) => this.emitControlEvent('PREVIOUS', data))
            .on('VOLUME_UP', (data) => this.emitControlEvent('VOLUME_UP', data))
            .on('VOLUME_DOWN', (data) => this.emitControlEvent('VOLUME_DOWN', data))
            .on('MUTE', (data) => this.emitControlEvent('MUTE', data))
            .on('UNMUTE', (data) => this.emitControlEvent('UNMUTE', data));

        // Manejar eventos de control remoto
        controller.on('remote-control', async (data) => {
            try {
                const { action, commandId, timestamp } = data;
                console.log(`Recibido comando de control: ${action}`, { commandId, timestamp });

                // Validar el comando
                if (!['PLAY', 'PAUSE', 'STOP', 'NEXT', 'PREVIOUS'].includes(action)) {
                    throw new Error(`Comando no válido: ${action}`);
                }

                // Procesar el comando
                let success = false;
                let error = null;

                switch (action) {
                    case 'PLAY':
                        success = await this.emitControlEvent('play');
                        break;
                    case 'PAUSE':
                        success = await this.emitControlEvent('pause');
                        break;
                    case 'STOP':
                        success = await this.emitControlEvent('stop');
                        break;
                    case 'NEXT':
                        success = await this.emitControlEvent('next');
                        break;
                    case 'PREVIOUS':
                        success = await this.emitControlEvent('previous');
                        break;
                }

                // Enviar confirmación
                controller.emit('command_received', {
                    success,
                    commandId,
                    error: error?.message,
                    timestamp: new Date().toISOString()
                });

                if (!success) {
                    console.error(`Error al ejecutar comando ${action}:`, error);
                }
            } catch (error) {
                console.error('Error al procesar comando de control:', error);
                controller.emit('command_received', {
                    success: false,
                    commandId: data.commandId,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    setupMonitorEvents() {
        const { monitor } = this.state.sockets;
        if (!monitor) return;

        monitor
            .on('connect', () => this.handleMonitorConnect())
            .on('disconnect', () => this.handleMonitorDisconnect())
            .on('error', (error) => this.handleMonitorError(error));
    }

    // Handlers de eventos
    handleControllerConnect() {
        this.logConnection('Controlador', this.state.sockets.controller.id);
        this.updateDeviceStatus('active');
        this.state.sockets.controller.emit('AUTHENTICATE', this.state.deviceInfo);
        this.startHeartbeat();
    }

    handleAuthSuccess({ id, name }) {
        this.state.deviceInfo.id = id;
        this.state.deviceInfo.name = name;
        this.log('Autenticación Exitosa', `ID: ${id} | Nombre: ${name}`);
    }

    handleControllerDisconnect() {
        this.logDisconnection('Controlador');
        this.stopHeartbeat();
    }

    handleControllerError(error) {
        this.logError('Controlador', error);
        this.reconnectController();
    }

    handleMonitorConnect() {
        this.logConnection('Monitor', this.state.sockets.monitor.id);
    }

    handleMonitorDisconnect() {
        this.logDisconnection('Monitor');
    }

    handleMonitorError(error) {
        this.logError('Monitor', error);
        this.reconnectMonitor();
    }

    async emitControlEvent(event, data = {}) {
        try {
            const { controller } = this.state.sockets;
            if (!controller?.connected) {
                throw new Error('No hay conexión con el controlador');
            }

            // Emitir el evento al controlador
            controller.emit(event, {
                ...data,
                deviceId: this.state.deviceInfo.id,
                timestamp: new Date().toISOString()
            });

            // Actualizar el estado local si es necesario
            if (['PLAY', 'PAUSE', 'STOP'].includes(event)) {
                this.state.vlcData.status = event.toLowerCase();
            }

            return true;
        } catch (error) {
            console.error(`Error al emitir evento de control ${event}:`, error);
            return false;
        }
    }

    // Heartbeat y estado
    async startHeartbeat() {
        if (this.state.intervals.heartbeat) return;

        this.log(`Iniciando heartbeat (intervalo: ${this.config.heartbeatInterval}ms)`);

        this.state.intervals.heartbeat = setInterval(async () => {
            await this.sendHeartbeat();
        }, this.config.heartbeatInterval);

        // Enviar primer heartbeat inmediatamente
        await this.sendHeartbeat();
    }

    async sendHeartbeat() {
        const { controller, monitor } = this.state.sockets;

        if (!controller?.connected) {
            this.logWarning('No se pudo enviar heartbeat: Socket no conectado');
            this.reconnectController();
            return;
        }

        try {
            await this.updateVlcStatus();
            const snapshot = await this.getSnapshot();
            const heartbeatData = this.prepareHeartbeatData(snapshot);

            // Enviar a controlador
            controller.emit('heartbeat', heartbeatData);

            // Enviar a monitor si está conectado
            if (monitor?.connected) {
                monitor.emit('heartbeat', heartbeatData);
                this.state.reconnectAttempts = 0;
            } else {
                this.reconnectMonitor();
            }

            this.logHeartbeat(heartbeatData);
        } catch (error) {
            this.logError('Error en heartbeat', error);
        }
    }

    async updateVlcStatus() {
        try {
            this.state.vlcData = {
                status: await getVLCStatus(),
                playlist: await getPlaylistInfo()
            };
        } catch (error) {
            this.state.vlcData.status = {
                status: 'error',
                connected: false,
                error: error.message
            };
            throw error;
        }
    }

    prepareHeartbeatData(snapshot) {
        this.updateDeviceStatus('active');

        return {
            ...this.state.deviceInfo,
            timestamp: new Date().toISOString(),
            vlc: this.state.vlcData,
            snapshot
        };
    }

    async getSnapshot() {
        try {
            const response = await axios.get('http://localhost:3000/api/vlc/snapshot');

            if (response.data.success) {
                const imageBuffer = await fsPromises.readFile(response.data.snapshotPath);
                return `data:image/png;base64,${imageBuffer.toString('base64')}`;
            }
            return null;
        } catch (error) {
            if (this.config.verboseLogs) {
                this.logError('Error al obtener snapshot', error);
            }
            return null;
        }
    }

    // Reconexión
    reconnectController() {
        this.handleReconnection('controller', () => this.connectToController());
    }

    reconnectMonitor() {
        this.handleReconnection('monitor', () => this.connectToMonitor());
    }

    handleReconnection(type, connectFn) {
        if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.logError(`Máximo de intentos de reconexión para ${type} alcanzado`);
            return;
        }

        this.state.reconnectAttempts++;
        this.log(`Intento de reconexión ${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

        if (this.state.sockets[type]) {
            this.state.sockets[type].disconnect();
        }

        connectFn();
    }

    // Manejo de estado
    updateDeviceStatus(status) {
        this.state.deviceInfo.status = status;
        this.state.deviceInfo.lastSeen = new Date().toISOString();
    }

    // Utilidades de logging
    log(title, message = '') {
        if (!this.config.verboseLogs) return;
        console.log(`\n=== ${title} ===`);
        if (message) console.log(message);
        console.log('========================');
    }

    logConnection(type, socketId) {
        this.log(`Conexión Establecida con ${type}`, `Socket ID: ${socketId}`);
    }

    logDisconnection(type) {
        this.log(`Desconexión de ${type}`);
    }

    logError(context, error) {
        console.error(`\n=== Error en ${context} ===`);
        console.error(error.message || error);
        console.error('=========================');
    }

    logWarning(message) {
        console.warn(`\n⚠️ Advertencia: ${message}`);
    }

    logHeartbeat(data) {
        if (!this.config.verboseLogs) {
            console.log(`Heartbeat [${data.id}] - VLC: ${data.vlc.status.connected ? 'OK' : 'OFF'}`);
            return;
        }

        this.log('Heartbeat Enviado', `
            ID: ${data.id}
            Nombre: ${data.name}
            IP: ${data.ip}
            Estado: ${data.status}
            VLC: ${data.vlc.status.status}
            Archivo: ${data.vlc.status.currentItem || 'Ninguno'}
            Playlist: ${data.vlc.playlist?.name || 'N/A'}
            Snapshot: ${data.snapshot ? 'Incluido' : 'No disponible'}
            Última conexión: ${data.lastSeen}
        `);
    }

    // Limpieza
    stopHeartbeat() {
        if (this.state.intervals.heartbeat) {
            clearInterval(this.state.intervals.heartbeat);
            this.state.intervals.heartbeat = null;
            this.log('Heartbeat detenido');
        }
    }

    disconnect() {
        this.stopHeartbeat();

        Object.values(this.state.sockets).forEach(socket => {
            if (socket) {
                socket.disconnect();
                this.log(`Desconectado de ${socket === this.state.sockets.controller ? 'Controlador' : 'Monitor'}`);
            }
        });
    }
}

export default ControllerClient;