import express from 'express';
import { vlcRequest, vlcCommands } from '../services/vlcService.mjs';
import { parseStringPromise } from 'xml2js';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';
import axios from 'axios';
import { Router } from 'express';
import FormData from 'form-data';
import { networkInfo, device } from '../servers/serverClient.mjs';
import { getActivePlaylist, updateActivePlaylist } from '../utils/activePlaylist.mjs';

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

/**
 * @swagger
 * /api/vlc/playlists:
 *   get:
 *     summary: Obtiene la lista de todas las playlists disponibles
 */
router.get('/playlists', async (req, res) => {
    try {
        const playlists = await getPlaylists();
        res.json({
            success: true,
            playlists
        });
    } catch (error) {
        console.error('Error al obtener playlists:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las playlists',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/vlc/playlists/{name}:
 *   get:
 *     summary: Obtiene detalles de una playlist específica
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         type: string
 *         description: Nombre de la playlist
 */
router.get('/playlists/:name', async (req, res) => {
    try {
        const playlistName = req.params.name;
        const playlist = await getPlaylistDetails(playlistName);

        if (!playlist) {
            return res.status(404).json({
                success: false,
                message: `Playlist '${playlistName}' no encontrada`
            });
        }

        res.json({
            success: true,
            playlist
        });
    } catch (error) {
        console.error('Error al obtener detalles de la playlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalles de la playlist',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/vlc/playlists/{name}:
 *   delete:
 *     summary: Elimina una playlist específica
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         type: string
 *         description: Nombre de la playlist a eliminar
 */
router.delete('/playlists/:name', async (req, res) => {
    try {
        const playlistName = req.params.name;
        const deleted = await deletePlaylist(playlistName);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: `Playlist '${playlistName}' no encontrada`
            });
        }

        res.json({
            success: true,
            message: `Playlist '${playlistName}' eliminada correctamente`
        });
    } catch (error) {
        console.error('Error al eliminar la playlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la playlist',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/vlc/playlists:
 *   delete:
 *     summary: Elimina todas las playlists
 */
router.delete('/playlists', async (req, res) => {
    try {
        const count = await deleteAllPlaylists();

        res.json({
            success: true,
            message: `${count} playlists eliminadas correctamente`
        });
    } catch (error) {
        console.error('Error al eliminar las playlists:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar las playlists',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/vlc/playlist/load/{name}:
 *   post:
 *     summary: Carga una playlist específica en VLC
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         type: string
 *         description: Nombre de la playlist a cargar
 */
router.post('/playlist/load/:name', async (req, res) => {
    try {
        const playlistName = req.params.name;
        const playlist = await getPlaylistDetails(playlistName);

        if (!playlist) {
            return res.status(404).json({
                success: false,
                message: `Playlist '${playlistName}' no encontrada`
            });
        }

        // Cargar la playlist en VLC - supone que vlcCommands tiene un comando para cargar
        await vlcRequest(`${vlcCommands.play}&input=${encodeURIComponent(playlist.path)}`);

        // Actualizar el archivo JSON con la playlist activa
        await updateActivePlaylist({
            playlistName: playlistName,
            playlistPath: playlist.path
        });

        res.json({
            success: true,
            message: `Playlist '${playlistName}' cargada correctamente`,
            playlist
        });
    } catch (error) {
        console.error('Error al cargar la playlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar la playlist',
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

// Funciones auxiliares para la gestión de playlists

/**
 * Obtiene la lista de todas las playlists disponibles
 * @returns {Promise<Array>} Lista de playlists
 */
async function getPlaylists() {
    try {
        const videosDir = appConfig.paths.videos;

        // Verificar si el directorio existe
        if (!fs.existsSync(videosDir)) {
            return [];
        }

        const dirs = await fsPromises.readdir(videosDir);
        const playlists = [];

        for (const dir of dirs) {
            const dirPath = path.join(videosDir, dir);
            const stats = await fsPromises.stat(dirPath);

            if (stats.isDirectory()) {
                // Verificar si hay un archivo .m3u en el directorio
                const files = await fsPromises.readdir(dirPath);
                const m3uFiles = files.filter(file => file.endsWith('.m3u'));

                if (m3uFiles.length > 0) {
                    const playlistDetails = await getPlaylistDetails(dir);

                    if (playlistDetails) {
                        playlists.push({
                            name: dir,
                            files: playlistDetails.files.length,
                            created: stats.birthtime,
                            path: playlistDetails.path
                        });
                    }
                }
            }
        }

        return playlists;
    } catch (error) {
        console.error('Error al obtener playlists:', error);
        throw error;
    }
}

/**
 * Obtiene detalles de una playlist específica
 * @param {string} name Nombre de la playlist
 * @returns {Promise<Object|null>} Detalles de la playlist o null si no existe
 */
export async function getPlaylistDetails(name) {
    try {
        const playlistDir = path.join(appConfig.paths.videos, name);

        // Verificar si el directorio existe
        if (!fs.existsSync(playlistDir)) {
            return null;
        }

        const files = await fsPromises.readdir(playlistDir);
        const m3uFiles = files.filter(file => file.endsWith('.m3u'));

        if (m3uFiles.length === 0) {
            return null;
        }

        const playlistPath = path.join(playlistDir, m3uFiles[0]);
        const content = await fsPromises.readFile(playlistPath, 'utf8');

        // Parsear el contenido de la playlist
        const lines = content.split('\n');
        const videoFiles = lines
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => {
                const filePath = line.trim();
                const fileName = path.basename(filePath);
                return { fileName, filePath };
            });

        return {
            name,
            path: playlistPath,
            files: videoFiles,
            totalFiles: videoFiles.length
        };
    } catch (error) {
        console.error(`Error al obtener detalles de la playlist '${name}':`, error);
        throw error;
    }
}

/**
 * Elimina una playlist específica
 * @param {string} name Nombre de la playlist
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 */
async function deletePlaylist(name) {
    try {
        const playlistDir = path.join(appConfig.paths.videos, name);

        // Verificar si el directorio existe
        if (!fs.existsSync(playlistDir)) {
            return false;
        }

        await fsPromises.rm(playlistDir, { recursive: true, force: true });
        console.log(`Playlist '${name}' eliminada`);

        return true;
    } catch (error) {
        console.error(`Error al eliminar la playlist '${name}':`, error);
        throw error;
    }
}

/**
 * Elimina todas las playlists
 * @returns {Promise<number>} Número de playlists eliminadas
 */
async function deleteAllPlaylists() {
    try {
        const videosDir = appConfig.paths.videos;

        // Verificar si el directorio existe
        if (!fs.existsSync(videosDir)) {
            return 0;
        }

        const dirs = await fsPromises.readdir(videosDir);
        let count = 0;

        for (const dir of dirs) {
            const dirPath = path.join(videosDir, dir);
            const stats = await fsPromises.stat(dirPath);

            if (stats.isDirectory()) {
                await fsPromises.rm(dirPath, { recursive: true, force: true });
                console.log(`Playlist '${dir}' eliminada`);
                count++;
            }
        }

        return count;
    } catch (error) {
        console.error('Error al eliminar todas las playlists:', error);
        throw error;
    }
}

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