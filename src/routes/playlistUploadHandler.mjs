import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';

const router = express.Router();

// Variables para el control de la playlist
let IndexCountFilesInDirPlaylist = 0;
let activePlaylistName = null;
let playlistDirName = null;
let playlistDirPath = null;
let currentPlaylistDirPath = null;
let previewPlaylistDirPath = null;
let countPlaylistItems = 0;

// Configuración de multer para el manejo de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Mantener el nombre original del archivo
        cb(null, file.originalname);
    }
});
// Configuración de multer

const upload = multer({
    storage: storage,
    limits: {
        fileSize: appConfig.security.maxFileSize
    }
});

/**
 * @swagger
 * /api/playlist/upload:
 *   post:
 *     summary: Sube uno o varios archivos y los agrega a una playlist
 *     parameters:
 *       - name: file
 *         in: formData
 *         required: false
 *         type: file
 *         description: Archivo individual (usar este o 'files')
 *       - name: files
 *         in: formData
 *         required: false
 *         type: array
 *         items:
 *           type: file
 *         description: Múltiples archivos (usar este o 'file')
 *       - name: playlistName
 *         in: formData
 *         required: false
 *         type: string
 *       - name: countPlaylistItems
 *         in: formData
 *         required: false
 *         type: number
 *         description: Total de archivos esperados (solo para modo progresivo)
 *       - name: mode
 *         in: formData
 *         required: false
 *         type: string
 *         enum: [single, multi, progressive]
 *         default: auto
 *         description: Modo de subida (auto detecta basado en los parámetros)
 */
router.post('/upload', (req, res, next) => {
    // Determinar el modo de subida basado en los parámetros o el parámetro 'mode'
    const mode = req.body.mode || 'auto';

    if (mode === 'multi' || (mode === 'auto' && req.is('multipart/form-data') && !req.body.countPlaylistItems)) {
        // Modo multi: Subir múltiples archivos a la vez
        upload.array('files', 20)(req, res, (err) => {
            if (err) return next(err);
            handleMultipleFiles(req, res);
        });
    } else {
        // Modo single o progressive: Subir un archivo a la vez
        upload.single('file')(req, res, (err) => {
            if (err) return next(err);
            handleSingleFile(req, res);
        });
    }
});

// Manejador para archivos múltiples
async function handleMultipleFiles(req, res) {
    const files = req.files;
    const playlistNameFromRequest = req.body.playlistName || `playlist_${Date.now()}`;

    if (!files || files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No se han proporcionado archivos'
        });
    }

    try {
        // Inicializar la playlist - usando variables globales en lugar de constantes locales
        activePlaylistName = playlistNameFromRequest.endsWith('.m3u')
            ? playlistNameFromRequest
            : `${playlistNameFromRequest}.m3u`;

        playlistDirName = activePlaylistName.replace('.m3u', '');
        playlistDirPath = path.join(appConfig.paths.videos, playlistDirName);

        previewPlaylistDirPath = currentPlaylistDirPath;
        currentPlaylistDirPath = playlistDirPath;

        // Crear directorio si no existe
        await fsPromises.mkdir(playlistDirPath, { recursive: true });

        // Crear o inicializar el archivo de playlist
        const playlistM3uPath = path.join(playlistDirPath, activePlaylistName);
        await fsPromises.writeFile(playlistM3uPath, '#EXTM3U\n');

        // Procesar todos los archivos recibidos
        for (const file of files) {
            // Mover el archivo a su ubicación final
            const newFileMP4Path = path.join(playlistDirPath, file.originalname);
            await fsPromises.rename(file.path, newFileMP4Path);

            // Actualizar la playlist
            await fsPromises.appendFile(playlistM3uPath, `${newFileMP4Path}\n`);
        }

        // Ya no eliminamos directorios antiguos
        console.log(`Nueva playlist creada: ${playlistDirName}`);

        // Resetear contadores para el modo progresivo
        IndexCountFilesInDirPlaylist = 0;
        activePlaylistName = null;

        return res.json({
            success: true,
            message: 'Playlist procesada correctamente',
            playlist: {
                name: playlistDirName,
                path: playlistM3uPath,
                totalFiles: files.length,
                files: files.map(file => file.originalname)
            }
        });

    } catch (error) {
        console.error('Error al procesar archivos múltiples:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al procesar los archivos',
            error: error.message
        });
    }
}

// Manejador para archivo individual (modo progresivo)
async function handleSingleFile(req, res) {
    const file = req.file;
    const playlistNameFromRequest = req.body.playlistName || `playlist_${Date.now()}`;
    countPlaylistItems = parseInt(req.body.countPlaylistItems, 10) || 1;

    if (!file) {
        return res.status(400).json({
            success: false,
            message: 'No se ha proporcionado ningún archivo'
        });
    }

    try {
        // Inicializar la playlist si es el primer archivo
        if (IndexCountFilesInDirPlaylist === 0 || !activePlaylistName) {
            activePlaylistName = playlistNameFromRequest.endsWith('.m3u')
                ? playlistNameFromRequest
                : `${playlistNameFromRequest}.m3u`;

            playlistDirName = activePlaylistName.replace('.m3u', '');
            playlistDirPath = path.join(appConfig.paths.videos, playlistDirName);

            previewPlaylistDirPath = currentPlaylistDirPath;
            currentPlaylistDirPath = playlistDirPath;

            // Crear directorio si no existe
            await fsPromises.mkdir(playlistDirPath, { recursive: true });
        }

        // Mover el archivo a su ubicación final
        const newFileMP4Path = path.join(playlistDirPath, file.originalname);
        await fsPromises.rename(file.path, newFileMP4Path);

        // Actualizar o crear la playlist
        const newPlaylistM3uPath = path.join(playlistDirPath, activePlaylistName);
        if (IndexCountFilesInDirPlaylist === 0) {
            await fsPromises.writeFile(newPlaylistM3uPath, `#EXTM3U\n${newFileMP4Path}\n`);
        } else {
            await fsPromises.appendFile(newPlaylistM3uPath, `${newFileMP4Path}\n`);
        }

        // Incrementar el contador de archivos
        IndexCountFilesInDirPlaylist++;

        // Verificar si es el último archivo de la playlist
        if (IndexCountFilesInDirPlaylist === countPlaylistItems) {
            // Ya no eliminamos directorios antiguos
            console.log(`Nueva playlist creada: ${playlistDirName}`);

            // Resetear contadores
            IndexCountFilesInDirPlaylist = 0;
            activePlaylistName = null;

            return res.json({
                success: true,
                message: 'Playlist procesada correctamente',
                playlist: {
                    name: playlistDirName,
                    path: newPlaylistM3uPath,
                    totalFiles: countPlaylistItems
                }
            });
        }

        // Respuesta para archivos en proceso
        return res.json({
            success: true,
            message: 'Archivo procesado correctamente',
            progress: {
                current: IndexCountFilesInDirPlaylist,
                total: countPlaylistItems,
                filename: file.originalname
            }
        });

    } catch (error) {
        console.error('Error en el procesamiento del archivo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al procesar el archivo',
            error: error.message
        });
    }
}

// Manejo de errores de multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: 'Error en la subida del archivo',
            error: error.message
        });
    }
    next(error);
});

export default router; 