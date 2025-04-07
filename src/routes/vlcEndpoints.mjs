import { vlcRequest, vlcCommands } from '../services/vlcService.mjs';
import { parseStringPromise } from 'xml2js';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';
import { Router } from 'express';
import FormData from 'form-data';
import { updateActivePlaylist } from '../utils/activePlaylist.mjs';

const router = Router();
let controllerClient;

const snapshotPath = appConfig.paths.snapshots;

// Inicializar el cliente controlador
export const setControllerClient = (client) => {
    controllerClient = client;
};

/**
 * @swagger
 * /api/vlc/status:
 *   get:
 *     summary: Obtiene el estado actual del reproductor VLC
 */
router.get('/status', async (req, res) => {
    try {
        const status = await vlcRequest(vlcCommands.getStatus); // Debe ser el endpoint .json

        const streamVideo = status.information?.category?.["Stream 0"] || {};
        const streamAudio = status.information?.category?.["Stream 1"] || {};
        const meta = status.information?.category?.meta || {};

        res.json({
            success: true,
            state: status.state || 'stopped',
            filename: meta.filename || 'Desconocido',
            title: meta.title || meta.filename || 'Sin título',
            length: status.length || 0, // en segundos
            time: status.time || 0,     // en segundos
            position: status.position || 0, // 0 a 1
            resolution: streamVideo["Video_resolution"] || 'Desconocido',
            frameRate: streamVideo["Frame_rate"] || 'Desconocido',
            videoCodec: streamVideo["Codec"] || 'Desconocido',
            audioCodec: streamAudio["Codec"] || 'Desconocido',
            audioBitrate: streamAudio["Bitrate"] || 'Desconocido',
            volume: status.volume || 0,
            fullscreen: !!status.fullscreen,
            repeat: !!status.repeat,
            loop: !!status.loop
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

/**
 * @swagger
 * /snapshot:
 *   get:
 *     summary: Captura y envía un snapshot a la app controladora
 *     description: Captura una imagen del contenido actual, la guarda como snapshot.png y la envía al servidor controlador
 */
router.get('/snapshot', async (req, res) => {

    try {
        // Capturar el snapshot
        await vlcRequest(vlcCommands.snapshot);

        // Obtener la captura de pantalla más reciente
        const recentSnapshot = getMostRecentSnapshot();
        if (!recentSnapshot) {
            return res
                .status(404)
                .send("No se encontró un archivo de captura de pantalla.");
        }
        // Renombrar el archivo de captura de pantalla más reciente a "snapshot.png"
        const newSnapshotPath = renameSnapshot(recentSnapshot);

        // Responder con el nombre del archivo
        res.json({ fileName: newSnapshotPath });
        console.log(`Snapshot del device: ${newSnapshotPath}`);
    } catch (err) {
        console.error(`Error al capturar el snapshot: ${err.message}`);
        res.status(500).send(`Error al capturar el snapshot: ${err.message}`);
    }
});

/**
 * Obtiene el archivo de captura de pantalla más reciente en el directorio.
 */
const getMostRecentSnapshot = () => {
    const files = fs.readdirSync(snapshotPath);
    return files
        .filter((file) => file.endsWith(".jpg"))
        .map((file) => ({
            file,
            time: fs.statSync(path.join(snapshotPath, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time)[0]?.file;
};

/**
 * Renombra la captura de pantalla más reciente a "snapshot.png".
 */
const renameSnapshot = (snapshotFileName) => {
    const oldPath = path.join(snapshotPath, snapshotFileName);
    const newPath = path.join(snapshotPath, "snapshot.jpg");
    fs.renameSync(oldPath, newPath);
    return newPath;
};

/**
 * Sube la captura de pantalla al servidor.
 */
const uploadSnapshot = async (snapshotPath) => {
    const form = new FormData();
    form.append("file", fs.createReadStream(snapshotPath), "snapshot.png");
    form.append("snapshotName", "snapshot.png");
    form.append("deviceId", device.id);

    const headers = form.getHeaders();
    await axios.post(`http://192.168.1.3:3001/snapshot`, form, {
        headers,
    });
};

export default router; 