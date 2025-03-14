import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class VLCMonitor {
    constructor() {
        this.isVlcPlaying = false;
        this.monitorInterval = null;
        this.vlcConfig = {
            host: 'localhost',
            port: 8080,
            password: 'tecno'
        };
    }

    // Función para hacer peticiones a la API HTTP de VLC
    async vlcRequest(command) {
        try {
            const response = await axios.get(`http://${this.vlcConfig.host}:${this.vlcConfig.port}/requests/status.xml`, {
                params: { command },
                auth: {
                    username: '',
                    password: this.vlcConfig.password
                },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error('Error en la petición a VLC:', error.message);
            throw error;
        }
    }

    // Función para verificar el estado de reproducción de VLC
    async checkVlcStatus() {
        try {
            const statusXml = await this.vlcRequest('status');
            const parsedXml = await parseStringPromise(statusXml);
            const state = parsedXml.root.state[0];

            // Si el estado es "playing", establecemos la variable isVlcPlaying en true
            if (state === 'playing') {
                this.isVlcPlaying = true;
                console.log('VLC está reproduciendo contenido.');
                return true;
            } else {
                console.log('VLC no está reproduciendo. Estado:', state);
                return false;
            }
        } catch (error) {
            console.error(`Error verificando el estado de VLC: ${error.message}`);
            return false;
        }
    }

    // Función para reiniciar el sistema
    async rebootSystem() {
        console.log('VLC no ha comenzado a reproducir. Reiniciando el sistema...');
        try {
            await execAsync('sudo reboot');
        } catch (error) {
            console.error('Error al reiniciar el sistema:', error);
            // Intento de reinicio forzado como fallback
            try {
                await execAsync('sudo shutdown -r now');
            } catch (err) {
                console.error('Error en reinicio forzado:', err);
            }
        }
    }

    // Función para obtener el estado actual
    getPlayingStatus() {
        return this.isVlcPlaying;
    }

    // Función para iniciar el monitoreo
    startMonitoring(checkInterval = 5000) {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }

        this.monitorInterval = setInterval(async () => {
            const isPlaying = await this.checkVlcStatus();
            if (!isPlaying) {
                this.isVlcPlaying = false;
            }
        }, checkInterval);

        console.log('Monitoreo de VLC iniciado');
    }

    // Función para detener el monitoreo
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        console.log('Monitoreo de VLC detenido');
    }

    // Función para obtener información detallada del estado
    async getDetailedStatus() {
        try {
            const statusXml = await this.vlcRequest('status');
            const parsedXml = await parseStringPromise(statusXml);

            return {
                state: parsedXml.root.state[0],
                time: parsedXml.root.time?.[0] || 0,
                length: parsedXml.root.length?.[0] || 0,
                volume: parsedXml.root.volume?.[0] || 0,
                isPlaying: this.isVlcPlaying,
                currentItem: parsedXml.root.currentplid?.[0] || 0
            };
        } catch (error) {
            console.error('Error al obtener estado detallado:', error);
            return {
                state: 'error',
                isPlaying: false,
                error: error.message
            };
        }
    }
}

export default VLCMonitor; 