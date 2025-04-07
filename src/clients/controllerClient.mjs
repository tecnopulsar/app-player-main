import { io } from 'socket.io-client';
import { getVLCStatus, getPlaylistInfo } from '../utils/vlcStatus.js';
import { getLocalIP, getMACAddress } from '../utils/networkUtils.mjs';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

class ControllerClient {
    constructor(serverUrl = null, monitorUrl = null) {
        this.serverUrl = serverUrl || appConfig.controller?.url || 'http://localhost:3001';
        this.monitorUrl = monitorUrl || appConfig.monitor?.url || 'http://localhost:3002';
        this.socket = null;
        this.monitorSocket = null;
        this.deviceInfo = {
            id: null,
            name: appConfig.device?.name || null,
            ip: getLocalIP(),
            mac: getMACAddress(),
            status: 'active',
            vlcStatus: null,
            playlistInfo: null,
            lastSeen: new Date().toISOString()
        };
        this.heartbeatInterval = appConfig.controller?.heartbeatInterval || 25000;
        this.verboseLogs = appConfig.controller?.verboseLogs || false;
        this.intervalId = null;
        this.lastHeartbeatTime = Date.now();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = appConfig.controller?.maxReconnectAttempts || 5;
    }

    connect() {
        try {
            console.log('\n=== Iniciando Conexión con Controlador ===');
            console.log(`URL del servidor: ${this.serverUrl}`);
            console.log(`URL del monitor: ${this.monitorUrl}`);

            // Verificar disponibilidad de los servidores antes de conectar
            this.checkServerAvailability(this.serverUrl)
                .then(available => {
                    if (available) {
                        this.connectToController();
                    } else {
                        console.warn(`⚠️ Servidor controlador no disponible en ${this.serverUrl}`);
                    }
                });

            this.checkServerAvailability(this.monitorUrl)
                .then(available => {
                    if (available) {
                        this.connectToMonitor();
                    } else {
                        console.warn(`⚠️ Servidor monitor no disponible en ${this.monitorUrl}`);
                    }
                });
        } catch (error) {
            console.error('=== Error de Inicialización ===');
            console.error('Error al conectar con los servidores:', error);
            console.error('=============================');
        }
    }

    async checkServerAvailability(url) {
        try {
            // Usar axios con un timeout corto para verificar disponibilidad
            await axios.get(`${url}/health`, { timeout: 3000 });
            return true;
        } catch (error) {
            // Si hay error o timeout, consideramos que el servidor no está disponible
            return false;
        }
    }

