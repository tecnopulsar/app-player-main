import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { appConfig } from '../config/appConfig.mjs';

/**
 * Clase para gestionar playlists en la nueva estructura unificada
 */
class PlaylistManager {
    constructor() {
        this.playlistsDir = appConfig.paths.playlists;
        this.activePlaylistFile = path.join(process.cwd(), 'src/config/systemState.json');
    }

    /**
     * Obtiene la información de la playlist activa
     * @returns {Promise<Object>} Información de la playlist activa
     */
    async getActivePlaylist() {
        try {
            // Verificar si el archivo existe
            if (!fs.existsSync(this.activePlaylistFile)) {
                // Si no existe, crear archivo con datos nulos
                const emptyPlaylist = {
                    playlistName: null,
                    playlistPath: null,
                    lastLoaded: null,
                    isActive: false,
                    isDefault: false
                };
                await fsPromises.writeFile(this.activePlaylistFile, JSON.stringify(emptyPlaylist, null, 2));
                console.log(`✅ Archivo de playlist activa creado con valores iniciales nulos`);
                return emptyPlaylist;
            }

            // Leer el archivo
            const data = await fsPromises.readFile(this.activePlaylistFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Error al obtener la playlist activa:', error);
            throw error;
        }
    }

    /**
     * Actualiza la información de la playlist activa
     * @param {Object} playlistInfo Información de la nueva playlist activa
     * @returns {Promise<Object>} Información actualizada
     */
    async updateActivePlaylist(playlistInfo) {
        try {
            const currentDate = new Date().toISOString();
            const updatedInfo = {
                ...playlistInfo,
                lastLoaded: currentDate,
                isActive: true,
                isDefault: playlistInfo.playlistName === this.defaultPlaylistName
            };

            await fsPromises.writeFile(this.activePlaylistFile, JSON.stringify(updatedInfo, null, 2));
            return updatedInfo;
        } catch (error) {
            console.error('❌ Error al actualizar la playlist activa:', error);
            throw error;
        }
    }

    /**
     * Obtiene la lista de todas las playlists disponibles
     * @returns {Promise<Array>} Lista de playlists
     */
    async getPlaylists() {
        try {
            // Verificar si el directorio existe
            if (!fs.existsSync(this.playlistsDir)) {
                return [];
            }

            const dirs = await fsPromises.readdir(this.playlistsDir);
            const playlists = [];

            for (const dir of dirs) {
                const dirPath = path.join(this.playlistsDir, dir);
                const stats = await fsPromises.stat(dirPath);

                if (stats.isDirectory()) {
                    // Verificar si hay un archivo .m3u en el directorio
                    const files = await fsPromises.readdir(dirPath);
                    const m3uFiles = files.filter(file => file.endsWith('.m3u'));

                    if (m3uFiles.length > 0) {
                        const playlistDetails = await this.getPlaylistDetails(dir);

                        if (playlistDetails) {
                            playlists.push({
                                name: dir,
                                files: playlistDetails.files.length,
                                created: stats.birthtime,
                                path: playlistDetails.path,
                                isDefault: dir === this.defaultPlaylistName
                            });
                        }
                    }
                }
            }

            return playlists;
        } catch (error) {
            console.error('❌ Error al obtener playlists:', error);
            throw error;
        }
    }

    /**
     * Obtiene detalles de una playlist específica
     * @param {string} name Nombre de la playlist
     * @returns {Promise<Object|null>} Detalles de la playlist o null si no existe
     */
    async getPlaylistDetails(name) {
        try {
            // Si el nombre es null, retornar null directamente
            if (name === null) {
                return null;
            }

            const playlistDir = path.join(this.playlistsDir, name);

            // Verificar si el directorio existe
            if (!fs.existsSync(playlistDir)) {
                return null;
            }

            const files = await fsPromises.readdir(playlistDir);
            const m3uFiles = files.filter(file => file.endsWith('.m3u') && !file.endsWith('.m3u.temp'));

            if (m3uFiles.length === 0) {
                return null;
            }

            const playlistPath = path.join(playlistDir, m3uFiles[0]);
            const content = await fsPromises.readFile(playlistPath, 'utf8');

            // Parsear el contenido de la playlist
            const lines = content.split('\n');
            const videoFiles = lines
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => {
                    // Si el archivo tiene una ruta absoluta, usar solo el nombre de archivo
                    const fileName = path.basename(line.trim());
                    // Construir la ruta absoluta correcta para el archivo
                    const filePath = path.join(playlistDir, fileName);
                    return { fileName, filePath };
                });

            // Ya no crear archivo temporal, usar directamente el archivo .m3u original
            // Actualizar el archivo .m3u si es necesario para asegurar que contiene solo nombres de archivo
            // Verificar primero si hay rutas completas en lugar de solo nombres de archivo
            const needsUpdate = lines.some(line => {
                if (line.trim() && !line.startsWith('#')) {
                    const fileName = path.basename(line.trim());
                    return line.trim() !== fileName; // Si no son iguales, hay una ruta
                }
                return false;
            });

            if (needsUpdate) {
                console.log(`⚠️ Actualizando archivo de playlist ${playlistPath} para usar solo nombres de archivo`);
                // Reescribir el archivo .m3u con solo nombres de archivo
                await fsPromises.writeFile(
                    playlistPath,
                    `#EXTM3U\n${videoFiles.map(vf => vf.fileName).join('\n')}\n`
                );
            }

            return {
                name,
                path: playlistPath, // Usar el archivo original, no uno temporal
                files: videoFiles,
                totalFiles: videoFiles.length
            };
        } catch (error) {
            console.error(`❌ Error al obtener detalles de la playlist '${name}':`, error);
            throw error;
        }
    }

