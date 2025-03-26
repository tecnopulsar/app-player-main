import { vlcRequest, vlcCommands } from '../services/vlcService.mjs';
import { parseStringPromise } from 'xml2js';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';
import { Router } from 'express';
import FormData from 'form-data';
import { STATE_FILE_PATH, updateActivePlaylist } from '../utils/activePlaylist.mjs';

const router = Router();
let controllerClient;

const snapshotPath = appConfig.paths.snapshots;
const systemStatePath = appConfig.paths.systemState;

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

        // 1. Obtener estado desde VLC
        const statusJSON = await vlcRequest(vlcCommands.getStatus);
        res.json(statusJSON);

    } catch (error) {
        const errorMessage = `Error fetching VLC status: ${error.message}`;
        console.error(errorMessage);
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

        // Leer el archivo de estado del sistema
        const data = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
        let systemState;
        try {
            systemState = JSON.parse(data);
        } catch (parseError) {
            return res.status(500).json({ error: 'Error al parsear el archivo JSON' });
        }

        // Actualizar la información del snapshot
        systemState.snapshot.url = "public/snapshots/snapshot.jpg"; // Actualiza la URL según se requiera
        systemState.snapshot.createdAt = new Date().toISOString();

        // Guardar los cambios en el archivo de estado
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(systemState, null, 2));

        // Enviar respuesta con la información actualizada
        res.json({
            fileName: newSnapshotPath,
            snapshot: systemState.snapshot
        });
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