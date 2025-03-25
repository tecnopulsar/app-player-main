/** ✅
 * @file playlistEndpoints.mjs
 * @description Define las rutas para la gestión de playlists
 * @module routes/playlistEndpoints
 * 
 * @requires express - Framework web para Node.js
/*
// Obtener todas las playlists
GET /api/active-playlist/all

// Eliminar todas excepto la activa
DELETE /api/active-playlist/purge?keepActive=true

// Eliminar absolutamente todas
DELETE /api/active-playlist/purge
*/

import { Router } from 'express';
import { getActivePlaylist, updateActivePlaylist } from '../utils/activePlaylist.mjs';
import { VLCPlayer } from '../lib/vlcPlayer.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { getSystemState } from '../utils/systemState.mjs';
import path from 'path';
import { getConfig } from '../config/appConfig.mjs';

// Crear el router
const router = Router();

/**
 * @swagger
 * /api/active-playlist/all:
 *   get:
 *     summary: Obtiene todas las playlists disponibles
 *     responses:
 *       200:
 *         description: Lista de todas las playlists encontradas
 *       500:
 *         description: Error al buscar playlists
 */
router.get('/all', async (req, res) => {
    try {
        const config = getConfig();
        const playlistsDir = config.paths.playlists;

        // Leer el directorio de playlists
        const playlistFolders = await fsPromises.readdir(playlistsDir, { withFileTypes: true });

        // Filtrar solo directorios que contengan archivos .m3u
        const playlists = await Promise.all(
            playlistFolders
                .filter(dirent => dirent.isDirectory())
                .map(async dirent => {
                    const playlistName = dirent.name;
                    const playlistPath = path.join(playlistsDir, playlistName, `${playlistName}.m3u`);

                    try {
                        // Verificar que existe el archivo .m3u
                        await fsPromises.access(playlistPath);

                        // Contar archivos en la playlist
                        const content = await fsPromises.readFile(playlistPath, 'utf8');
                        const fileCount = content.split('\n')
                            .filter(line => line.trim() && !line.startsWith('#'))
                            .length;

                        return {
                            name: playlistName,
                            path: playlistPath,
                            fileCount,
                            lastModified: (await fsPromises.stat(playlistPath)).mtime
                        };
                    } catch {
                        return null; // Ignorar directorios sin archivo .m3u válido
                    }
                })
        );

        // Filtrar resultados nulos y ordenar por nombre
        const validPlaylists = playlists.filter(p => p !== null)
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            success: true,
            playlists: validPlaylists,
            count: validPlaylists.length
        });
    } catch (error) {
        console.error('Error al obtener todas las playlists:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las playlists',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/active-playlist/purge:
 *   delete:
 *     summary: Elimina todas las playlists (excepto la activa si se especifica)
 *     parameters:
 *       - in: query
 *         name: keepActive
 *         schema:
 *           type: boolean
 *         description: Si se debe mantener la playlist activa actual
 *     responses:
 *       200:
 *         description: Resultado de la operación de eliminación
 *       500:
 *         description: Error al eliminar playlists
 */
router.delete('/all', async (req, res) => {
    try {
        const { keepActive } = req.query;
        const config = getConfig();
        const playlistsDir = config.paths.playlists;

        // Obtener playlist activa actual si keepActive es true
        let activePlaylistPath = null;
        if (keepActive === 'true') {
            const activePlaylist = await getActivePlaylist();
            activePlaylistPath = activePlaylist?.playlistPath;
        }

        // Leer todas las playlists
        const playlistFolders = await fsPromises.readdir(playlistsDir, { withFileTypes: true });

        // Procesar eliminación
        const deletionResults = await Promise.all(
            playlistFolders
                .filter(dirent => dirent.isDirectory())
                .map(async dirent => {
                    const playlistName = dirent.name;
                    const playlistPath = path.join(playlistsDir, playlistName, `${playlistName}.m3u`);

                    // Verificar si debemos saltar la playlist activa
                    if (activePlaylistPath && playlistPath === activePlaylistPath) {
                        return { name: playlistName, status: 'kept', reason: 'active playlist' };
                    }

                    try {
                        // Eliminar todo el directorio de la playlist
                        await fsPromises.rm(path.join(playlistsDir, playlistName), {
                            recursive: true,
                            force: true
                        });
                        return { name: playlistName, status: 'deleted' };
                    } catch (error) {
                        return {
                            name: playlistName,
                            status: 'failed',
                            reason: error.message
                        };
                    }
                })
        );

        // Contar resultados
        const deletedCount = deletionResults.filter(r => r.status === 'deleted').length;
        const keptCount = deletionResults.filter(r => r.status === 'kept').length;
        const failedCount = deletionResults.filter(r => r.status === 'failed').length;

        res.json({
            success: true,
            message: `Eliminadas ${deletedCount} playlists (${keptCount} conservadas, ${failedCount} fallos)`,
            results: deletionResults,
            counts: {
                deleted: deletedCount,
                kept: keptCount,
                failed: failedCount
            }
        });
    } catch (error) {
        console.error('Error al eliminar playlists:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar playlists',
            error: error.message
        });
    }
});


// Función para obtener la ruta de una playlist por nombre
async function getPlaylistPath(playlistName) {
    if (!playlistName) return null;

    const config = getConfig();
    const playlistsDir = config.paths.playlists;
    const playlistPath = path.join(playlistsDir, playlistName, `${playlistName}.m3u`);

    if (fs.existsSync(playlistPath)) {
        return playlistPath;
    }

    return null;
}

// Acceso seguro a global
let global;
try {
    // En un entorno ESM, no podemos usar require directamente
    const electron = await import('electron');
    global = electron.default;
} catch (e) {
    console.log('ℹ️ Módulo Electron no disponible en este contexto. Esto es normal en un entorno de servidor.');
    global = { mainWindow: null, vlcPlayer: null };
}

let vlcInstance = null;

/**
 * @swagger
 * /api/active-playlist:
 *   get:
 *     summary: Obtiene la información de la playlist actualmente activa
 */
router.get('/', async (req, res) => {
    try {
        const activePlaylist = await getActivePlaylist();
        res.json({
            success: true,
            activePlaylist
        });
    } catch (error) {
        console.error('Error al obtener la playlist activa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la playlist activa',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/active-playlist:
 *   post:
 *     summary: Actualiza la playlist activa
 *     parameters:
 *       - name: playlistName
 *         in: body
 *         required: true
 *         type: string
 *         description: Nombre de la playlist a establecer como activa
 */
router.post('/', async (req, res) => {
    console.log('📝 POST /api/active-playlist - Estableciendo playlist activa:', req.body);
    try {
        // Validación básica
        const { playlistName } = req.body;

        if (!playlistName) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el nombre de la playlist'
            });
        }

        // Obtener los datos de la playlist desde el sistema de archivos
        const playlistPath = await getPlaylistPath(playlistName);

        if (!playlistPath || !fs.existsSync(playlistPath)) {
            return res.status(404).json({
                success: false,
                message: `Playlist '${playlistName}' no encontrada en el sistema`
            });
        }

        // Contar archivos en la playlist
        let fileCount = 0;
        try {
            const playlistContent = await fsPromises.readFile(playlistPath, 'utf8');
            // Contar líneas que no sean comentarios o vacías
            fileCount = playlistContent.split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .length;
        } catch (err) {
            console.error(`Error al leer el contenido de la playlist: ${err.message}`);
        }

        // Obtener datos actuales de la playlist activa si existe
        let currentActivePlaylist = {
            playlistName: null,
            playlistPath: null,
            currentIndex: 0,
            fileCount: 0,
            isDefault: false,
            lastLoaded: null
        };

        try {
            // Primero verificamos si hay una playlist activa en el estado
            const systemState = await getSystemState();
            if (systemState && systemState.activePlaylist) {
                currentActivePlaylist = systemState.activePlaylist;
            }
        } catch (err) {
            console.error(`Error al obtener la playlist activa actual: ${err.message}`);
        }

        // Actualizar la playlist activa con todos los datos necesarios
        await updateActivePlaylist({
            playlistName,
            playlistPath,
            // Mantener el índice actual si estamos actualizando la misma playlist
            currentIndex: playlistName === currentActivePlaylist.playlistName ?
                currentActivePlaylist.currentIndex : 0,
            fileCount,
            // Por defecto no es la playlist por defecto a menos que se indique lo contrario
            isDefault: req.body.isDefault !== undefined ?
                req.body.isDefault : currentActivePlaylist.isDefault,
            // Actualizar timestamp
            lastLoaded: new Date().toISOString()
        });

        // Verificar que la información se guardó correctamente en systemState
        try {
            const { getSystemState } = await import('../utils/systemState.mjs');
            const systemState = await getSystemState();

            if (systemState && systemState.activePlaylist) {
                // Verificar que playlistPath se guardó correctamente
                if (!systemState.activePlaylist.playlistPath && playlistPath) {
                    console.warn(`⚠️ playlistPath no se guardó correctamente en systemState. Forzando actualización...`);

                    // Forzar actualización explícita del estado
                    const { saveSystemState } = await import('../utils/systemState.mjs');
                    systemState.activePlaylist.playlistPath = playlistPath;
                    await saveSystemState(systemState);

                    console.log(`✅ Actualización forzada de playlistPath: ${playlistPath}`);
                }
            }
        } catch (err) {
            console.error(`❌ Error al verificar systemState después de actualizar: ${err.message}`);
        }

        // Intentar cargar la playlist en VLC
        let vlcRestarted = false;
        let vlcPlaylistLoaded = false;

        try {
            const vlc = VLCPlayer.getInstance();
            // Primer intento - carga normal
            vlcPlaylistLoaded = await vlc.loadPlaylist(playlistPath, false);

            // Si falló, intentar con reinicio forzado
            if (!vlcPlaylistLoaded) {
                console.log('🔄 El primer intento de carga falló, intentando con reinicio forzado...');
                vlcRestarted = true;
                vlcPlaylistLoaded = await vlc.loadPlaylist(playlistPath, true);
            }

            if (vlcPlaylistLoaded) {
                console.log(`✅ Playlist '${playlistName}' cargada exitosamente en VLC`);
            } else {
                console.error(`❌ No se pudo cargar la playlist '${playlistName}' en VLC después de múltiples intentos`);
            }
        } catch (error) {
            console.error(`🛑 Error al cargar la playlist en VLC: ${error.message}`);
        }

        // Obtener los datos actualizados para la respuesta
        const updatedActivePlaylist = await getActivePlaylist();

        res.json({
            success: true,
            message: `Playlist '${playlistName}' establecida como activa${vlcPlaylistLoaded ? ' y cargada en VLC' : ''}${vlcRestarted ? ' (con reinicio)' : ''}`,
            activePlaylist: updatedActivePlaylist,
            vlcStatus: {
                loaded: vlcPlaylistLoaded,
                restarted: vlcRestarted
            }
        });
    } catch (error) {
        console.error('❌ Error al establecer playlist activa:', error);
        res.status(500).json({
            success: false,
            message: `Error al establecer playlist activa: ${error.message}`
        });
    }
});

export default router; 