    /**
     * Elimina una playlist específica
     * @param {string} name Nombre de la playlist
     * @param {boolean} force Si es true, permite eliminar la playlist por defecto (usar con precaución)
     * @returns {Promise<object>} Resultado de la operación: {success, message}
     */
    async deletePlaylist(name, force = false) {
        try {
            // No permitir eliminar la playlist por defecto sin forzar
            if (name === this.defaultPlaylistName && !force) {
                console.warn('⚠️ Intento de eliminar la playlist por defecto sin confirmación');
                return {
                    success: false,
                    message: 'No se puede eliminar la playlist por defecto sin confirmación explícita'
                };
            }

            const playlistDir = path.join(this.playlistsDir, name);

            // Verificar si el directorio existe
            if (!fs.existsSync(playlistDir)) {
                return {
                    success: false,
                    message: `La playlist '${name}' no existe`
                };
            }

            // Si se está eliminando la playlist por defecto con force=true, mostrar advertencia
            if (name === this.defaultPlaylistName && force) {
                console.warn('⚠️ ELIMINANDO PLAYLIST POR DEFECTO - Acción forzada explícitamente');
            }

            await fsPromises.rm(playlistDir, { recursive: true, force: true });
            console.log(`✅ Playlist '${name}' eliminada correctamente`);

            return {
                success: true,
                message: `Playlist '${name}' eliminada correctamente`
            };
        } catch (error) {
            console.error(`❌ Error al eliminar la playlist '${name}':`, error);
            return {
                success: false,
                message: `Error al eliminar la playlist: ${error.message}`
            };
        }
    }

    /**
     * Restaura la playlist por defecto a su estado original
     * @returns {Promise<boolean>} true si la operación fue exitosa
     */
    async restoreDefaultPlaylist() {
        try {
            // Eliminar directorio de la playlist por defecto si existe
            if (fs.existsSync(this.defaultPlaylistDir)) {
                await fsPromises.rm(this.defaultPlaylistDir, { recursive: true, force: true });
            }

            // Crear nuevamente la playlist por defecto
            await this.ensureDefaultPlaylist();

            console.log('✅ Playlist por defecto restaurada correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al restaurar playlist por defecto:', error);
            return false;
        }
    }
}

// Exportar una instancia única del manager
const playlistManager = new PlaylistManager();
export default playlistManager; 