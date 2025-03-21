import { setupDirectories } from '../utils/setupDirectories.js';
import playlistService from './playlistService.mjs';
import { getSystemState } from '../utils/systemState.mjs';

/**
 * Inicializa todos los componentes necesarios para el sistema de playlists
 * @returns {Promise<boolean>} True si la inicialización fue exitosa
 */
export async function initializePlaylistSystem() {
    try {
        // Crear directorios necesarios
        await setupDirectories();

        // Verificar que existe un estado del sistema
        await getSystemState();

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