    connectToController() {
        // Conectar al servidor controlador
        this.socket = io(this.serverUrl, {
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        this.setupEventListeners();
    }

    connectToMonitor() {
        // Conectar al servidor de monitoreo
        this.monitorSocket = io(this.monitorUrl, {
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        this.setupMonitorListeners();
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
        console.log(`Iniciando sistema de heartbeat (intervalo: ${this.heartbeatInterval}ms)...`);
        this.intervalId = setInterval(async () => {
            if (this.socket && this.socket.connected) {
                const now = Date.now();
                if (this.verboseLogs) {
                    console.log(`\nTiempo desde último heartbeat: ${now - this.lastHeartbeatTime}ms`);
                }
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

                // Obtener snapshot para incluirlo en el heartbeat
                let snapshot = null;
                try {
                    snapshot = await this.getSnapshot();
                } catch (snapshotError) {
                    if (this.verboseLogs) {
                        console.error('Error al obtener snapshot:', snapshotError);
                    }
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
                    },
                    snapshot: snapshot // Incluir el snapshot en el heartbeat
                };

                // Enviar heartbeat al servidor controlador
                this.socket.emit('heartbeat', heartbeatData);

                // Enviar heartbeat al servidor de monitoreo
                if (this.monitorSocket && this.monitorSocket.connected) {
                    this.monitorSocket.emit('heartbeat', heartbeatData);
                    this.reconnectAttempts = 0; // Resetear intentos de reconexión
                } else if (this.verboseLogs) {
                    console.warn('Socket de monitoreo no conectado, intentando reconectar...');
                    this.reconnectMonitor();
                }

                if (this.verboseLogs) {
                    this.logHeartbeatDetails(heartbeatData, snapshot);
                } else {
                    // Log mínimo para no saturar la consola
                    console.log(`Heartbeat enviado [${heartbeatData.id || 'No ID'}] - VLC: ${heartbeatData.vlc.status.connected ? 'Conectado' : 'Desconectado'} - ${heartbeatData.vlc.status.currentItem || 'Sin archivo'}`);
                }
            } else {
                console.warn('No se pudo enviar heartbeat: Socket no conectado');
                this.reconnectController();
            }
        }, this.heartbeatInterval);
    }

    logHeartbeatDetails(heartbeatData, snapshot) {
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
        console.log(`Snapshot: ${snapshot ? 'Incluido' : 'No disponible'}`);
        console.log(`Última vez visto: ${heartbeatData.lastSeen}`);
        console.log(`Socket controlador: ${this.socket.connected}`);
        console.log(`Socket monitoreo: ${this.monitorSocket?.connected || false}`);
        console.log('=======================\n');
    }

    reconnectMonitor() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            if (this.monitorSocket) {
                this.monitorSocket.disconnect();
            }

            this.connectToMonitor();
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

            this.connectToController();
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

    /**
     * Obtiene un snapshot del contenido actual en reproducción
     * @returns {Promise<string|null>} La URL del snapshot como base64 o null si hay error
     */
    async getSnapshot() {
        try {
            // Llamar al endpoint de snapshot para generar una nueva captura de pantalla
            const response = await axios.get('http://localhost:3000/api/vlc/snapshot');

            if (response.data.success) {
                // Leer el archivo como base64
                const snapshotPath = response.data.snapshotPath;

                if (fs.existsSync(snapshotPath)) {
                    const imageBuffer = await fsPromises.readFile(snapshotPath);
                    const base64Image = imageBuffer.toString('base64');
                    return `data:image/png;base64,${base64Image}`;
                }
            }
            return null;
        } catch (error) {
            if (this.verboseLogs) {
                console.error('Error al obtener snapshot:', error);
            }
            return null;
        }
    }

    /**
     * Envía un heartbeat al servidor de monitoreo
     */
    async sendHeartbeat() {
        if (this.monitorSocket && this.monitorSocket.connected) {
            try {
                // Obtener snapshot actual antes de enviar el heartbeat
                const snapshot = await this.getSnapshot();

                // Actualizar tiempo del dispositivo
                this.deviceInfo.lastSeen = new Date().toISOString();

                // Información completa para el heartbeat
                const heartbeatInfo = {
                    ...this.deviceInfo,
                    timestamp: new Date().toISOString(),
                    status: 'active',
                    snapshot: snapshot // Incluye la imagen como base64 o null
                };

                // Enviar heartbeat al servidor de monitoreo
                this.monitorSocket.emit('heartbeat', heartbeatInfo);

                if (this.verboseLogs) {
                    console.log('\n=== Heartbeat Enviado a Monitor ===');
                    console.log(`ID: ${heartbeatInfo.id || 'No asignado'}`);
                    console.log(`Timestamp: ${heartbeatInfo.timestamp}`);
                    console.log(`Estado: ${heartbeatInfo.status}`);
                    console.log(`Snapshot: ${snapshot ? 'Incluido' : 'No disponible'}`);
                    console.log('================================\n');
                }

                return true;
            } catch (error) {
                console.error('Error al enviar heartbeat al monitor:', error);
                return false;
            }
        } else {
            if (this.verboseLogs) {
                console.warn('No se pudo enviar heartbeat al monitor: Socket no conectado');
            }
            this.reconnectMonitor();
            return false;
        }
    }
}

export default ControllerClient; 