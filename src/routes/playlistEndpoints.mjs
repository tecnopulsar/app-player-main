/** ✅
 * @file playlistEndpoints.mjs
 * @description Define las rutas para la gestión de playlists
 * @module routes/playlistEndpoints
 * 
 * @requires express - Framework web para Node.js
*/

import { Router } from 'express';
import { getPlaylistPath, getActivePlaylist, updateActivePlaylist } from '../utils/activePlaylist.mjs';
import { VLCPlayer } from '../lib/vlcPlayer.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { getConfig } from '../config/appConfig.mjs';
import { vlcRequest } from '../services/vlcService.mjs';

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


/**
 * @swagger
 * /api/playlist/delete/{playlistName}:
 *   delete:
 *     summary: Elimina una playlist específica según el nombre proporcionado en la URL
 *     parameters:
 *       - in: path
 *         name: playlistName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de la playlist a eliminar
 *     responses:
 *       200:
 *         description: Playlist eliminada con éxito
 *       400:
 *         description: No se puede eliminar la playlist activa
 *       404:
 *         description: Playlist no encontrada
 *       500:
 *         description: Error interno al eliminar la playlist
 */
router.delete('/:playlistName', async (req, res) => {
    try {
        const { playlistName } = req.params;

        if (!playlistName) {
            return res.status(400).json({ success: false, message: 'Se requiere el nombre de la playlist en la URL' });
        }

        const config = getConfig();
        const playlistDir = path.join(config.paths.playlists, playlistName);

        // Verificar si la carpeta de la playlist existe
        try {
            await fsPromises.access(playlistDir);
        } catch {
            return res.status(404).json({ success: false, message: `Playlist '${playlistName}' no encontrada` });
        }

        // Verificar si es la playlist activa
        const activePlaylist = await getActivePlaylist();
        if (activePlaylist?.playlistName === playlistName) {
            return res.status(400).json({ success: false, message: 'No se puede eliminar la playlist activa' });
        }

        // Eliminar la carpeta de la playlist
        await fsPromises.rm(playlistDir, { recursive: true, force: true });

        res.json({ success: true, message: `Playlist '${playlistName}' eliminada correctamente` });
    } catch (error) {
        console.error(`❌ Error al eliminar playlist: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error al eliminar la playlist', error: error.message });
    }
});

/**
 * @swagger
 * /api/active-playlist:
 *   get:
 *     summary: Obtiene la información de la playlist actualmente activa
 */
router.get('/active', async (req, res) => {
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playlistName:
 *                 type: string
 *                 description: Nombre de la playlist a establecer como activa
 *               default:
 *                 type: boolean
 *                 description: Indica si la playlist debe marcarse como la predeterminada
 *     responses:
 *       200:
 *         description: Playlist activa actualizada con éxito
 *       400:
 *         description: Datos inválidos o playlist no encontrada
 *       500:
 *         description: Error al actualizar la playlist activa
 */
router.post('/active', async (req, res) => {
    console.log('📝 POST /api/playlist/active - Actualizando playlist activa:', req.body);
    try {
        const { playlistName, default: setAsDefault } = req.body;

        if (!playlistName) {
            return res.status(400).json({ success: false, message: 'Se requiere el nombre de la playlist' });
        }

        const playlistPath = await getPlaylistPath(playlistName);
        if (!playlistPath) {
            return res.status(404).json({ success: false, message: `Playlist '${playlistName}' no encontrada` });
        }

        // Contar archivos en la playlist
        let fileCount = 0;
        try {
            const playlistPath = await getPlaylistPath(playlistName);
            const playlistContent = await fsPromises.readFile(playlistPath, 'utf8');
            fileCount = playlistContent.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;
        } catch (err) {
            console.error(`❌ Error al leer la playlist: ${err.message}`);
        }

        // Actualizar la playlist activa en systemState.json
        const updatedActivePlaylist = await updateActivePlaylist({
            playlistName,
            playlistPath,
            fileCount,
            isDefault: setAsDefault || false, // Si no se pasa, por defecto es false
        });

        if (!updatedActivePlaylist) {
            return res.status(500).json({ success: false, message: 'Error al actualizar la playlist activa' });
        }

        // Intentar cargar la playlist en VLC
        let vlcPlaylistLoaded = false;
        try {
            const vlc = VLCPlayer.getInstance();
            await vlcRequest('pl_empty'); // Vaciar la playlist actual
            await vlcRequest('in_play', { input: playlistPath }); // Cargar la nueva playlist

            // Verificar si VLC la ha cargado correctamente
            const status = await vlcRequest('status');
            vlcPlaylistLoaded = status?.information?.category ? true : false;
        } catch (error) {
            console.error(`🛑 Error al cargar la playlist en VLC: ${error.message}`);
        }

        res.json({
            success: true,
            message: `Playlist '${playlistName}' establecida como activa${vlcPlaylistLoaded ? ' y cargada en VLC' : ''}`,
            activePlaylist: updatedActivePlaylist,
            vlcStatus: { loaded: vlcPlaylistLoaded }
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