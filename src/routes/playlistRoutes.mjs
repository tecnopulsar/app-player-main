import express from 'express';
import playlistService from '../services/playlistService.mjs';

const router = express.Router();

/**
 * @route GET /api/playlist
 * @desc Obtener todas las playlists
 */
router.get('/', async (req, res) => {
    try {
        const playlists = await playlistService.getPlaylists();
        res.json(playlists);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener playlists', message: error.message });
    }
});

/**
 * @route GET /api/playlist/active
 * @desc Obtener la playlist activa
 */
router.get('/active', async (req, res) => {
    try {
        const activePlaylist = await playlistService.getActivePlaylist();
        res.json(activePlaylist);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la playlist activa', message: error.message });
    }
});

/**
 * @route POST /api/playlist/load/:name
 * @desc Cargar una playlist específica
 */
router.post('/load/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const result = await playlistService.loadPlaylist(name);
        res.json({ success: true, message: `Playlist '${name}' cargada correctamente`, playlist: result });
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar la playlist', message: error.message });
    }
});

/**
 * @route POST /api/playlist/restore-default
 * @desc Restaurar la playlist por defecto
 */
router.post('/restore-default', async (req, res) => {
    try {
        await playlistService.restoreDefaultPlaylist();
        res.json({ success: true, message: 'Playlist por defecto restaurada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al restaurar la playlist por defecto', message: error.message });
    }
});

/**
 * @route DELETE /api/playlist/:name
 * @desc Eliminar una playlist específica
 */
router.delete('/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const force = req.query.force === 'true';

        // Verificar si se está intentando eliminar la playlist por defecto sin confirmación
        if (name === playlistService.getDefaultPlaylistName() && !force) {
            return res.status(403).json({
                success: false,
                message: 'No se puede eliminar la playlist por defecto sin confirmación',
                needsConfirmation: true,
                defaultPlaylist: true
            });
        }

        const result = await playlistService.deletePlaylist(name, force);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la playlist', message: error.message });
    }
});

export default router; 