import { vlcRequest, vlcCommands } from '../services/vlcService.mjs';
import { parseStringPromise } from 'xml2js';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';
import { Router } from 'express';
import FormData from 'form-data';
import { STATE_FILE_PATH } from '../utils/activePlaylist.mjs';

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
        try {
            await vlcRequest(vlcCommands.snapshot);
            console.log('✅ Comando de snapshot enviado a VLC');
        } catch (vlcError) {
            console.error(`❌ Error al enviar comando de snapshot a VLC: ${vlcError.message}`);

            // Si hay un error específico de VLC, intentar una solución alternativa
            if (vlcError.message.includes('Failed to create video converter')) {
                console.log('⚠️ Error de conversor de video. Intentando solución alternativa...');

                // Esperar un momento para que VLC termine de procesar
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Intentar nuevamente
                try {
                    await vlcRequest(vlcCommands.snapshot);
                    console.log('✅ Comando de snapshot enviado a VLC (segundo intento)');
                } catch (retryError) {
                    console.error(`❌ Error en segundo intento de snapshot: ${retryError.message}`);
                    // Continuar con el proceso aunque haya error
                }
            }
        }

        // Esperar un momento para que VLC genere el archivo
        await new Promise(resolve => setTimeout(resolve, 500));

        // Obtener la captura de pantalla más reciente
        const recentSnapshot = getMostRecentSnapshot();
        if (!recentSnapshot) {
            return res
                .status(404)
                .json({
                    success: false,
                    error: "No se encontró un archivo de captura de pantalla.",
                    message: "VLC no generó un archivo de snapshot o no se pudo acceder al directorio."
                });
        }

        // Renombrar el archivo de captura de pantalla más reciente a "snapshot.jpg"
        const newSnapshotPath = renameSnapshot(recentSnapshot);
        if (!newSnapshotPath) {
            return res
                .status(500)
                .json({
                    success: false,
                    error: "Error al renombrar el archivo de snapshot.",
                    message: "No se pudo renombrar el archivo de snapshot."
                });
        }

        // Leer el archivo de estado del sistema
        const data = await fsPromises.readFile(STATE_FILE_PATH, 'utf8');
        let systemState;
        try {
            systemState = JSON.parse(data);
        } catch (parseError) {
            return res.status(500).json({
                success: false,
                error: 'Error al parsear el archivo JSON',
                message: parseError.message
            });
        }

        // Actualizar la información del snapshot
        systemState.snapshot.url = "public/snapshots/snapshot.jpg"; // Actualiza la URL según se requiera
        systemState.snapshot.createdAt = new Date().toISOString();

        // Guardar los cambios en el archivo de estado
        await fsPromises.writeFile(STATE_FILE_PATH, JSON.stringify(systemState, null, 2));

        // // Limpiar snapshots anteriores
        // await cleanOldSnapshots();

        // Enviar respuesta con la información actualizada
        res.json({
            success: true,
            snapshotPath: newSnapshotPath,
            fileName: newSnapshotPath,
            snapshot: systemState.snapshot
        });
        console.log(`Snapshot del device: ${newSnapshotPath}`);
    } catch (err) {
        console.error(`Error al capturar el snapshot: ${err.message}`);
        res.status(500).json({
            success: false,
            error: `Error al capturar el snapshot: ${err.message}`,
            message: err.message
        });
    }
});

/**
 * Obtiene el archivo de captura de pantalla más reciente en el directorio.
 */
const getMostRecentSnapshot = () => {
    try {
        // Asegurarse de que el directorio de snapshots exista
        if (!fs.existsSync(snapshotPath)) {
            fs.mkdirSync(snapshotPath, { recursive: true });
            console.log(`✅ Directorio de snapshots creado: ${snapshotPath}`);
            return null;
        }

        const files = fs.readdirSync(snapshotPath);

        // Si no hay archivos, devolver null
        if (files.length === 0) {
            console.warn(`⚠️ No hay archivos de snapshot en el directorio: ${snapshotPath}`);
            return null;
        }

        // Filtrar archivos .jpg y .png
        const snapshotFiles = files
            .filter((file) => file.endsWith(".jpg") || file.endsWith(".png"))
            .map((file) => ({
                file,
                time: fs.statSync(path.join(snapshotPath, file)).mtime.getTime(),
            }));

        // Si no hay archivos de snapshot, devolver null
        if (snapshotFiles.length === 0) {
            console.warn(`⚠️ No hay archivos de snapshot (.jpg o .png) en el directorio: ${snapshotPath}`);
            return null;
        }

        // Ordenar por fecha de modificación (más reciente primero)
        snapshotFiles.sort((a, b) => b.time - a.time);

        console.log(`✅ Snapshot más reciente encontrado: ${snapshotFiles[0].file}`);
        return snapshotFiles[0].file;
    } catch (error) {
        console.error(`❌ Error al obtener el snapshot más reciente: ${error.message}`);
        return null;
    }
};

/**
 * Renombra la captura de pantalla más reciente a "snapshot.png".
 */
const renameSnapshot = (snapshotFileName) => {
    // Asegurarse de que el directorio de snapshots exista
    if (!fs.existsSync(snapshotPath)) {
        fs.mkdirSync(snapshotPath, { recursive: true });
        console.log(`✅ Directorio de snapshots creado: ${snapshotPath}`);
    }

    const oldPath = path.join(snapshotPath, snapshotFileName);
    const newPath = path.join(snapshotPath, "snapshot.jpg");

    // Si ya tiene el nombre correcto, no es necesario renombrar
    if (snapshotFileName === "snapshot.jpg") {
        console.log("ℹ️ El snapshot ya tiene el nombre 'snapshot.jpg', no se renombra.");
        return newPath;
    }

    // Verificar que el archivo original existe
    if (!fs.existsSync(oldPath)) {
        console.error(`❌ Error: El archivo de snapshot no existe: ${oldPath}`);
        return null;
    }

    try {
        // Si el archivo destino ya existe, eliminarlo primero
        if (fs.existsSync(newPath)) {
            fs.unlinkSync(newPath);
        }

        fs.renameSync(oldPath, newPath);
        console.log(`✅ Snapshot renombrado: ${newPath}`);
        return newPath;
    } catch (error) {
        console.error(`❌ Error al renombrar snapshot: ${error.message}`);
        return null;
    }
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

const cleanOldSnapshots = async () => {
    try {
        const snapshotPath = appConfig.paths.snapshots;
        const files = await fsPromises.readdir(snapshotPath);

        const deletions = files
            .filter(file => file !== 'snapshot.jpg') // conserva el actual si ya existe
            .map(file => fsPromises.unlink(path.join(snapshotPath, file)));
        await Promise.all(deletions);
        console.log(`🧹 Limpieza de snapshots anterior completada (${deletions.length} archivos eliminados)`);
    } catch (error) {
        console.error(`❌ Error al limpiar snapshots anteriores: ${error.message}`);
    }
}

/**
 * @swagger
 * /api/vlc/fullscreen:
 *   get:
 *     summary: Activa el modo de pantalla completa
 */
router.get('/fullscreen', async (req, res) => {
    try {
        await vlcRequest(vlcCommands.fullscreen); // Asegúrate de que vlcCommands tenga el comando para fullscreen
        res.json({ success: true, message: 'Modo de pantalla completa activado' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al activar el modo de pantalla completa',
            error: error.message
        });
    }
});

export default router; 