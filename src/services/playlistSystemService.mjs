import { setupDirectories } from '../utils/setupDirectories.js';
import playlistService from './playlistService.mjs';
import { verifyActivePlaylistFile } from '../utils/activePlaylist.mjs';

/**
 * Inicializa todos los componentes necesarios para el sistema de playlists
 * @returns {Promise<boolean>} True si la inicialización fue exitosa
 */
export async function initializePlaylistSystem() {
    try {
        // Verificar archivo de playlist activa
        await verifyActivePlaylistFile();

        // Crear directorios necesarios
        await setupDirectories();

        // Inicializar el servicio de playlist
        await playlistService.initialize();

        return true;
    } catch (error) {
        console.error('❌ Error al inicializar el sistema de playlists:', error);
        return false;
    }
}

export default {
    initializePlaylistSystem
}; 