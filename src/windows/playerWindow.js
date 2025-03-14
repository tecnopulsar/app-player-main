import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';

export class PlayerWindow {
    constructor() {
        this.window = null;
    }

    async createPlayerWindow() {
        this.window = new BrowserWindow({
            width: 500,
            height: 300,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            frame: true,
            resizable: true,
            center: true,
        });

        // Cargar el archivo HTML del reproductor
        this.window.loadFile(path.join(process.cwd(), 'player.html'));

        // Manejar el cierre de la ventana
        this.window.on('closed', () => {
            this.window = null;
        });

        return this.window;
    }

    async getPlaylist() {
        try {
            // Primero intentar leer la carpeta Videos
            const videosPath = path.join(process.cwd(), 'public', 'Videos');
            const videosDefectoPath = path.join(process.cwd(), 'public', 'VideosDefecto', 'playlistDefecto');

            // Verificar si la carpeta Videos existe y tiene contenido
            try {
                const videosFiles = await fs.readdir(videosPath);
                if (videosFiles.length > 0) {
                    // Buscar archivo .m3u en la carpeta Videos
                    const m3uFile = videosFiles.find(file => file.endsWith('.m3u'));
                    if (m3uFile) {
                        return path.join(videosPath, m3uFile);
                    }
                }
            } catch (error) {
                console.log('Carpeta Videos vacía o no existe, usando playlist por defecto');
            }

            // Si no hay playlist en Videos, usar la playlist por defecto
            return path.join(videosDefectoPath, 'playlistDefecto.m3u');
        } catch (error) {
            console.error('Error al obtener la playlist:', error);
            return null;
        }
    }

    getWindow() {
        return this.window;
    }

    close() {
        if (this.window) {
            this.window.close();
            this.window = null;
        }
    }
} 