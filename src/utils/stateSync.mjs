import { io } from 'socket.io-client';
import stateManager from './stateManager.mjs';
import { getConfig } from '../config/appConfig.mjs';

class StateSync {
    constructor() {
        this.socket = null;
        this.config = null;
        this.syncInterval = null;
        this.isConnected = false;
        this.lastSync = null;
    }

    async initialize() {
        try {
            this.config = await getConfig();
            this.connect();
            this.startPeriodicSync();
            return true;
        } catch (error) {
            console.error('Error al inicializar StateSync:', error);
            return false;
        }
    }

    connect() {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(this.config.socket.socketUrl, {
            reconnection: true,
            reconnectionDelay: this.config.socket.reconnectInterval,
            reconnectionAttempts: this.config.socket.retryAttempts,
            auth: {
                deviceId: this.config.device.id,
                authToken: this.config.device.authToken
            }
        });

        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor de administración');
            this.isConnected = true;
            this.syncState();
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor de administración');
            this.isConnected = false;
        });

        this.socket.on('error', (error) => {
            console.error('Error en la conexión:', error);
        });

        // Escuchar comandos del servidor
        this.socket.on('command', this.handleCommand.bind(this));
    }

    startPeriodicSync() {
        // Sincronizar cada 30 segundos
        this.syncInterval = setInterval(() => {
            if (this.isConnected) {
                this.syncState();
            }
        }, 30000);
    }

    async syncState() {
        try {
            const state = stateManager.getState();
            if (!state) return;

            // Enviar solo los cambios desde la última sincronización
            const changes = this.getStateChanges(state);
            if (Object.keys(changes).length > 0) {
                this.socket.emit('state:update', {
                    deviceId: this.config.device.id,
                    timestamp: new Date().toISOString(),
                    changes
                });
                this.lastSync = state;
            }
        } catch (error) {
            console.error('Error al sincronizar estado:', error);
        }
    }

    getStateChanges(currentState) {
        if (!this.lastSync) {
            this.lastSync = currentState;
            return currentState;
        }

        const changes = {};
        for (const [key, value] of Object.entries(currentState)) {
            if (JSON.stringify(value) !== JSON.stringify(this.lastSync[key])) {
                changes[key] = value;
            }
        }

        return changes;
    }

    async handleCommand(command) {
        try {
            switch (command.type) {
                case 'updateConfig':
                    await this.handleConfigUpdate(command.data);
                    break;
                case 'updatePlaylist':
                    await this.handlePlaylistUpdate(command.data);
                    break;
                case 'restart':
                    await this.handleRestart();
                    break;
                default:
                    console.warn(`Comando no reconocido: ${command.type}`);
            }
        } catch (error) {
            console.error('Error al procesar comando:', error);
            this.socket.emit('command:error', {
                commandId: command.id,
                error: error.message
            });
        }
    }

    async handleConfigUpdate(configData) {
        // Actualizar configuración y estado
        const currentState = stateManager.getState();
        const updatedState = {
            ...currentState,
            app: {
                ...currentState.app,
                ...configData
            }
        };
        await stateManager.updateState(updatedState);
        await stateManager.save();
    }

    async handlePlaylistUpdate(playlistData) {
        // Actualizar playlist activa
        await stateManager.updateActivePlaylist(playlistData);
        await stateManager.save();
    }

    async handleRestart() {
        // Implementar lógica de reinicio
        console.log('Reiniciando aplicación...');
        process.exit(0); // El proceso de gestión reiniciará la aplicación
    }

    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Crear una única instancia del StateSync
const stateSync = new StateSync();

export default stateSync; 