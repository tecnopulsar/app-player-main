// ✅

import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { getConfig } from '../config/appConfig.mjs';

// Ruta del archivo de playlist activa
export const STATE_FILE_PATH = path.join(process.cwd(), 'src/config/systemState.json');

/** ✅
 * Inicializa las propiedades de activePlaylist dentro de systemState.json
 * sin eliminar otras configuraciones.
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function initializeActivePlaylist() {
    try {
        if (!fs.existsSync(STATE_FILE_PATH)) {
            console.error('❌ El archivo systemState.json no existe. No se puede inicializar la playlist.');
            return false;
        }

        // Leer el archivo actual
        const fileContent = await fsPromises.readFile(STATE_FILE_PATH, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // Verificar si la sección activePlaylist existe
        if (!jsonData.activePlaylist) {
            console.warn('⚠️ No existe la propiedad activePlaylist en systemState.json. Se agregará.');
        }

        // Inicializar las propiedades de activePlaylist sin modificar el resto del JSON
        jsonData.activePlaylist = {
            playlistName: null,
            playlistPath: null,
            lastLoaded: null,
            isActive: false,
            currentIndex: null,
            fileCount: null
        };

        // Escribir el archivo actualizado
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(jsonData, null, 2));
        console.log(`✅ Se inicializó la sección activePlaylist en systemState.json`);
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar activePlaylist en systemState.json:', error);
        return false;
    }
}

/** ✅
 * Verifica si el archivo systemState.json existe
 * y si contiene una playlist activa con valores válidos.
 * @returns {Promise<boolean>} true si el archivo y la playlist activa son válidos.
 */
export async function activePlaylistIsValid() {
    try {
        if (!fs.existsSync(STATE_FILE_PATH)) {
            console.error('❌ El archivo systemState.json no existe.');
            return false;
        }

        const fileContent = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        if (
            jsonData.activePlaylist &&
            jsonData.activePlaylist.playlistName &&
            jsonData.activePlaylist.playlistPath
        ) {
            return true;
        } else {
            console.error('❌ La playlist activa no es válida o faltan propiedades.');
            return false;
        }
    } catch (error) {
        console.error('❌ Error al verificar la playlist activa:', error);
        return false;
    }
}

/** ✅ 
 * Actualiza la información de la playlist activa
 * @param {Object} data - Datos de la playlist activa
 * @returns {Promise<Object>} La playlist actualizada o null si hay un error
 */
export async function updateActivePlaylist(data) {
    try {
        // 1. Leer el archivo systemState.json
        const fileContent = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
        const systemState = JSON.parse(fileContent);

        // 2. Obtener la playlist actual (si existe)
        const currentPlaylist = systemState.activePlaylist || {};

        // 3. Crear el objeto de playlist actualizado
        const updatedPlaylist = {
            ...currentPlaylist, // Copiar las propiedades existentes de la playlist actual
            ...data, // Sobrescribir con los nuevos datos proporcionados
            lastLoaded: data.lastLoaded || new Date().toISOString(), // Usar la fecha proporcionada o la actual
            isActive: true, // Forzar a que la playlist esté activa
            currentIndex: data.currentIndex || 1, // Usar el índice proporcionado o 1 por defecto
            fileCount: data.fileCount || 1 // Usar el conteo de archivos proporcionado o 0 por defecto
        };

        // 4. Actualizar solo la propiedad activePlaylist en el estado del sistema
        systemState.activePlaylist = updatedPlaylist;

        // 5. Guardar el archivo actualizado
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(systemState, null, 2));
        console.log(`✅ Playlist activa actualizada: ${updatedPlaylist.playlistName}`);

        return updatedPlaylist;

    } catch (error) {
        console.error('❌ Error al actualizar la playlist activa:', error);
        return null;
    }
}

/** ✅
 * Obtiene la información de la playlist activa desde systemState.json.
 * @returns {Promise<Object|null>} Retorna la playlist activa o null si no existe.
 */
