import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { loadSystemState } from './systemState.mjs';

/**
 * Verifica si se ha migrado correctamente la información de activePlaylist.json a systemState.json
 * y elimina el archivo original si ya no es necesario
 * @returns {Promise<boolean>} true si la migración está completa o el archivo ya no existe
 */
async function removeActivePlaylistFile() {
    try {
        const oldPlaylistPath = path.join(process.cwd(), 'src/config/activePlaylist.json');

        // Si el archivo ya no existe, la migración está completa
        if (!fs.existsSync(oldPlaylistPath)) {
            console.log('✅ No existe archivo activePlaylist.json, la migración está completa');
            return true;
        }

        // Verificar que systemState.json contiene la información correcta
        const systemState = await loadSystemState();
        if (!systemState || !systemState.activePlaylist) {
            console.log('⚠️ No se encontró información de activePlaylist en systemState.json, no se eliminará el archivo original');
            return false;
        }

        // Leer el archivo original para verificar que la información coincide
        const originalData = await fsPromises.readFile(oldPlaylistPath, 'utf8');
        const originalPlaylist = JSON.parse(originalData);

        // Verificar que la información crítica coincide
        if (originalPlaylist.playlistName !== systemState.activePlaylist.playlistName) {
            console.log('⚠️ La información de la playlist en systemState.json no coincide con activePlaylist.json, no se eliminará el archivo original');
            return false;
        }

        // Si todo está bien, eliminar el archivo original
        await fsPromises.unlink(oldPlaylistPath);
        console.log('✅ Archivo activePlaylist.json eliminado correctamente, migración completa');
        return true;
    } catch (error) {
        console.error(`❌ Error al eliminar archivo activePlaylist.json: ${error.message}`);
        return false;
    }
}

/**
 * Verifica si la información de la playlist activa está disponible en systemState.json
 * @returns {Promise<boolean>} true si la información está disponible
 */
async function verifyActivePlaylistMigration() {
    try {
        const systemState = await loadSystemState();
        if (!systemState || !systemState.activePlaylist) {
            console.log('⚠️ No se encontró información de activePlaylist en systemState.json');
            return false;
        }

        console.log('✅ La información de activePlaylist está correctamente integrada en systemState.json');
        return true;
    } catch (error) {
        console.error(`❌ Error al verificar migración de activePlaylist: ${error.message}`);
        return false;
    }
}

export {
    removeActivePlaylistFile,
    verifyActivePlaylistMigration
}; 