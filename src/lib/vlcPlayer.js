import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { appConfig } from '../config/appConfig.mjs';

export class VLCPlayer {
    constructor() {
        this.process = null;
        this.playlistPath = null;
        this.watchdog = null;
    }

    async getPlaylistPath() {
        try {
            const playlistPath = path.join(appConfig.paths.videosDefecto, 'playlistDefecto', 'playlistDefecto.m3u');
            console.log("🚀 ~ VLCPlayer ~ getPlaylistPath ~ playlistPath:", playlistPath);

            // Verificar que el archivo existe
            try {
                await fs.access(playlistPath);
                console.log('Playlist encontrada en:', playlistPath);

                // Leer el contenido de la playlist para verificar que es válida
                const playlistContent = await fs.readFile(playlistPath, 'utf8');
                console.log('Contenido de la playlist:', playlistContent);

                // Verificar que la playlist contiene entradas válidas
                const entries = playlistContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
                if (entries.length === 0) {
                    console.error('La playlist está vacía o no contiene entradas válidas');
                    return null;
                }

                // Verificar que los archivos referenciados existen
                for (const entry of entries) {
                    // Extraer solo el nombre del archivo de la ruta absoluta
                    const fileName = path.basename(entry.trim());
                    // Construir la ruta completa dentro del proyecto
                    const videoPath = path.join(appConfig.paths.videosDefecto, 'playlistDefecto', fileName);

                    try {
                        await fs.access(videoPath);
                        console.log('Video encontrado:', videoPath);
                    } catch (error) {
                        console.error('Error: No se puede acceder al video:', videoPath);
                        return null;
                    }
                }

                return playlistPath;
            } catch (error) {
                console.error('Error: No se puede acceder a la playlist:', playlistPath);
                return null;
            }
        } catch (error) {
            console.error('Error al obtener la ruta de la playlist:', error);
            return null;
        }
    }

    async start() {
        try {
            // Obtener la ruta de la playlist
            this.playlistPath = await this.getPlaylistPath();
            if (!this.playlistPath) {
                throw new Error('No se encontró la playlist o los videos referenciados');
            }

            // Configuración de VLC
            const options = [
                // '--vout=gles',                // Usar OpenGL ES para la salida de video (optimizado para Raspberry Pi)
                '--no-video-title-show',      // No mostrar título del video
                '--no-video-deco',            // Sin decoraciones de ventana
                '--no-mouse-events',          // Sin eventos de mouse
                '--intf=http',                // Interfaz HTTP para control
                '--http-port=8080',           // Puerto HTTP
                '--http-password=tecno',      // Contraseña HTTP
                '--http-host=localhost',      // Host HTTP
                '--loop',                     // Reproducción en bucle
                '--no-audio',                 // Sin audio por defecto
                '--no-osd',                   // Deshabilitar OSD (On-Screen Display)
                '--no-snapshot-preview',      // Deshabilitar vista previa de capturas de pantalla
                '--no-stats',                 // Deshabilitar estadísticas en pantalla
                '--no-sub-autodetect-file',   // Deshabilitar detección automática de subtítulos                // Deshabilitar video (si solo necesitas audio)
                this.playlistPath             // Ruta de la playlist
            ];

            // Iniciar VLC
            this.process = spawn('vlc', options);

            // Manejar la salida
            this.process.stdout.on('data', (data) => {
                console.log(`VLC stdout: ${data}`);
            });

            this.process.stderr.on('data', (data) => {
                console.error(`VLC stderr: ${data}`);
            });

            // Manejar el cierre
            this.process.on('close', (code) => {
                console.log(`VLC se cerró con código ${code}`);
                this.process = null;

                // Si el código no es 0 (error), intentar reiniciar
                if (code !== 0) {
                    this.restart();
                }
            });

            // Implementar un watchdog simple
            this.setupWatchdog();

            return true;
        } catch (error) {
            console.error('Error al iniciar VLC:', error);
            return false;
        }
    }

    // Método para configurar el watchdog
    setupWatchdog() {
        let watchdogInterval = null;

        const checkProcess = () => {
            if (this.process && this.process.exitCode === null) {
                console.log('VLC está funcionando correctamente');
            } else {
                console.error('VLC no está funcionando, intentando reiniciar...');
                this.restart();
            }
        };

        // Iniciar el watchdog después de 5 segundos para dar tiempo a VLC de iniciar
        setTimeout(() => {
            watchdogInterval = setInterval(checkProcess, 30000); // Revisar cada 30 segundos
        }, 5000);

        // Agregar método para detener el watchdog
        this.watchdog = {
            start: () => {
                if (!watchdogInterval) {
                    watchdogInterval = setInterval(checkProcess, 30000);
                }
            },
            stop: () => {
                if (watchdogInterval) {
                    clearInterval(watchdogInterval);
                    watchdogInterval = null;
                }
            }
        };
    }

    async restart() {
        console.log('Reiniciando VLC...');
        this.stop();

        // Esperar un momento antes de reiniciar
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Intentar iniciar de nuevo
        return this.start();
    }

    stop() {
        if (this.process) {
            if (this.watchdog) {
                this.watchdog.stop();
            }
            this.process.kill();
            this.process = null;
        }
    }

    toggleAudio() {
        if (this.process) {
            // Enviar comando para alternar audio
            this.process.stdin.write('key key-audio-track\n');
        }
    }
} 