import { io } from 'socket.io-client';
import { getLocalIP, getMACAddress } from '../utils/networkUtils.mjs';
import { getConfig } from '../config/appConfig.mjs';

class DeviceClient {
    constructor(serverUrl = null) {
        const config = getConfig();
        this.serverUrl = serverUrl || config.controller?.url || 'http://localhost:3001';
        this.socket = null;
        this.deviceInfo = {
            id: null,
            name: config.device?.name || null,
            ip: getLocalIP(),
            mac: getMACAddress(),
            status: 'active',
            lastSeen: new Date().toISOString()
        };
        this.heartbeatInterval = config.controller?.heartbeatInterval || 25000;
        this.verboseLogs = config.controller?.verboseLogs || false;
        this.intervalId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = config.controller?.maxReconnectAttempts || 5;
    }

    connect() {
        try {
            console.log('Intentando conectar al servidor administrador...');
            console.log(`URL del servidor: ${this.serverUrl}`);

            this.socket = io(this.serverUrl, {
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                timeout: 20000
            });

            this.socket.on('connect', () => {
                console.log('=== Conexión Establecida ===');
                console.log('Conectado al servidor administrador');
                console.log(`ID del socket: ${this.socket.id}`);
                this.deviceInfo.lastSeen = new Date().toISOString();
                this.socket.emit('AUTHENTICATE', this.deviceInfo);
                this.startHeartbeat();
                console.log('==========================');
            });

            this.socket.on('AUTH_SUCCESS', ({ id, name }) => {
                console.log('=== Autenticación Exitosa ===');
                console.log(`ID asignado: ${id}`);
                console.log(`Nombre asignado: ${name}`);
                this.deviceInfo.id = id;
                this.deviceInfo.name = name;
                console.log('===========================');
            });

            this.socket.on('disconnect', () => {
                console.log('=== Desconexión Detectada ===');
                console.log('Desconectado del servidor administrador');
                console.log(`Razón: ${this.socket.disconnected ? 'Desconexión manual' : 'Error de conexión'}`);
                this.stopHeartbeat();
                console.log('===========================');
            });

            this.socket.on('error', (error) => {
                console.error('=== Error de Conexión ===');
                console.error('Error en la conexión:', error);
                console.error('========================');
            });

        } catch (error) {
            console.error('=== Error de Inicialización ===');
            console.error('Error al conectar con el servidor:', error);
            console.error('=============================');
        }
    }

    startHeartbeat() {
        this.intervalId = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.deviceInfo.lastSeen = new Date().toISOString();
                const heartbeatData = {
                    id: this.deviceInfo.id,
                    status: true,
                    lastSeen: this.deviceInfo.lastSeen,
                    ip: this.deviceInfo.ip,
                    mac: this.deviceInfo.mac
                };

                this.socket.emit('heartbeat', heartbeatData);

                // Logs condicionales según configuración
                if (this.verboseLogs) {
                    this.logHeartbeatDetails(heartbeatData);
                } else {
                    // Log mínimo
                    console.log(`Heartbeat enviado [${heartbeatData.id || 'No ID'}]`);
                }
            } else {
                console.warn('No se pudo enviar heartbeat: Socket no conectado');
                this.reconnectToServer();
            }
        }, this.heartbeatInterval);
    }

    logHeartbeatDetails(heartbeatData) {
        console.log('=== Heartbeat Enviado ===');
        console.log(`ID: ${heartbeatData.id || 'No asignado'}`);
        console.log(`IP: ${heartbeatData.ip}`);
        console.log(`MAC: ${heartbeatData.mac}`);
        console.log(`Estado: ${heartbeatData.status ? 'Activo' : 'Inactivo'}`);
        console.log(`Última vez visto: ${heartbeatData.lastSeen}`);
        console.log(`Socket conectado: ${this.socket.connected}`);
        console.log('=======================');
    }

    reconnectToServer() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            if (this.socket) {
                this.socket.disconnect();
            }

            this.connect();
        } else {
            console.error('Máximo número de intentos de reconexión alcanzado');
        }
    }

    stopHeartbeat() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.disconnect();
        }
    }
}

export default DeviceClient; 