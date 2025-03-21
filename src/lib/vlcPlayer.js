import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
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
                await fsPromises.access(playlistPath);
                console.log('Playlist encontrada en:', playlistPath);

                // Leer el contenido de la playlist para verificar que es válida
                const playlistContent = await fsPromises.readFile(playlistPath, 'utf8');
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
                        await fsPromises.access(videoPath);
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

            // Verificar el formato de la playlist para asegurar que solo contiene nombres de archivo
            try {
                const content = await fsPromises.readFile(this.playlistPath, 'utf8');
                const lines = content.split('\n');
                const videoEntries = lines.filter(line => line.trim() && !line.startsWith('#'));
                const playlistDir = path.dirname(this.playlistPath);

                // Comprobar si hay rutas en lugar de nombres de archivo
                const needsUpdate = videoEntries.some(entry => {
                    const fileName = path.basename(entry.trim());
                    return entry.trim() !== fileName;
                });

                // Si se necesita actualizar, reescribir la playlist con solo nombres de archivo
                if (needsUpdate) {
                    console.log(`⚠️ Corrigiendo playlist ${this.playlistPath} para usar solo nombres de archivo`);
                    const updatedContent = '#EXTM3U\n' + videoEntries
                        .map(entry => path.basename(entry.trim()))
                        .join('\n');

                    await fsPromises.writeFile(this.playlistPath, updatedContent);
                    console.log('✅ Playlist corregida correctamente');
                }

                // Verificar que los archivos de video existan
                for (const entry of videoEntries) {
                    const fileName = path.basename(entry.trim());
                    const videoPath = path.join(playlistDir, fileName);

                    try {
                        await fsPromises.access(videoPath);
                    } catch (error) {
                        console.error(`❌ No se puede acceder al video: ${videoPath}`);
                        throw new Error(`No se puede acceder al video: ${fileName}`);
                    }
                }
            } catch (error) {
                console.error('Error al verificar la playlist:', error);
                throw error;
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

    async stop() {
        if (this.process) {
            // Matar el proceso de VLC
            this.process.kill();
            this.process = null;
            console.log('VLC detenido');
            return true;
        }
        console.log('No hay proceso de VLC para detener');
        return false;
    }

    /**
     * Carga una playlist en VLC sin reiniciar el proceso
     * @param {string} playlistPath Ruta a la playlist a cargar
     * @returns {Promise<boolean>} Éxito de la operación
     */
    async loadPlaylist(playlistPath) {
        try {
            if (!this.process) {
                console.error('❌ No hay proceso de VLC activo para cargar la playlist');
                return false;
            }

            // Guardar la ruta de la playlist
            this.playlistPath = playlistPath;

            // Cargar la playlist usando el API HTTP
            await vlcRequest(`${vlcCommands.clear}`); // Limpiar la lista actual
            await vlcRequest(`${vlcCommands.play}&input=${encodeURIComponent(playlistPath)}`);

            console.log(`✅ Playlist cargada en VLC existente: ${playlistPath}`);
            return true;
        } catch (error) {
            console.error(`❌ Error al cargar la playlist en VLC: ${error.message}`);
            return false;
        }
    }

    restart() {
        return new Promise(async (resolve) => {
            await this.stop();
            setTimeout(async () => {
                const success = await this.start();
                resolve(success);
            }, 1000);
        });
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