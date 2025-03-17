import { io } from 'socket.io-client';
import os from 'os';

class DeviceClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.deviceInfo = {
            id: null,
            name: null,
            ip: this.getLocalIP(),
            mac: this.getMACAddress(),
            status: 'active',
            lastSeen: new Date().toISOString()
        };
        this.heartbeatInterval = 25000; // 25 segundos
        this.intervalId = null;
    }

    getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.internal === false && iface.family === 'IPv4') {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }

    getMACAddress() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.internal === false && iface.family === 'IPv4') {
                    return iface.mac;
                }
            }
        }
        return '00:00:00:00:00:00';
    }

    connect() {
        try {
            console.log('Intentando conectar al servidor administrador...');
            console.log(`URL del servidor: ${this.serverUrl}`);

            this.socket = io(this.serverUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
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

                // Mejorar el logging del heartbeat
                console.log('=== Heartbeat Enviado ===');
                console.log(`ID: ${heartbeatData.id || 'No asignado'}`);
                console.log(`IP: ${heartbeatData.ip}`);
                console.log(`MAC: ${heartbeatData.mac}`);
                console.log(`Estado: ${heartbeatData.status ? 'Activo' : 'Inactivo'}`);
                console.log(`Última vez visto: ${heartbeatData.lastSeen}`);
                console.log(`Socket conectado: ${this.socket.connected}`);
                console.log('=======================');
            } else {
                console.warn('No se pudo enviar heartbeat: Socket no conectado');
            }
        }, this.heartbeatInterval);
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