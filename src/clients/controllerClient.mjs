import { io } from 'socket.io-client';
import os from 'os';

class ControllerClient {
    constructor(serverUrl, monitorUrl = 'http://localhost:3002') {
        this.serverUrl = serverUrl;
        this.monitorUrl = monitorUrl;
        this.socket = null;
        this.monitorSocket = null;
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
        this.lastHeartbeatTime = Date.now();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
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
        this.socket.on('PLAY', () => {
            console.log('Evento PLAY recibido');
            // Implementar lógica de reproducción
        });

        this.socket.on('PAUSE', () => {
            console.log('Evento PAUSE recibido');
            // Implementar lógica de pausa
        });

        this.socket.on('STOP', () => {
            console.log('Evento STOP recibido');
            // Implementar lógica de detención
        });

        this.socket.on('NEXT', () => {
            console.log('Evento NEXT recibido');
            // Implementar lógica de siguiente elemento
        });

        this.socket.on('PREVIOUS', () => {
            console.log('Evento PREVIOUS recibido');
            // Implementar lógica de elemento anterior
        });

        this.socket.on('VOLUME_UP', () => {
            console.log('Evento VOLUME_UP recibido');
            // Implementar lógica de subir volumen
        });

        this.socket.on('VOLUME_DOWN', () => {
            console.log('Evento VOLUME_DOWN recibido');
            // Implementar lógica de bajar volumen
        });

        this.socket.on('MUTE', () => {
            console.log('Evento MUTE recibido');
            // Implementar lógica de silencio
        });

        this.socket.on('UNMUTE', () => {
            console.log('Evento UNMUTE recibido');
            // Implementar lógica de quitar silencio
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

    startHeartbeat() {
        console.log('Iniciando sistema de heartbeat...');
        this.intervalId = setInterval(() => {
            if (this.socket && this.socket.connected) {
                const now = Date.now();
                console.log(`\nTiempo desde último heartbeat: ${now - this.lastHeartbeatTime}ms`);
                this.lastHeartbeatTime = now;

                this.deviceInfo.lastSeen = new Date().toISOString();
                const heartbeatData = {
                    id: this.deviceInfo.id,
                    name: this.deviceInfo.name,
                    status: true,
                    lastSeen: this.deviceInfo.lastSeen,
                    ip: this.deviceInfo.ip,
                    mac: this.deviceInfo.mac
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