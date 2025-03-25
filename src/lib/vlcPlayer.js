import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';
import { vlcRequest, vlcCommands } from '../services/vlcService.mjs';
import { getActivePlaylist } from '../utils/activePlaylist.mjs';

// Instancia singleton
let instance = null;

// Acceso seguro a global
let globalObj;
try {
    // Intenta acceder al objeto global de Electron
    // Esta importación dinámica no es soportada en ESM estricto, por lo que usamos un try/catch
    const electron = await import('electron');
    globalObj = electron.default;
} catch (e) {
    console.log('ℹ️ Objeto global de Electron no disponible en este contexto. Esto es normal en entornos de servidor o de prueba.');
    // Crear un objeto global local como fallback
    globalObj = {
        mainWindow: null,
        vlcPlayer: null,
        // Podemos agregar un método para actualizar el vlcPlayer
        setVLCPlayer: function (player) {
            this.vlcPlayer = player;
        }
    };
}

export class VLCPlayer {
    constructor() {
        // Implementar patrón singleton
        if (instance) {
            console.log('⚠️ Advertencia: Se intentó crear una nueva instancia de VLCPlayer, devolviendo la instancia existente.');
            return instance;
        }

        this.process = null;
        this.playlistPath = null;
        this.watchdog = null;

        // Guardar la instancia singleton
        instance = this;

        // Asignar la instancia al objeto global
        if (globalObj) {
            globalObj.vlcPlayer = this;
        }

        console.log('✅ Nueva instancia de VLCPlayer creada correctamente');
    }

    /**
     * Obtiene la instancia de VLCPlayer (singleton)
     * @returns {VLCPlayer} La instancia de VLCPlayer
     */
    static getInstance() {
        if (!instance) {
            instance = new VLCPlayer();
            console.log('📌 Instancia de VLCPlayer creada mediante getInstance()');
        } else {
            console.log('📌 Reutilizando instancia existente de VLCPlayer');
        }

        // Asegurar que la instancia global está actualizada
        if (globalObj) {
            globalObj.vlcPlayer = instance;
        }

        return instance;
    }

