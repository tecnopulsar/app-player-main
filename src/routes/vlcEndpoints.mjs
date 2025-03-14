import express from 'express';
import { vlcRequest, vlcCommands } from '../services/vlcService.mjs';
import { parseStringPromise } from 'xml2js';

const router = express.Router();

/**
 * @swagger
 * /api/vlc/status:
 *   get:
 *     summary: Obtiene el estado actual del reproductor VLC
 */
router.get('/status', async (req, res) => {
    try {
        const statusXml = await vlcRequest(vlcCommands.getStatus);
        const parsedXml = await parseStringPromise(statusXml);
        const { state, currentplid, fullscreen, volume, length, position } = parsedXml.root;

        res.json({
            state: state?.[0] || 'stopped',
            currentplid: currentplid?.[0] || '0',
            fullscreen: fullscreen?.[0] === '1',
            volume: volume?.[0] || '0',
            length: length?.[0] || '0',
            position: position?.[0] || '0',
        });
    } catch (error) {
        console.error(`Error fetching status: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el estado del reproductor',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/vlc/play:
 *   get:
 *     summary: Inicia la reproducción
 */
router.get('/play', async (req, res) => {
    try {
        await vlcRequest(vlcCommands.play);
        res.json({ success: true, message: 'Reproducción iniciada' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al iniciar la reproducción',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/vlc/pause:
 *   get:
 *     summary: Pausa la reproducción
 */
router.get('/pause', async (req, res) => {
    try {
        await vlcRequest(vlcCommands.pause);
        res.json({ success: true, message: 'Reproducción pausada' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al pausar la reproducción',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/vlc/stop:
 *   get:
 *     summary: Detiene la reproducción
 */
router.get('/stop', async (req, res) => {
    try {
        await vlcRequest(vlcCommands.stop);
        res.json({ success: true, message: 'Reproducción detenida' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al detener la reproducción',
            error: error.message
        });
    }
});

export default router; 