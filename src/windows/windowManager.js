import { BrowserWindow } from 'electron';
import path from 'path';
import { VLCPlayer } from '../lib/vlcPlayer.js';

export class WindowManager {
    constructor() {
        this.mainWindow = null;
        this.vlcPlayer = new VLCPlayer();
        this.vlcInitialized = false;
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        // Cargar el archivo index.html
        this.mainWindow.loadFile(path.join(process.cwd(), 'index.html'));

        // Manejar el cierre de la ventana
        this.mainWindow.on('closed', () => {
            // Detener VLC si está en ejecución
            this.closePlayerWindow();
            this.mainWindow = null;
        });

        return this.mainWindow;
    }

    async createPlayerWindow() {
        try {
            const success = await this.vlcPlayer.start();
            this.vlcInitialized = success;
            return success;
        } catch (error) {
            console.error('Error al iniciar VLC Player:', error);
            return false;
        }
    }

    // Método para verificar si hay ventanas abiertas
    hasWindows() {
        return BrowserWindow.getAllWindows().length > 0;
    }

    // Método para obtener la ventana principal
    getMainWindow() {
        return this.mainWindow;
    }

    // Método para cerrar la ventana del reproductor
    closePlayerWindow() {
        try {
            this.vlcPlayer.stop();
            this.vlcInitialized = false;
        } catch (error) {
            console.error('Error al cerrar VLC Player:', error);
        }
    }

    // Método para alternar el audio
    togglePlayerAudio() {
        try {
            if (this.vlcInitialized) {
                this.vlcPlayer.toggleAudio();
            } else {
                console.error('VLC Player no ha sido inicializado');
            }
        } catch (error) {
            console.error('Error al alternar audio en VLC Player:', error);
        }
    }
} 