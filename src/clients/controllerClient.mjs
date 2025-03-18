import { io } from 'socket.io-client';
import { getVLCStatus, getPlaylistInfo } from '../utils/vlcStatus.js';
import { getLocalIP, getMACAddress } from '../utils/networkUtils.js';

class ControllerClient {
    constructor(serverUrl, monitorUrl = 'http://localhost:3002') {
        this.serverUrl = serverUrl;
        this.monitorUrl = monitorUrl;
        this.socket = null;
        this.monitorSocket = null;
        this.deviceInfo = {
            id: null,
            name: null,
            ip: getLocalIP(),
            mac: getMACAddress(),
            status: 'active',
            vlcStatus: null,
            playlistInfo: null,
            lastSeen: new Date().toISOString()
        };
        this.heartbeatInterval = 25000; // 25 segundos
        this.intervalId = null;
        this.lastHeartbeatTime = Date.now();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        try {
            console.log('\n=== Iniciando Conexión con Controlador ===');
            console.log(`URL del servidor: ${this.serverUrl}`);

            // Conectar al servidor controlador
            this.socket = io(this.serverUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });

            // Conectar al servidor de monitoreo
            this.monitorSocket = io(this.monitorUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });

            this.setupEventListeners();
            this.setupMonitorListeners();
        } catch (error) {
            console.error('=== Error de Inicialización ===');
            console.error('Error al conectar con los servidores:', error);
            console.error('=============================');
        }
    }

    setupEventListeners() {
        // Evento de conexión
        this.socket.on('connect', () => {
            console.log('\n=== Conexión Establecida ===');
            console.log('Conectado al servidor controlador');
            console.log(`ID del socket: ${this.socket.id}`);
            this.deviceInfo.lastSeen = new Date().toISOString();
            this.socket.emit('AUTHENTICATE', this.deviceInfo);
            this.startHeartbeat();
            console.log('==========================\n');
        });

        // Evento de autenticación exitosa
        this.socket.on('AUTH_SUCCESS', ({ id, name }) => {
            console.log('\n=== Autenticación Exitosa ===');
            console.log(`ID asignado: ${id}`);
            console.log(`Nombre asignado: ${name}`);
            this.deviceInfo.id = id;
            this.deviceInfo.name = name;
            console.log('===========================\n');
        });

        // Evento de desconexión
        this.socket.on('disconnect', () => {
            console.log('\n=== Desconexión Detectada ===');
            console.log('Desconectado del servidor controlador');
            console.log(`Razón: ${this.socket.disconnected ? 'Desconexión manual' : 'Error de conexión'}`);
            this.stopHeartbeat();
            console.log('===========================\n');
        });

        // Evento de error
        this.socket.on('error', (error) => {
            console.error('\n=== Error de Conexión ===');
            console.error('Error en la conexión:', error);
            console.error('========================\n');
        });

        // Eventos de control
        this.socket.on('PLAY', (data) => {
            console.log('Evento PLAY recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'PLAY', data });
        });

        this.socket.on('PAUSE', (data) => {
            console.log('Evento PAUSE recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'PAUSE', data });
        });

        this.socket.on('STOP', (data) => {
            console.log('Evento STOP recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'STOP', data });
        });

        this.socket.on('NEXT', (data) => {
            console.log('Evento NEXT recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'NEXT', data });
        });

        this.socket.on('PREVIOUS', (data) => {
            console.log('Evento PREVIOUS recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'PREVIOUS', data });
        });

        this.socket.on('VOLUME_UP', (data) => {
            console.log('Evento VOLUME_UP recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'VOLUME_UP', data });
        });

        this.socket.on('VOLUME_DOWN', (data) => {
            console.log('Evento VOLUME_DOWN recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'VOLUME_DOWN', data });
        });

        this.socket.on('MUTE', (data) => {
            console.log('Evento MUTE recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'MUTE', data });
        });

        this.socket.on('UNMUTE', (data) => {
            console.log('Evento UNMUTE recibido', data);
            // Enviar evento a la aplicación principal
            global.mainWindow?.webContents.send('remote-control', { action: 'UNMUTE', data });
        });
    }

    setupMonitorListeners() {
        if (!this.monitorSocket) return;

        this.monitorSocket.on('connect', () => {
            console.log('\n=== Conexión con Monitor Establecida ===');
            console.log('Conectado al servidor de monitoreo');
            console.log(`ID del socket: ${this.monitorSocket.id}`);
            console.log('=====================================\n');
        });

        this.monitorSocket.on('disconnect', () => {
            console.log('\n=== Desconexión del Monitor ===');
            console.log('Desconectado del servidor de monitoreo');
            console.log('==============================\n');
        });

        this.monitorSocket.on('error', (error) => {
            console.error('\n=== Error de Conexión con Monitor ===');
            console.error('Error en la conexión:', error);
            console.error('================================\n');
        });
    }

    async startHeartbeat() {
        console.log('Iniciando sistema de heartbeat...');
        this.intervalId = setInterval(async () => {
            if (this.socket && this.socket.connected) {
                const now = Date.now();
                console.log(`\nTiempo desde último heartbeat: ${now - this.lastHeartbeatTime}ms`);
                this.lastHeartbeatTime = now;

                // Obtener el estado actual de VLC
                try {
                    this.deviceInfo.vlcStatus = await getVLCStatus();
                    this.deviceInfo.playlistInfo = await getPlaylistInfo();
                } catch (error) {
                    console.error('Error al obtener estado de VLC:', error);
                    this.deviceInfo.vlcStatus = {
                        status: 'error',
                        connected: false,
                        error: error.message
                    };
                }

                this.deviceInfo.lastSeen = new Date().toISOString();
                const heartbeatData = {
                    id: this.deviceInfo.id,
                    name: this.deviceInfo.name,
                    status: true,
                    lastSeen: this.deviceInfo.lastSeen,
                    ip: this.deviceInfo.ip,
                    mac: this.deviceInfo.mac,
                    vlc: {
                        status: this.deviceInfo.vlcStatus,
                        playlist: this.deviceInfo.playlistInfo
                    }
                };

                // Enviar heartbeat al servidor controlador
                this.socket.emit('heartbeat', heartbeatData);

                // Enviar heartbeat al servidor de monitoreo
                if (this.monitorSocket && this.monitorSocket.connected) {
                    this.monitorSocket.emit('heartbeat', heartbeatData);
                    this.reconnectAttempts = 0; // Resetear intentos de reconexión
                } else {
                    console.warn('Socket de monitoreo no conectado, intentando reconectar...');
                    this.reconnectMonitor();
                }

                console.log('=== Heartbeat Enviado ===');
                console.log(`ID: ${heartbeatData.id || 'No asignado'}`);
                console.log(`Nombre: ${heartbeatData.name || 'Sin nombre'}`);
                console.log(`IP: ${heartbeatData.ip}`);
                console.log(`MAC: ${heartbeatData.mac}`);
                console.log(`Estado: ${heartbeatData.status ? 'Activo' : 'Inactivo'}`);
                console.log(`VLC Estado: ${heartbeatData.vlc.status.status}`);
                console.log(`VLC Reproduciendo: ${heartbeatData.vlc.status.playing ? 'Sí' : 'No'}`);
                console.log(`Archivo actual: ${heartbeatData.vlc.status.currentItem || 'Ninguno'}`);
                console.log(`Playlist: ${heartbeatData.vlc.playlist.name} (${heartbeatData.vlc.playlist.totalItems} archivos)`);
                console.log(`Última vez visto: ${heartbeatData.lastSeen}`);
                console.log(`Socket controlador: ${this.socket.connected}`);
                console.log(`Socket monitoreo: ${this.monitorSocket?.connected || false}`);
                console.log('=======================\n');
            } else {
                console.warn('No se pudo enviar heartbeat: Socket no conectado');
                this.reconnectController();
            }
        }, this.heartbeatInterval);
    }

    reconnectMonitor() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            if (this.monitorSocket) {
                this.monitorSocket.disconnect();
            }

            this.monitorSocket = io(this.monitorUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });

            this.setupMonitorListeners();
        } else {
            console.error('Máximo número de intentos de reconexión alcanzado');
        }
    }

    reconnectController() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            if (this.socket) {
                this.socket.disconnect();
            }

            this.socket = io(this.serverUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });

            this.setupEventListeners();
        } else {
            console.error('Máximo número de intentos de reconexión alcanzado');
        }
    }

    stopHeartbeat() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Heartbeat interval cleared.');
        }
    }

    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.disconnect();
            console.log('Desconectado del servidor controlador');
        }
        if (this.monitorSocket) {
            this.monitorSocket.disconnect();
            console.log('Desconectado del servidor de monitoreo');
        }
    }

    // Métodos para enviar eventos al servidor
    sendStatus(status) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('STATUS_UPDATE', {
                id: this.deviceInfo.id,
                status: status,
                timestamp: new Date().toISOString()
            });
        }
    }

    sendError(error) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('ERROR', {
                id: this.deviceInfo.id,
                error: error,
                timestamp: new Date().toISOString()
            });
        }
    }
}

export default ControllerClient; 