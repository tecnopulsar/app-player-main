import fs from 'fs';
import path from 'path';
import { appConfig } from '../config/appConfig.mjs';
import { exec } from 'child_process';
import playlistManager from '../utils/playlistManager.mjs';

/**
 * Servicio para gestionar las operaciones relacionadas con playlists
 */
class PlaylistService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializa el servicio de playlist
     */
    async initialize() {
        try {
            if (this.initialized) {
                return true;
            }

            // Inicializar el gestor de playlists
            await playlistManager.initialize();

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar el servicio de playlist:', error);
            return false;
        }
    }

    /**
     * Carga una playlist en VLC
     * @param {string} playlistName Nombre de la playlist a cargar
     * @returns {Promise<Object>} Información de la playlist cargada
     */
    async loadPlaylist(playlistName) {
        try {
            await this.initialize();

            // Obtener detalles de la playlist
            const playlistDetails = await playlistManager.getPlaylistDetails(playlistName);

            if (!playlistDetails) {
                throw new Error(`Playlist '${playlistName}' no encontrada`);
            }

            // Actualizar la playlist activa
            const activePlaylist = await playlistManager.updateActivePlaylist({
                playlistName: playlistDetails.name,
                playlistPath: playlistDetails.path
            });

            // Ejecutar VLC con la playlist
            this.runVlcWithPlaylist(playlistDetails.path);

            return activePlaylist;
        } catch (error) {
            console.error(`❌ Error al cargar playlist '${playlistName}':`, error);
            throw error;
        }
    }

    /**
     * Ejecuta VLC con la playlist especificada
     * @param {string} playlistPath Ruta al archivo de playlist
     * @returns {Promise<void>}
     */
    runVlcWithPlaylist(playlistPath) {
        return new Promise((resolve, reject) => {
            // Construir el comando de VLC
            const vlcCommand = `vlc "${playlistPath}" --fullscreen --no-video-deco --no-embedded-video --playlist-autostart --loop --no-video-title-show --mouse-hide-timeout=0 --qt-minimal-view`;

            // Ejecutar el comando
            exec(vlcCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error al ejecutar VLC:', error);
                    reject(error);
                    return;
                }

                console.log('VLC iniciado correctamente');
                resolve();
            });
        });
    }

    /**
     * Carga la playlist activa o la playlist por defecto si no hay ninguna activa
     * @returns {Promise<Object|null>} Información de la playlist cargada o null si no debe cargar ninguna
     */
    async loadActivePlaylist() {
        try {
            await this.initialize();

            // Obtener información de la playlist activa
            const activePlaylist = await playlistManager.getActivePlaylist();

            // Si no hay playlist configurada o la playlistPath es nula
            if (!activePlaylist || !activePlaylist.playlistPath || activePlaylist.playlistName === null) {
                console.log('⚠️ No hay playlist activa configurada');
                // No cargar ninguna playlist, retornar la información tal cual
                return activePlaylist;
            }

            // Verificar si la playlist existe
            const playlistDetails = await playlistManager.getPlaylistDetails(activePlaylist.playlistName);

            if (!playlistDetails) {
                console.log(`⚠️ La playlist '${activePlaylist.playlistName}' no existe. No se cargará ninguna playlist.`);
                // Actualizar la información para reflejar que la playlist no existe
                return {
                    ...activePlaylist,
                    playlistExists: false,
                    errorMessage: `La playlist '${activePlaylist.playlistName}' no existe`
                };
            }

            // Cargar la playlist activa
            return this.loadPlaylist(activePlaylist.playlistName);
        } catch (error) {
            console.error('❌ Error al procesar la playlist activa:', error);

            // En caso de error, no cargar ninguna playlist
            return {
                playlistName: null,
                playlistPath: null,
                lastLoaded: null,
                isActive: false,
                isDefault: false,
                error: true,
                errorMessage: error.message
            };
        }
    }

    /**
     * Obtiene la lista de todas las playlists disponibles
     * @returns {Promise<Array>} Lista de playlists
     */
    async getPlaylists() {
        try {
            await this.initialize();
            return playlistManager.getPlaylists();
        } catch (error) {
            console.error('❌ Error al obtener playlists:', error);
            throw error;
        }
    }

    /**
     * Obtiene el nombre de la playlist por defecto
     * @returns {string} Nombre de la playlist por defecto
     */
    getDefaultPlaylistName() {
        return playlistManager.defaultPlaylistName;
    }

    /**
     * Elimina una playlist específica
     * @param {string} playlistName Nombre de la playlist a eliminar
     * @param {boolean} force Si es true, permite eliminar la playlist por defecto (usar con precaución)
     * @returns {Promise<object>} Resultado de la operación
     */
    async deletePlaylist(playlistName, force = false) {
        try {
            await this.initialize();
            return playlistManager.deletePlaylist(playlistName, force);
        } catch (error) {
            console.error(`❌ Error al eliminar la playlist '${playlistName}':`, error);
            return {
                success: false,
                message: `Error al eliminar la playlist: ${error.message}`
            };
        }
    }

    /**
     * Restaura la playlist por defecto
     * @returns {Promise<boolean>} true si la operación fue exitosa
     */
    async restoreDefaultPlaylist() {
        try {
            await this.initialize();
            return playlistManager.restoreDefaultPlaylist();
        } catch (error) {
            console.error('❌ Error al restaurar la playlist por defecto:', error);
            throw error;
        }
    }

    /**
     * Obtiene la información de la playlist activa
     * @returns {Promise<Object>} Información de la playlist activa
     */
    async getActivePlaylist() {
        try {
            await this.initialize();
            return playlistManager.getActivePlaylist();
        } catch (error) {
            console.error('❌ Error al obtener la playlist activa:', error);
            throw error;
        }
    }
}

// Exportar una instancia única del servicio
const playlistService = new PlaylistService();
export default playlistService; 