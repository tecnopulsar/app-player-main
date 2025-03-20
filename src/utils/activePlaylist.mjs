import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { appConfig } from '../config/appConfig.mjs';

const activePlaylistFile = path.join(process.cwd(), 'src/config/activePlaylist.json');

/**
 * Obtiene la información de la playlist activa
 * @returns {Promise<Object>} Información de la playlist activa
 */
export async function getActivePlaylist() {
    try {
        // Verificar si el archivo existe
        if (!fs.existsSync(activePlaylistFile)) {
            // Si no existe, crear con la playlist por defecto
            const defaultPlaylist = {
                playlistName: "playlistDefecto",
                playlistPath: path.join(appConfig.paths.playlistDefecto, "playlistDefecto.m3u"),
                lastLoaded: null,
                isActive: true
            };
            await fsPromises.writeFile(activePlaylistFile, JSON.stringify(defaultPlaylist, null, 2));
            return defaultPlaylist;
        }

        // Leer el archivo
        const data = await fsPromises.readFile(activePlaylistFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al obtener la playlist activa:', error);
        throw error;
    }
}

/**
 * Actualiza la información de la playlist activa
 * @param {Object} playlistInfo Información de la nueva playlist activa
 * @returns {Promise<Object>} Información actualizada
 */
export async function updateActivePlaylist(playlistInfo) {
    try {
        const currentDate = new Date().toISOString();
        const updatedInfo = {
            ...playlistInfo,
            lastLoaded: currentDate,
            isActive: true
        };

        await fsPromises.writeFile(activePlaylistFile, JSON.stringify(updatedInfo, null, 2));
        return updatedInfo;
    } catch (error) {
        console.error('Error al actualizar la playlist activa:', error);
        throw error;
    }
} 