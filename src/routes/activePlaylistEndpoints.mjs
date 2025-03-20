import { Router } from 'express';
import { getActivePlaylist, updateActivePlaylist } from '../utils/activePlaylist.mjs';
import { getPlaylistDetails } from './vlcEndpoints.mjs';

const router = Router();

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
    try {
        const { playlistName } = req.body;

        if (!playlistName) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el nombre de la playlist'
            });
        }

        // Obtener los detalles de la playlist solicitada
        const playlist = await getPlaylistDetails(playlistName);

        if (!playlist) {
            return res.status(404).json({
                success: false,
                message: `Playlist '${playlistName}' no encontrada`
            });
        }

        // Actualizar la playlist activa
        const updatedPlaylist = await updateActivePlaylist({
            playlistName: playlistName,
            playlistPath: playlist.path
        });

        res.json({
            success: true,
            message: `Playlist '${playlistName}' establecida como activa`,
            activePlaylist: updatedPlaylist
        });
    } catch (error) {
        console.error('Error al actualizar la playlist activa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la playlist activa',
            error: error.message
        });
    }
});

export default router; 