import fs from 'fs';
import path from 'path';
import { appConfig } from './appConfig.mjs';

class SystemState {
    constructor() {
        this.stateFile = appConfig.paths.systemState;
        this.state = this.loadState();
    }

    loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                const data = fs.readFileSync(this.stateFile, 'utf8');
                return JSON.parse(data);
            }
            return this.getDefaultState();
        } catch (error) {
            console.error('❌ Error al cargar el estado del sistema:', error);
            return this.getDefaultState();
        }
    }

    getDefaultState() {
        return {
            currentPlaylist: null,
            lastPlaylist: null,
            playlistHistory: [],
            lastUpdate: new Date().toISOString(),
            deviceStatus: {
                isPlaying: false,
                isConnected: false,
                lastHeartbeat: null
            }
        };
    }

    saveState() {
        try {
            const dirPath = path.dirname(this.stateFile);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
            console.log('✅ Estado del sistema guardado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al guardar el estado del sistema:', error);
            return false;
        }
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState, lastUpdate: new Date().toISOString() };
        return this.saveState();
    }

    getCurrentPlaylist() {
        return this.state.currentPlaylist;
    }

    setCurrentPlaylist(playlistPath) {
        if (playlistPath !== this.state.currentPlaylist) {
            this.state.lastPlaylist = this.state.currentPlaylist;
            this.state.currentPlaylist = playlistPath;
            this.state.playlistHistory.unshift(playlistPath);
            if (this.state.playlistHistory.length > 10) {
                this.state.playlistHistory.pop();
            }
            return this.saveState();
        }
        return true;
    }

    getLastPlaylist() {
        return this.state.lastPlaylist;
    }

    getPlaylistHistory() {
        return this.state.playlistHistory;
    }

    updateDeviceStatus(status) {
        this.state.deviceStatus = {
            ...this.state.deviceStatus,
            ...status,
            lastHeartbeat: new Date().toISOString()
        };
        return this.saveState();
    }

    getDeviceStatus() {
        return this.state.deviceStatus;
    }
}

// Exportar una instancia única del estado del sistema
export const systemState = new SystemState(); 