export async function getActivePlaylist() {
    try {
        if (!fs.existsSync(STATE_FILE_PATH)) {
            console.error('❌ El archivo systemState.json no existe.');
            return null;
        }

        // Leer el archivo y convertirlo en JSON
        const fileContent = await fsPromises.readFile(STATE_FILE_PATH, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // Verificar si la propiedad activePlaylist está presente
        if (!jsonData.activePlaylist) {
            console.warn('⚠️ No se encontró la propiedad activePlaylist en systemState.json.');
            return null;
        }

        return jsonData.activePlaylist;
    } catch (error) {
        console.error('❌ Error al obtener la playlist activa:', error);
        return null;
    }
}

/** ✅
 * Verifica que el archivo de playlist activa exista y lo inicializa si es necesario
 * @returns {Promise<boolean>} true si el archivo existe o se creó correctamente
 */
export async function verifyActivePlaylistFile() {
    try {
        // Verificar si el archivo existe
        if (!fs.existsSync(STATE_FILE_PATH)) {
            console.log('⚠️ El archivo systemState.json no existe. Creando...');

            // Crear el directorio si no existe
            const dir = path.dirname(STATE_FILE_PATH);
            if (!fs.existsSync(dir)) {
                await fsPromises.mkdir(dir, { recursive: true });
            }

            // Crear el archivo con la estructura inicial
            const initialState = {
                activePlaylist: {
                    playlistName: null,
                    playlistPath: null,
                    lastLoaded: null,
                    isActive: false,
                    currentIndex: null,
                    fileCount: null
                },
                defaultPlaylist: {
                    playlistName: null,
                    playlistPath: null
                }
            };

            await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(initialState, null, 2));
            console.log('✅ Archivo systemState.json creado correctamente');
            return true;
        }

        // Si el archivo existe, verificar que tenga la estructura correcta
        const fileContent = await fsPromises.readFile(STATE_FILE_PATH, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        let needsUpdate = false;

        // Verificar que exista la propiedad activePlaylist
        if (!jsonData.activePlaylist) {
            console.log('⚠️ Estructura de activePlaylist no encontrada. Inicializando...');
            jsonData.activePlaylist = {
                playlistName: null,
                playlistPath: null,
                lastLoaded: null,
                isActive: false,
                currentIndex: null,
                fileCount: null
            };
            needsUpdate = true;
        }

        // Verificar que exista la propiedad defaultPlaylist
        if (!jsonData.defaultPlaylist) {
            console.log('⚠️ Estructura de defaultPlaylist no encontrada. Inicializando...');
            jsonData.defaultPlaylist = {
                playlistName: null,
                playlistPath: null
            };
            needsUpdate = true;
        }

        // Guardar el archivo si se realizaron cambios
        if (needsUpdate) {
            await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(jsonData, null, 2));
            console.log('✅ Archivo systemState.json actualizado con las estructuras requeridas');
        }

        return true;
    } catch (error) {
        console.error('❌ Error al verificar/crear el archivo de playlist activa:', error);
        return false;
    }
}

// AUXILIAR - Función para obtener la ruta de una playlist por nombre sino null
export async function getPlaylistPath(playlistName) {
    if (!playlistName) return null;

    const config = getConfig();
    const playlistsDir = config.paths.playlists;
    const playlistPath = path.join(playlistsDir, playlistName, `${playlistName}.m3u`);

    if (fs.existsSync(playlistPath)) {
        return playlistPath;
    }

    return null;
}

/** ✅
 * Obtiene la información de la playlist por defecto desde systemState.json.
 * @returns {Promise<Object|null>} Retorna la playlist por defecto o null si no existe.
 */
export async function getDefaultPlaylist() {
    try {
        if (!fs.existsSync(STATE_FILE_PATH)) {
            console.error('❌ El archivo systemState.json no existe.');
            return null;
        }

        // Leer el archivo y convertirlo en JSON
        const fileContent = await fsPromises.readFile(STATE_FILE_PATH, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // Verificar si la propiedad defaultPlaylist está presente
        if (!jsonData.defaultPlaylist) {
            console.warn('⚠️ No se encontró la propiedad defaultPlaylist en systemState.json.');
            return null;
        }

        return jsonData.defaultPlaylist;
    } catch (error) {
        console.error('❌ Error al obtener la playlist por defecto:', error);
        return null;
    }
}

/** ✅
 * Actualiza la información de la playlist por defecto en systemState.json
 * @param {Object} data - Datos de la playlist por defecto (playlistName y playlistPath)
 * @returns {Promise<Object|null>} La playlist por defecto actualizada o null si hay un error
 */
export async function updateDefaultPlaylist(data) {
    try {
        if (!data.playlistName || !data.playlistPath) {
            console.error('❌ Se requieren playlistName y playlistPath para actualizar la playlist por defecto');
            return null;
        }

        // 1. Leer el archivo systemState.json
        const fileContent = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
        const systemState = JSON.parse(fileContent);

        // 2. Actualizar la propiedad defaultPlaylist
        systemState.defaultPlaylist = {
            playlistName: data.playlistName,
            playlistPath: data.playlistPath
        };

        // 3. Guardar el archivo actualizado
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(systemState, null, 2));
        console.log(`✅ Playlist por defecto actualizada: ${data.playlistName}`);

        return systemState.defaultPlaylist;
    } catch (error) {
        console.error('❌ Error al actualizar la playlist por defecto:', error);
        return null;
    }
}
