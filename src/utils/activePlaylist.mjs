import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';

/**
 * Verificación explícita del archivo activePlaylist.json
 * @returns {Promise<boolean>} true si el archivo está verificado correctamente
 */
async function verifyActivePlaylistFile() {
    try {
        // Verificar si el archivo existe, crearlo si no
        const exists = await activePlaylistExists();

        if (!exists) {
            console.log('⚠️ No se encontró archivo de playlist activa, creando uno nuevo...');
            await createEmptyActivePlaylist();
            console.log('ℹ️ No hay playlist configurada. No se iniciará VLC.');
            return false;
        } else {
            console.log('✅ Archivo de playlist activa verificado correctamente');
            return true;
        }
    } catch (error) {
        console.error('❌ Error al verificar/crear archivo de playlist activa:', error);
        return false;
    }
}

/**
 * Obtiene la información de la playlist activa
 * @returns {Promise<Object|null>} Información de la playlist activa o null si hay error
 */
async function getActivePlaylist() {
    try {
        const configDir = path.join(process.cwd(), 'src/config');
        const activePlaylistFile = path.join(configDir, 'activePlaylist.json');

        // Asegurar que el directorio existe
        if (!fs.existsSync(configDir)) {
            console.log(`⚠️ Creando directorio de configuración: ${configDir}`);
            await fsPromises.mkdir(configDir, { recursive: true });
        }

        // Verificar si el archivo existe
        if (!fs.existsSync(activePlaylistFile)) {
            console.log('⚠️ No se encontró el archivo de playlist activa, creando uno nuevo...');
            await createEmptyActivePlaylist();
            // Leer el archivo recién creado
            const data = await fsPromises.readFile(activePlaylistFile, 'utf8');
            return JSON.parse(data);
        }

        // Leer el archivo
        const data = await fsPromises.readFile(activePlaylistFile, 'utf8');
        const activePlaylist = JSON.parse(data);

        // Verificar si hay datos válidos
        if (!activePlaylist || activePlaylist.playlistName === null) {
            console.log('ℹ️ No hay playlist configurada actualmente');
            return activePlaylist;
        }

        // Si la ruta de la playlist es nula, no intentar construir una ruta
        if (!activePlaylist.playlistPath) {
            return activePlaylist;
        }

        return activePlaylist;
    } catch (error) {
        console.error('❌ Error al obtener la playlist activa:', error);
        // Crear un archivo con datos nulos si hay un error
        await createEmptyActivePlaylist();
        return null;
    }
}

/**
 * Actualiza la información de la playlist activa
 * @param {Object} playlistInfo Información de la nueva playlist activa
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
async function updateActivePlaylist(playlistInfo) {
    try {
        const configDir = path.join(process.cwd(), 'src/config');
        const activePlaylistFile = path.join(configDir, 'activePlaylist.json');

        // Asegurar que el directorio existe
        if (!fs.existsSync(configDir)) {
            await fsPromises.mkdir(configDir, { recursive: true });
            console.log(`✅ Directorio creado: ${configDir}`);
        }

        const currentDate = new Date().toISOString();
        const updatedInfo = {
            ...playlistInfo,
            lastLoaded: currentDate,
            isActive: true,
            isDefault: playlistInfo.isDefault || false
        };

        await fsPromises.writeFile(activePlaylistFile, JSON.stringify(updatedInfo, null, 2));
        console.log(`✅ Archivo de playlist activa actualizado: ${activePlaylistFile}`);
        return true;
    } catch (error) {
        console.error('❌ Error al actualizar la playlist activa:', error);
        return false;
    }
}

/**
 * Verifica si la playlist activa existe
 * @returns {Promise<boolean>} true si existe un archivo de playlist activa
 */
async function activePlaylistExists() {
    try {
        const activePlaylistFile = path.join(process.cwd(), 'src/config/activePlaylist.json');
        return fs.existsSync(activePlaylistFile);
    } catch (error) {
        console.error('❌ Error al verificar si existe la playlist activa:', error);
        return false;
    }
}

/**
 * Crea un archivo de playlist activa con datos nulos
 * @returns {Promise<boolean>} true si se creó correctamente
 */
async function createEmptyActivePlaylist() {
    try {
        const configDir = path.join(process.cwd(), 'src/config');
        const activePlaylistFile = path.join(configDir, 'activePlaylist.json');

        // Asegurar que el directorio existe
        if (!fs.existsSync(configDir)) {
            await fsPromises.mkdir(configDir, { recursive: true });
            console.log(`✅ Directorio creado: ${configDir}`);
        }

        const emptyPlaylist = {
            playlistName: null,
            playlistPath: null,
            lastLoaded: null,
            isActive: false,
            isDefault: false
        };

        await fsPromises.writeFile(activePlaylistFile, JSON.stringify(emptyPlaylist, null, 2));
        console.log(`✅ Archivo de playlist activa creado con datos nulos: ${activePlaylistFile}`);
        return true;
    } catch (error) {
        console.error('❌ Error al crear archivo de playlist activa vacío:', error);
        return false;
    }
}

export {
    getActivePlaylist,
    updateActivePlaylist,
    activePlaylistExists,
    createEmptyActivePlaylist,
    verifyActivePlaylistFile
}; 