import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { appConfig } from '../config/appConfig.mjs';
import { vlcRequest, vlcCommands } from '../services/vlcService.mjs';
import { getActivePlaylist } from '../utils/activePlaylist.mjs';

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
                const playlistDir = path.dirname(playlistPath);
                for (const entry of entries) {
                    // Extraer solo el nombre del archivo
                    const fileName = path.basename(entry.trim());
                    // Construir la ruta completa relativa al directorio de la playlist
                    const videoPath = path.join(playlistDir, fileName);

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
            // Obtener la playlist activa
            const activePlaylist = await getActivePlaylist();
            this.playlistPath = activePlaylist.playlistPath;

            // Obtener la ruta de la playlist
            if (!this.playlistPath) {
                throw new Error('No se encontró la playlist o los videos referenciados');
            }

            const options = [
                '--vout=gles2',
                '--loop',                     // Reproducción en bucle
                '--no-audio',                 // Sin audio por defecto
                '--no-video-title-show',      // No mostrar título del video
                '--no-video-deco',            // Sin decoraciones de ventana
                '--no-mouse-events',          // Sin eventos de mouse
                '--intf=http',                // Interfaz HTTP para control
                '--http-port=8080',           // Puerto HTTP
                '--http-password=tecno',      // Contraseña HTTP
                '--http-host=localhost',      // Host HTTP

                // Opciones de Snapshot
                '--snapshot-path=/home/tecno/app-player/public/snapshots/', // Directorio donde se almacenarán las instantáneas
                '--snapshot-prefix=snapshot', // Prefijo para los nombres de los archivos de instantáneas
                '--snapshot-format=jpg',     // Formato de las instantáneas (JPEG)
                '--snapshot-width=300',       // Ancho de las instantáneas (300 píxeles)
                '--snapshot-height=0',        // Altura de las instantáneas (0 para mantener la relación de aspecto)
                '--no-snapshot-preview',      // Desactivar la vista previa de las instantáneas
                '--snapshot-sequential',      // Usar números secuenciales para los nombres de los archivos

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

            // Cargar la playlist activa en VLC
            if (this.playlistPath) {
                setTimeout(async () => {
                    try {
                        await vlcRequest(`${vlcCommands.play}&input=${encodeURIComponent(this.playlistPath)}`);
                        console.log(`Playlist cargada: ${this.playlistPath}`);
                    } catch (error) {
                        console.error('Error al cargar la playlist:', error);
                    }
                }, 2000); // Esperar 2 segundos para que VLC esté listo
            }

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

    /**
     * Reinicia el reproductor VLC
     * @returns {Promise<boolean>} true si se reinició correctamente
     */
    async restart() {
        try {
            console.log('⏱️ Reiniciando VLC...');

            // Detener el proceso actual de VLC si existe
            if (this.process) {
                console.log('🛑 Deteniendo instancia previa de VLC...');
                await this.stop();

                // Esperar un momento para asegurar que el proceso se ha cerrado correctamente
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Obtener la playlist activa actualizada
            const activePlaylist = await getActivePlaylist();
            this.playlistPath = activePlaylist.playlistPath;

            console.log(`🎬 Reiniciando VLC con playlist: ${activePlaylist.playlistName}`);

            // Iniciar VLC de nuevo
            const success = await this.start();

            if (success) {
                console.log('✅ VLC reiniciado correctamente');
                return true;
            } else {
                console.error('❌ Error al reiniciar VLC');
                return false;
            }
        } catch (error) {
            console.error('❌ Error durante el reinicio de VLC:', error);
            return false;
        }
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

    async pause() {
        try {
            await vlcRequest(vlcCommands.pause);
            console.log('VLC: Orden de pausa enviada');
            return true;
        } catch (error) {
            console.error('Error al enviar orden de pausa a VLC:', error);
            return false;
        }
    }

    async next() {
        try {
            await vlcRequest(vlcCommands.next);
            console.log('VLC: Orden de siguiente enviada');
            return true;
        } catch (error) {
            console.error('Error al enviar orden de siguiente a VLC:', error);
            return false;
        }
    }

    async previous() {
        try {
            await vlcRequest(vlcCommands.previous);
            console.log('VLC: Orden de anterior enviada');
            return true;
        } catch (error) {
            console.error('Error al enviar orden de anterior a VLC:', error);
            return false;
        }
    }

    async volumeUp() {
        try {
            // Aumentar el volumen un 10%
            await vlcRequest(`${vlcCommands.toggleAudio}&val=+10`);
            console.log('VLC: Orden de subir volumen enviada');
            return true;
        } catch (error) {
            console.error('Error al enviar orden de subir volumen a VLC:', error);
            return false;
        }
    }

    async volumeDown() {
        try {
            // Disminuir el volumen un 10%
            await vlcRequest(`${vlcCommands.toggleAudio}&val=-10`);
            console.log('VLC: Orden de bajar volumen enviada');
            return true;
        } catch (error) {
            console.error('Error al enviar orden de bajar volumen a VLC:', error);
            return false;
        }
    }

    toggleAudio() {
        if (this.process) {
            // Enviar comando para alternar audio
            this.process.stdin.write('key key-audio-track\n');
        }
    }
} 