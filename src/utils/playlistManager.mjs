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
        this.defaultPlaylistName = appConfig.app.defaultPlaylist;
        this.defaultPlaylistDir = path.join(this.playlistsDir, this.defaultPlaylistName);
        this.defaultPlaylistPath = path.join(this.defaultPlaylistDir, `${this.defaultPlaylistName}.m3u`);
        this.activePlaylistFile = path.join(process.cwd(), 'src/config/activePlaylist.json');
    }

    /**
     * Inicializa el sistema de playlists
     * - Crea directorios necesarios
     * - Verifica/crea la playlist por defecto
     * - Migra playlists de la estructura antigua si es necesario
     */
    async initialize() {
        try {
            // Asegurar que el directorio de playlists existe
            await fsPromises.mkdir(this.playlistsDir, { recursive: true });

            // Verificar si existe la playlist por defecto, crearla si no existe
            await this.ensureDefaultPlaylist();

            // Migrar playlists antiguas si es necesario
            await this.migrateOldPlaylists();

            console.log('✅ Sistema de playlists inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar el sistema de playlists:', error);
            return false;
        }
    }

    /**
     * Asegura que exista la playlist por defecto
     */
    async ensureDefaultPlaylist() {
        try {
            // Crear directorio de la playlist por defecto si no existe
            await fsPromises.mkdir(this.defaultPlaylistDir, { recursive: true });

            // Verificar si existe el archivo .m3u
            if (!fs.existsSync(this.defaultPlaylistPath)) {
                // Crear un archivo .m3u vacío
                await fsPromises.writeFile(this.defaultPlaylistPath, '#EXTM3U\n');
                console.log(`✅ Playlist por defecto creada en: ${this.defaultPlaylistPath}`);
            }

            return true;
        } catch (error) {
            console.error('❌ Error al crear playlist por defecto:', error);
            return false;
        }
    }

    /**
     * Migra playlists desde la estructura antigua a la nueva
     */
    async migrateOldPlaylists() {
        try {
            // Verificar si existen directorios antiguos
            const oldDirs = [
                './public/videosDefecto/playlistDefecto',
                './public/videos/playlist'
            ];

            for (const oldDir of oldDirs) {
                if (fs.existsSync(oldDir)) {
                    console.log(`Migrando playlists desde: ${oldDir}`);

                    // Si es el directorio de playlist por defecto
                    if (oldDir === './public/videosDefecto/playlistDefecto') {
                        await this.migrateDefaultPlaylist(oldDir);
                    } else {
                        // Migrar todas las playlists del directorio
                        await this.migratePlaylistDirectory(oldDir);
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Error al migrar playlists antiguas:', error);
            return false;
        }
    }

    /**
     * Migra la playlist por defecto desde la estructura antigua
     * @param {string} oldDir Directorio antiguo de la playlist por defecto
     */
    async migrateDefaultPlaylist(oldDir) {
        try {
            const oldPlaylistPath = path.join(oldDir, 'playlistDefecto.m3u');

            if (fs.existsSync(oldPlaylistPath)) {
                // Leer el contenido de la playlist
                const content = await fsPromises.readFile(oldPlaylistPath, 'utf8');

                // Obtener las líneas que no son comentarios
                const lines = content.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'));

                // Copiar los archivos a la nueva ubicación
                for (const line of lines) {
                    const fileName = path.basename(line.trim());
                    const oldFilePath = path.join(oldDir, fileName);
                    const newFilePath = path.join(this.defaultPlaylistDir, fileName);

                    if (fs.existsSync(oldFilePath)) {
                        await fsPromises.copyFile(oldFilePath, newFilePath);
                        console.log(`✅ Migrado: ${fileName}`);
                    }
                }

                // Crear la nueva playlist con los archivos migrados
                const newContent = '#EXTM3U\n' + lines
                    .map(line => path.basename(line.trim()))
                    .join('\n');

                await fsPromises.writeFile(this.defaultPlaylistPath, newContent);
                console.log(`✅ Playlist por defecto migrada correctamente`);
            }

            return true;
        } catch (error) {
            console.error('❌ Error al migrar playlist por defecto:', error);
            return false;
        }
    }

    /**
     * Migra todas las playlists desde un directorio antiguo
     * @param {string} oldDir Directorio antiguo de playlists
     */
    async migratePlaylistDirectory(oldDir) {
        try {
            const files = await fsPromises.readdir(oldDir);
            const directories = [];

            // Identificar subdirectorios (cada uno es una playlist)
            for (const file of files) {
                const fullPath = path.join(oldDir, file);
                const stats = await fsPromises.stat(fullPath);

                if (stats.isDirectory()) {
                    directories.push(file);
                }
            }

            // Migrar cada playlist encontrada
            for (const dir of directories) {
                const oldPlaylistDir = path.join(oldDir, dir);
                const newPlaylistDir = path.join(this.playlistsDir, dir);

                // Crear directorio de la nueva playlist
                await fsPromises.mkdir(newPlaylistDir, { recursive: true });

                // Buscar archivo .m3u
                const playlistFiles = await fsPromises.readdir(oldPlaylistDir);
                const m3uFiles = playlistFiles.filter(file => file.endsWith('.m3u'));

                if (m3uFiles.length > 0) {
                    const m3uFile = m3uFiles[0];
                    const oldM3uPath = path.join(oldPlaylistDir, m3uFile);
                    const newM3uPath = path.join(newPlaylistDir, m3uFile);

                    // Leer el contenido de la playlist
                    const content = await fsPromises.readFile(oldM3uPath, 'utf8');

                    // Obtener las líneas que no son comentarios
                    const lines = content.split('\n')
                        .filter(line => line.trim() && !line.startsWith('#'));

                    // Copiar los archivos a la nueva ubicación
                    for (const line of lines) {
                        const fileName = path.basename(line.trim());
                        const oldFilePath = path.join(oldPlaylistDir, fileName);
                        const newFilePath = path.join(newPlaylistDir, fileName);

                        if (fs.existsSync(oldFilePath)) {
                            await fsPromises.copyFile(oldFilePath, newFilePath);
                            console.log(`✅ Migrado: ${fileName} a ${newPlaylistDir}`);
                        }
                    }

                    // Crear la nueva playlist con los archivos migrados
                    const newContent = '#EXTM3U\n' + lines
                        .map(line => path.basename(line.trim()))
                        .join('\n');

                    await fsPromises.writeFile(newM3uPath, newContent);
                    console.log(`✅ Playlist ${dir} migrada correctamente`);
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Error al migrar directorio de playlists:', error);
            return false;
        }
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
            const m3uFiles = files.filter(file => file.endsWith('.m3u'));

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

            // Crear una versión temporal de la playlist con rutas absolutas correctas
            const tempPlaylistPath = `${playlistPath}.temp`;
            await fsPromises.writeFile(
                tempPlaylistPath,
                `#EXTM3U\n${videoFiles.map(vf => vf.filePath).join('\n')}\n`
            );

            return {
                name,
                path: tempPlaylistPath, // Usar la playlist temporal con rutas absolutas
                files: videoFiles,
                totalFiles: videoFiles.length,
                isDefault: name === this.defaultPlaylistName
            };
        } catch (error) {
            console.error(`❌ Error al obtener detalles de la playlist '${name}':`, error);
            return null; // Cambiar para retornar null en lugar de lanzar el error
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