    /**
     * Reinicia la instancia singleton (solo para uso en pruebas o reinicio total)
     */
    static resetInstance() {
        if (instance && instance.process) {
            try {
                instance.process.kill();
                console.log('🔄 Instancia anterior de VLC eliminada');
            } catch (error) {
                console.error('❌ Error al eliminar instancia anterior:', error);
            }
        }
        instance = null;
        console.log('🔄 Singleton de VLCPlayer reiniciado');
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
     * Carga una playlist en VLC y comienza la reproducción.
     * @param {string} playlistPath - Ruta a la playlist
     * @param {boolean} forceRestart - Si debe forzar el reinicio de VLC en caso de problemas
     * @returns {Promise<boolean>} - Éxito o fracaso
     */
    async loadPlaylist(playlistPath, forceRestart = false) {
        try {
            console.log(`🎵 Intentando cargar playlist: ${playlistPath}`);

            // Verificar si la playlist existe
            if (!fs.existsSync(playlistPath)) {
                console.error(`❌ La playlist no existe: ${playlistPath}`);
                return false;
            }

            // Extraer información básica de la playlist
            const playlistDir = path.dirname(playlistPath);
            const playlistName = path.basename(playlistDir);
            console.log(`ℹ️ Nombre de la playlist a cargar: ${playlistName}`);

            // Verificar si VLC está activo
            if (!this.isRunning()) {
                console.log(`⚠️ VLC no está ejecutándose. ${forceRestart ? 'Intentando iniciar...' : 'Se necesita iniciar primero.'}`);

                if (forceRestart) {
                    const started = await this.start(playlistPath);
                    if (!started) {
                        console.error('❌ No se pudo iniciar VLC');
                        return false;
                    }
                    console.log('✅ VLC iniciado con la playlist');

                    // Verificar reproducción después de iniciar
                    return await this.verifyPlaylistLoaded(playlistPath);
                } else {
                    return false;
                }
            }

            // Si VLC está activo pero necesitamos forzar un reinicio
            if (forceRestart) {
                console.log('🔄 Forzando reinicio de VLC antes de cargar playlist...');
                await this.stop();
                await new Promise(resolve => setTimeout(resolve, 2000));
                const started = await this.start(playlistPath);
                if (!started) {
                    console.error('❌ No se pudo reiniciar VLC');
                    return false;
                }
                console.log('✅ VLC reiniciado con la playlist');

                // Verificar reproducción después de reiniciar
                return await this.verifyPlaylistLoaded(playlistPath);
            }

            // Verificar qué está reproduciendo actualmente VLC antes de cambiar
            try {
                const currentStatus = await this.getStatus();
                if (currentStatus && currentStatus.information && currentStatus.information.category &&
                    currentStatus.information.category.meta && currentStatus.information.category.meta.filename) {

                    const currentFile = currentStatus.information.category.meta.filename;
                    console.log(`ℹ️ Actualmente VLC está reproduciendo: ${currentFile}`);

                    // Usar la playlist activa actual
                    const { getActivePlaylist } = await import('../utils/activePlaylist.mjs');
                    const activePlaylist = await getActivePlaylist();

                    if (activePlaylist && activePlaylist.playlistName) {
                        console.log(`ℹ️ El archivo actual está en la playlist: ${activePlaylist.playlistName}`);

                        // Si ya está reproduciendo la playlist solicitada, verificamos
                        if (activePlaylist.playlistName === playlistName ||
                            activePlaylist.playlistPath === playlistPath) {
                            console.log(`ℹ️ VLC ya está reproduciendo la playlist solicitada`);

                            // Aún así, verificamos completamente
                            return await this.verifyPlaylistLoaded(playlistPath);
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error al verificar reproducción actual: ${error.message}`);
            }

            // Intentar limpiar playlist actual antes de cargar la nueva
            try {
                console.log('🧹 Limpiando playlist actual...');
                await this.request('pl_empty');
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (error) {
                console.warn(`⚠️ No se pudo limpiar la playlist actual: ${error.message}`);
                // Continuamos intentando cargar la nueva playlist
            }

            // Cargamos la nueva playlist y esperamos más tiempo para asegurar que se procese
            for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`📂 Cargando playlist (intento ${attempt}): ${playlistPath}`);
                try {
                    await this.request(`in_play&input=${encodeURIComponent(playlistPath)}`);

                    // Esperamos más tiempo para que VLC procese la playlist
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Verificamos si se cargó correctamente
                    const success = await this.verifyPlaylistLoaded(playlistPath);
                    if (success) {
                        return true;
                    }

                    console.log(`⚠️ Intento ${attempt} falló. ${attempt < 3 ? 'Reintentando...' : 'Último intento fallido.'}`);

                    // Si no se cargó, esperamos un poco más antes del siguiente intento
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error(`❌ Error al cargar playlist (intento ${attempt}): ${error.message}`);
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }

            // Si llegamos aquí, todos los intentos fallaron.
            // Como último recurso, intentar con reinicio forzado si aún no lo hemos hecho
            if (!forceRestart) {
                console.log('🔄 Todos los intentos fallaron. Intentando con reinicio forzado...');
                return await this.loadPlaylist(playlistPath, true);
            }

            return false;
        } catch (error) {
            console.error(`❌ Error al cargar playlist: ${error.message}`);

            // Si falla y no estamos ya intentando reiniciar, podemos intentar con reinicio
            if (!forceRestart) {
                console.log('🔄 Intentando cargar nuevamente con reinicio forzado...');
                return await this.loadPlaylist(playlistPath, true);
            }

            return false;
        }
    }

    /**
     * Verifica que una playlist se haya cargado correctamente en VLC
     * @param {string} playlistPath - Ruta de la playlist que debería estar cargada
     * @returns {Promise<boolean>} - Verdadero si se verificó que está cargada
     */
    async verifyPlaylistLoaded(playlistPath) {
        console.log('🔍 Verificando que la playlist se haya cargado correctamente...');

        // Extraer el nombre de la playlist del path
        const playlistDir = path.dirname(playlistPath);
        const playlistName = path.basename(playlistDir);
        console.log(`ℹ️ Verificando carga de playlist: ${playlistName}`);

        // Leer el contenido de la playlist para conocer sus archivos
        let playlistFiles = [];
        try {
            const playlistContent = await fsPromises.readFile(playlistPath, 'utf8');
            playlistFiles = playlistContent.split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => path.basename(line.trim()));

            console.log(`ℹ️ La playlist contiene ${playlistFiles.length} archivos`);
        } catch (error) {
            console.error(`❌ Error al leer el contenido de la playlist: ${error.message}`);
        }

        // Realizar hasta 5 intentos de verificación
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                // Verificar que VLC esté reproduciendo algo
                const status = await this.getStatus();

                if (status && status.information && status.information.category &&
                    status.information.category.meta && status.information.category.meta.filename) {

                    const currentFile = status.information.category.meta.filename;
                    console.log(`ℹ️ VLC está reproduciendo: ${currentFile}`);

                    // Verificar si el archivo pertenece a la playlist solicitada
                    const { getActivePlaylist } = await import('../utils/activePlaylist.mjs');
                    const activePlaylist = await getActivePlaylist();

                    if (activePlaylist && activePlaylist.playlistName) {
                        console.log(`ℹ️ El archivo actual está en la playlist: ${activePlaylist.playlistName}`);

                        // Verificar coincidencia con la playlist solicitada
                        if (activePlaylist.playlistName === playlistName ||
                            activePlaylist.playlistPath === playlistPath ||
                            playlistFiles.includes(currentFile)) {

                            console.log(`✅ Verificación exitosa (intento ${attempt}): VLC está reproduciendo archivo de la playlist solicitada`);
                            return true;
                        } else {
                            console.warn(`⚠️ VLC está reproduciendo un archivo, pero de otra playlist (${activePlaylist.playlistName})`);
                        }
                    }

                    // Si el nombre de archivo está en la lista de archivos de la playlist, es válido
                    if (playlistFiles.includes(currentFile)) {
                        console.log(`✅ Verificación exitosa (intento ${attempt}): Archivo encontrado en la playlist solicitada`);
                        return true;
                    }

                    console.log(`⚠️ Intento ${attempt}: VLC está reproduciendo un archivo que no pertenece a la playlist solicitada`);
                } else {
                    console.log(`⚠️ Intento ${attempt}: VLC no parece estar reproduciendo ningún archivo`);
                }

                // Si no está reproduciendo el archivo correcto, intentar forzar la carga nuevamente
                if (attempt < 5) {
                    console.log(`🔄 Intentando forzar la carga de la playlist (intento ${attempt})...`);
                    try {
                        // Limpiar playlist actual
                        await this.request('pl_empty');
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Cargar la playlist nuevamente
                        await this.request(`in_play&input=${encodeURIComponent(playlistPath)}`);
                        console.log('▶️ Enviada orden de reproducción de playlist...');

                        // Esperar antes del siguiente intento
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } catch (err) {
                        console.warn(`⚠️ Error al intentar reproducir: ${err.message}`);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error en verificación (intento ${attempt}): ${error.message}`);

                if (attempt < 5) {
                    // Esperar antes del siguiente intento
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        console.error('❌ No se pudo verificar que la playlist se haya cargado correctamente después de múltiples intentos');
        return false;
    }

    /**
     * Verifica si el proceso de VLC está en ejecución
     * @returns {boolean} true si el proceso está activo
     */
    isRunning() {
        return this.process !== null && this.process.exitCode === null;
    }

    /**
     * Realiza una petición al API HTTP de VLC
     * @param {string} command - Comando a enviar a VLC
     * @returns {Promise<Object>} - Respuesta de VLC
     */
    async request(command) {
        try {
            return await vlcRequest(command);
        } catch (error) {
            console.error(`Error en request VLC: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obtiene el estado actual de VLC
     * @returns {Promise<Object>} - Estado de VLC
     */
    async getStatus() {
        try {
            const status = await vlcRequest();

            // Procesar y enriquecer el estado recibido
            if (status && status.information && status.information.category) {
                // Guardar el archivo actual que se está reproduciendo para sincronización
                if (status.information.category.meta && status.information.category.meta.filename) {
                    this.currentFile = status.information.category.meta.filename;

                    // Intentar determinar a qué playlist pertenece este archivo
                    try {
                        const { getActivePlaylist } = await import('../utils/activePlaylist.mjs');
                        if (this.currentFile) {
                            const activePlaylist = await getActivePlaylist();

                            if (activePlaylist && activePlaylist.playlistName) {
                                console.log(`ℹ️ El archivo actual está en la playlist: ${activePlaylist.playlistName}`);

                                // Actualizar el estado del sistema para mantener consistencia
                                try {
                                    const { getSystemState, saveSystemState } = await import('../utils/systemState.mjs');
                                    const systemState = await getSystemState();

                                    // Verificar si hay discrepancia entre la playlist activa y lo que realmente se reproduce
                                    if (systemState &&
                                        systemState.activePlaylist &&
                                        (systemState.activePlaylist.playlistName !== activePlaylist.playlistName ||
                                            !systemState.activePlaylist.playlistPath)) {

                                        console.log(`⚠️ Detectada discrepancia en información de playlist activa. Actualizando...`);

                                        // Actualizar la información de la playlist activa
                                        systemState.activePlaylist = {
                                            ...systemState.activePlaylist,
                                            playlistName: activePlaylist.playlistName,
                                            playlistPath: activePlaylist.playlistPath,
                                            fileCount: activePlaylist.fileCount,
                                            currentIndex: activePlaylist.currentIndex
                                        };

                                        // Guardar el estado actualizado
                                        await saveSystemState(systemState);
                                        console.log(`✅ Estado del sistema actualizado con la playlist correcta`);
                                    }
                                } catch (err) {
                                    console.error(`❌ Error al sincronizar estado del sistema: ${err.message}`);
                                }
                            }
                        }
                    } catch (err) {
                        console.warn(`⚠️ No se pudo determinar la playlist: ${err.message}`);
                    }
                }
            }

            return status;
        } catch (error) {
            console.error(`Error al obtener estado de VLC: ${error.message}`);
            throw error;
        }
    }

    restart() {
        return new Promise(async (resolve) => {
            console.log('🔄 Reiniciando VLC (misma instancia)...');
            await this.stop();

            // Esperar antes de reiniciar
            console.log('⏳ Esperando antes de reiniciar VLC...');
            await new Promise(waitResolve => setTimeout(waitResolve, 1000));

            // Reiniciar VLC con la misma instancia
            const success = await this.start();

            if (success) {
                console.log('✅ VLC reiniciado correctamente');
                // Actualizar la referencia global para asegurar consistencia
                if (globalObj) {
                    globalObj.vlcPlayer = this;
                }
            } else {
                console.error('❌ Error al reiniciar VLC');
            }

            resolve(success);
        });
    }

    async pause() {
        try {
            await this.request(vlcCommands.pause);
            console.log('VLC: Orden de pausa enviada');
            return true;
        } catch (error) {
            console.error('Error al enviar orden de pausa a VLC:', error);
            return false;
        }
    }

    async next() {
        try {
            await this.request(vlcCommands.next);
            console.log('VLC: Orden de siguiente enviada');
            return true;
        } catch (error) {
            console.error('Error al enviar orden de siguiente a VLC:', error);
            return false;
        }
    }

    async previous() {
        try {
            await this.request(vlcCommands.previous);
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
            await this.request(`${vlcCommands.toggleAudio}&val=+10`);
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
            await this.request(`${vlcCommands.toggleAudio}&val=-10`);
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