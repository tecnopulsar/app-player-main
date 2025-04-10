import { io } from 'socket.io-client';
import { getVLCStatus, getPlaylistInfo } from '../utils/vlcStatus.js';
import { getLocalIP, getMACAddress } from '../utils/networkUtils.mjs';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';
import { promises as fsPromises } from 'fs';
import { v4 as uuidv4 } from 'uuid';

class ControllerClient {
    constructor(serverUrl = null) {
        this.config = {
            serverUrl: serverUrl || appConfig.controller?.url || 'http://localhost:3001',
            heartbeatInterval: appConfig.controller?.heartbeatInterval || 25000,
            verboseLogs: appConfig.controller?.verboseLogs || false,
            maxReconnectAttempts: appConfig.controller?.maxReconnectAttempts || 5,
            reconnectDelay: appConfig.controller?.reconnectDelay || 1000,
            connectionTimeout: appConfig.controller?.connectionTimeout || 20000,
            serverCheckInterval: appConfig.controller?.serverCheckInterval || 30000
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
                controller: null
            },
            reconnectAttempts: 0,
            intervals: {
                heartbeat: null,
                serverCheck: null
            },
            serverAvailable: false
        };
    }

    // Genera un ID corto para nombres de dispositivo
    generateShortId() {
        return Math.random().toString(36).substring(2, 8);
    }

    async initialize() {
        try {
            console.log('\n=== Iniciando Conexión Socket Controller===');

            await this.checkServersAvailability();
            this.setupEventHandlers();

            this.startServerCheck();

            // Si el servidor controlador no está disponible, iniciar el proceso de reconexión
            if (!this.state.sockets.controller?.connected) {
                console.log('⚠️ Servidor controlador no disponible al inicio. Iniciando proceso de reconexión...');
                this.reconnectController();
            }

            console.log('==========================\n');
        } catch (error) {
            this.handleInitializationError(error);
        }
    }

    startServerCheck() {
        if (this.state.intervals.serverCheck) return;

        console.log(`🔄 Iniciando verificación periódica del servidor (intervalo: ${this.config.serverCheckInterval}ms)`);

        this.state.intervals.serverCheck = setInterval(async () => {
            await this.checkServerAvailability(this.config.serverUrl)
                .then(available => {
                    if (available && !this.state.serverAvailable) {
                        console.log('✅ Servidor controlador disponible. Intentando reconectar...');
                        this.state.serverAvailable = true;
                        this.state.reconnectAttempts = 0;
                        this.reconnectController();
                    }
                    else if (!available && this.state.serverAvailable) {
                        console.log('⚠️ Servidor controlador ya no disponible.');
                        this.state.serverAvailable = false;
                    }
                })
                .catch(error => {
                    console.error('❌ Error al verificar disponibilidad del servidor:', error?.message || 'Error desconocido');
                });
        }, this.config.serverCheckInterval);
    }

    async checkServersAvailability() {
        const [controllerAvailable] = await Promise.all([
            this.checkServerAvailability(this.config.serverUrl)
        ]);

        this.state.serverAvailable = controllerAvailable;

        if (controllerAvailable) {
            this.connectToController();
        } else {
            console.warn(`⚠️ Servidor controlador no disponible en ${this.config.serverUrl}`);
            // Iniciar el proceso de reconexión para el controlador
            this.reconnectController();
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

    setupEventHandlers() {
        this.setupControllerEvents();
    }

    setupControllerEvents() {
        const { controller } = this.state.sockets;
        if (!controller) return;

        controller
            .on('connect', () => {
                console.log('🔌 Evento: Conexión establecida con el controlador');
                this.handleControllerConnect();
            })
            .on('AUTH_SUCCESS', (data) => {
                console.log('🔐 Evento: Autenticación exitosa', data);
                this.handleAuthSuccess(data);
            })
            .on('disconnect', () => {
                console.log('🔌 Evento: Desconexión del controlador');
                this.handleControllerDisconnect();
            })
            .on('error', (error) => {
                console.error('❌ Evento: Error en el controlador', error);
                this.handleControllerError(error);
            });
    }

    // Handlers de eventos
    handleControllerConnect() {
        this.logConnection('Controlador', this.state.sockets.controller.id);
        this.updateDeviceStatus('active');
        this.state.sockets.controller.emit('AUTHENTICATE', this.state.deviceInfo);
        this.startHeartbeat();

        this.state.reconnectAttempts = 0;
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
        try {
            console.log('🔄 Iniciando proceso de heartbeat...');

            // Actualizar estado de VLC
            console.log('📊 Actualizando estado de VLC...');
            await this.updateVlcStatus();
            console.log('✅ Estado de VLC actualizado:', this.state.vlcData);

            // Obtener snapshot
            console.log('📸 Obteniendo snapshot...');
            const snapshot = await this.getSnapshot();
            console.log(snapshot ? '✅ Snapshot obtenido' : '⚠️ No se pudo obtener snapshot');

            // Obtener estado completo del sistema
            console.log('🔍 Obteniendo estado completo del sistema...');
            const systemState = await this.getSystemState();
            console.log('✅ Estado del sistema obtenido');

            // Preparar datos del heartbeat
            console.log('📦 Preparando datos del heartbeat...');
            const heartbeatData = this.prepareHeartbeatData(snapshot, systemState);
            console.log('✅ Datos del heartbeat preparados:', {
                deviceId: heartbeatData.id,
                vlcStatus: heartbeatData.vlc?.status?.status,
                vlcPlaylist: heartbeatData.vlc?.playlist?.name,
                hasSnapshot: !!heartbeatData.snapshot,
                hasSystemState: !!heartbeatData.systemState
            });

            // Enviar a controlador
            console.log('📤 Enviando heartbeat al controlador...');
            if (this.state.sockets.controller?.connected) {
                this.state.sockets.controller.emit('heartbeat', heartbeatData);
                console.log('✅ Heartbeat enviado al controlador');
            } else {
                console.warn('⚠️ Controlador no conectado, intentando reconectar...');
                this.reconnectController();
            }

            this.logHeartbeat(heartbeatData);
        } catch (error) {
            const errorMessage = error?.message || 'Error desconocido';
            const errorStack = error?.stack || 'No stack trace disponible';
            const errorResponse = error?.response ? {
                status: error.response.status,
                data: error.response.data
            } : null;

            console.error('❌ Error en heartbeat:', errorMessage);
            console.error('Stack trace:', errorStack);

            if (errorResponse) {
                console.error('Detalles de la respuesta:', errorResponse);
            }

            // Intentar reconectar si es un error de conexión
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                console.log('🔄 Error de conexión detectado, intentando reconectar...');
                this.reconnectController();
            }
        }
    }

    async updateVlcStatus() {
        try {
            this.state.vlcData = {
                status: await getVLCStatus(),
                playlist: await getPlaylistInfo()
            };
        } catch (error) {
            console.error('❌ Error al actualizar estado de VLC:', error?.message || 'Error desconocido');
            this.state.vlcData.status = {
                status: 'error',
                connected: false,
                error: error?.message || 'Error desconocido'
            };
            throw error;
        }
    }

    async getSnapshot() {
        try {
            const response = await axios.get('http://localhost:3000/api/vlc/snapshot');

            // Verificar si la respuesta tiene el formato esperado
            const snapshotPath = response.data?.snapshotPath || response.data?.fileName;

            if (snapshotPath) {
                try {
                    // Intentar leer el archivo
                    const imageBuffer = await fsPromises.readFile(snapshotPath);
                    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
                } catch (error) {
                    console.error('❌ Error al leer el archivo de snapshot:', error?.message || 'Error desconocido');

                    // Si no se puede leer el archivo, intentar usar la URL directamente
                    if (response.data?.snapshot?.url) {
                        console.log(`ℹ️ Usando URL del snapshot: ${response.data.snapshot.url}`);
                        return response.data.snapshot.url;
                    }

                    return null;
                }
            } else {
                console.warn('⚠️ No se pudo obtener el snapshot: No se encontró la ruta del archivo en la respuesta');
                return null;
            }
        } catch (error) {
            if (error.response) {
                console.error(`❌ Error al obtener snapshot (${error.response.status}):`, error.response.data?.message || 'Error desconocido');
            } else {
                console.error('❌ Error al obtener snapshot:', error?.message || 'Error desconocido');
            }
            return null;
        }
    }

    async getSystemState() {
        try {
            // Obtener información del sistema
            const systemInfo = {
                cpu: process.cpuUsage(),
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                platform: process.platform,
                arch: process.arch,
                version: process.version,
                pid: process.pid,
                title: process.title,
                env: process.env.NODE_ENV || 'production'
            };

            // Obtener información de red
            const networkInfo = {
                localIP: this.state.deviceInfo.ip,
                macAddress: this.state.deviceInfo.mac
            };

            // Obtener información de VLC
            const vlcInfo = {
                status: this.state.vlcData.status,
                playlist: this.state.vlcData.playlist,
                isRunning: this.state.vlcData.status?.connected || false,
                currentItem: this.state.vlcData.status?.currentItem || null,
                length: this.state.vlcData.status?.length || 0,
                time: this.state.vlcData.status?.time || 0,
                volume: this.state.vlcData.status?.volume || 0,
                state: this.state.vlcData.status?.state || 'unknown'
            };

            // Obtener información de la aplicación
            const appInfo = {
                name: appConfig.app.name,
                version: appConfig.app.version,
                deviceId: this.state.deviceInfo.id,
                deviceName: this.state.deviceInfo.name,
                deviceType: appConfig.device.type,
                deviceGroup: appConfig.device.group
            };

            return {
                timestamp: new Date().toISOString(),
                system: systemInfo,
                network: networkInfo,
                vlc: vlcInfo,
                app: appInfo
            };
        } catch (error) {
            console.error('❌ Error al obtener estado del sistema:', error);
            return null;
        }
    }

    prepareHeartbeatData(snapshot, systemState) {
        this.updateDeviceStatus('active');

        const heartbeatData = {
            ...this.state.deviceInfo,
            timestamp: new Date().toISOString(),
            vlc: this.state.vlcData,
            snapshot: snapshot || null,
            systemState: systemState || null
        };

        return heartbeatData;
    }

    // Reconexión
    reconnectController() {
        this.handleReconnection('controller', () => this.connectToController());
    }

    handleReconnection(type, connectFn) {
        if (this.state.serverAvailable) {
            this.state.reconnectAttempts = 0;
        }

        if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.log(`⚠️ Máximo de intentos de reconexión para ${type} alcanzado (${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
            console.log(`🔄 Continuando con verificación periódica del servidor...`);
            return;
        }

        this.state.reconnectAttempts++;
        console.log(`🔄 Intento de reconexión ${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts} para ${type}`);

        if (this.state.sockets[type]) {
            this.state.sockets[type].disconnect();
        }

        // Intentar reconectar
        try {
            connectFn();
        } catch (error) {
            console.error(`❌ Error al intentar reconectar ${type}:`, error?.message || 'Error desconocido');
            if (error?.stack) {
                console.error('Stack trace:', error.stack);
            }
        }
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
        if (error instanceof Error) {
            console.error(error.message);
            if (error.stack) {
                console.error('Stack trace:', error.stack);
            }
        } else {
            console.error(error?.toString() || 'Error desconocido');
        }
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

        if (this.state.intervals.serverCheck) {
            clearInterval(this.state.intervals.serverCheck);
            this.state.intervals.serverCheck = null;
            this.log('Verificación periódica del servidor detenida');
        }

        if (this.state.sockets.controller) {
            this.state.sockets.controller.disconnect();
            this.log('Desconectado del controlador');
        }
    }
}

export default ControllerClient;