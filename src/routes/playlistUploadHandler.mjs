import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';
import { updateActivePlaylist } from '../utils/activePlaylist.mjs';

// Importar electron para comunicación con el proceso principal
let global;
try {
    // Acceder al objeto global de Electron si está disponible
    global = require('electron').remote.getGlobal('mainWindow');
} catch (e) {
    console.log('⚠️ Módulo Electron no disponible en este contexto. La comunicación IPC no funcionará.');
    global = { mainWindow: null };
}

const router = express.Router();

// Variables para el control de la playlist
let IndexCountFilesInDirPlaylist = 0;
let activePlaylistName = null;
let playlistDirName = null;
let playlistDirPath = null;
let currentPlaylistDirPath = null;
let previewPlaylistDirPath = null;
let countPlaylistItems = 0;

// Obtener el nombre de la playlist por defecto
const DEFAULT_PLAYLIST_NAME = appConfig.app.defaultPlaylist || 'default';

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
 *       - name: isDefault
 *         in: formData
 *         required: false
 *         type: boolean
 *         default: false
 *         description: Marca la playlist como la playlist por defecto
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
    let playlistNameFromRequest = req.body.playlistName || `playlist_${Date.now()}`;

    // Verificar si es la playlist por defecto
    const isDefault = req.body.isDefault === 'true' || req.body.isDefault === true;

    // Si es la playlist por defecto, usar el nombre configurado en appConfig
    if (isDefault) {
        playlistNameFromRequest = DEFAULT_PLAYLIST_NAME;
        console.log(`ℹ️ Creando/actualizando la playlist por defecto: ${DEFAULT_PLAYLIST_NAME}`);
    }

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

        // Usar la estructura unificada de playlists desde appConfig
        playlistDirPath = path.join(appConfig.paths.playlists, playlistDirName);

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

            // Actualizar la playlist - usar nombre de archivo en lugar de ruta completa
            await fsPromises.appendFile(playlistM3uPath, `${file.originalname}\n`);
        }

        // Resetear contadores para el modo progresivo
        IndexCountFilesInDirPlaylist = 0;
        activePlaylistName = null;

        // Si es la playlist por defecto, actualizar la playlist activa
        if (isDefault) {
            await updateActivePlaylist({
                playlistName: playlistDirName,
                playlistPath: playlistM3uPath,
                isDefault: true
            });

            console.log(`✅ Playlist por defecto ${playlistDirName} configurada como activa`);
        }

        return res.json({
            success: true,
            message: isDefault ? 'Playlist por defecto procesada correctamente' : 'Playlist procesada correctamente',
            playlist: {
                name: playlistDirName,
                path: playlistM3uPath,
                totalFiles: files.length,
                files: files.map(file => file.originalname),
                isDefault: isDefault
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
    let playlistNameFromRequest = req.body.playlistName || `playlist_${Date.now()}`;
    countPlaylistItems = parseInt(req.body.countPlaylistItems, 10) || 1;

    // Verificar si es la playlist por defecto
    const isDefault = req.body.isDefault === 'true' || req.body.isDefault === true;

    // Si es la playlist por defecto, usar el nombre configurado en appConfig
    if (isDefault) {
        playlistNameFromRequest = DEFAULT_PLAYLIST_NAME;
        console.log(`ℹ️ Creando/actualizando la playlist por defecto: ${DEFAULT_PLAYLIST_NAME}`);
    }

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

            // Usar la estructura unificada de playlists desde appConfig
            playlistDirPath = path.join(appConfig.paths.playlists, playlistDirName);

            previewPlaylistDirPath = currentPlaylistDirPath;
            currentPlaylistDirPath = playlistDirPath;

            // Crear directorio si no existe
            await fsPromises.mkdir(playlistDirPath, { recursive: true });
        }

        // Mover el archivo a su ubicación final
        const newFileMP4Path = path.join(playlistDirPath, file.originalname);
        await fsPromises.rename(file.path, newFileMP4Path);

        // Actualizar o crear la playlist - usar nombre de archivo en lugar de ruta completa
        const newPlaylistM3uPath = path.join(playlistDirPath, activePlaylistName);
        if (IndexCountFilesInDirPlaylist === 0) {
            await fsPromises.writeFile(newPlaylistM3uPath, `#EXTM3U\n${file.originalname}\n`);
        } else {
            await fsPromises.appendFile(newPlaylistM3uPath, `${file.originalname}\n`);
        }

        // Incrementar el contador de archivos
        IndexCountFilesInDirPlaylist++;

        // Verificar si es el último archivo de la playlist
        if (IndexCountFilesInDirPlaylist === countPlaylistItems) {
            console.log(`Nueva playlist creada: ${playlistDirName}`);

            // Si es la playlist por defecto y es el último archivo, actualizar la playlist activa
            if (isDefault) {
                await updateActivePlaylist({
                    playlistName: playlistDirName,
                    playlistPath: newPlaylistM3uPath,
                    isDefault: true
                });

                console.log(`✅ Playlist por defecto ${playlistDirName} configurada como activa`);
            }

            // Resetear contadores
            IndexCountFilesInDirPlaylist = 0;
            activePlaylistName = null;

            return res.json({
                success: true,
                message: isDefault ? 'Playlist por defecto procesada correctamente' : 'Playlist procesada correctamente',
                playlist: {
                    name: playlistDirName,
                    path: newPlaylistM3uPath,
                    totalFiles: countPlaylistItems,
                    isDefault: isDefault
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
                filename: file.originalname,
                isDefault: isDefault
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

/**
 * @swagger
 * /api/playlist/set-default/{name}:
 *   post:
 *     summary: Establece una playlist existente como la playlist por defecto
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         type: string
 *         description: Nombre de la playlist a establecer como por defecto
 */
router.post('/set-default/:name', async (req, res) => {
    try {
        const { name } = req.params;

        // Verificar si la playlist existe
        const playlistDir = path.join(appConfig.paths.playlists, name);

        if (!fs.existsSync(playlistDir)) {
            return res.status(404).json({
                success: false,
                message: `La playlist '${name}' no existe`
            });
        }

        // Buscar el archivo .m3u
        const files = await fsPromises.readdir(playlistDir);
        const m3uFiles = files.filter(file => file.endsWith('.m3u'));

        if (m3uFiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontró un archivo .m3u en la playlist '${name}'`
            });
        }

        const playlistPath = path.join(playlistDir, m3uFiles[0]);

        // Actualizar la playlist activa como la playlist por defecto
        await updateActivePlaylist({
            playlistName: name,
            playlistPath: playlistPath,
            isDefault: true
        });

        console.log(`✅ Playlist '${name}' configurada como playlist por defecto`);

        // Iniciar VLC con la playlist por defecto
        try {
            // Notificar al proceso principal para iniciar VLC
            console.log(`✅ Enviando evento para iniciar VLC con playlist por defecto: ${name}`);

            // Si hay una ventana principal registrada en el IPC, enviar el evento
            if (global.mainWindow && !global.mainWindow.isDestroyed()) {
                global.mainWindow.webContents.send('start-vlc-with-playlist', {
                    playlistName: name,
                    playlistPath: playlistPath
                });
            }
        } catch (vlcError) {
            console.error('❌ Error al solicitar inicio de VLC:', vlcError);
            // Continuar con la respuesta incluso si la solicitud de VLC falló
        }

        return res.json({
            success: true,
            message: `Playlist '${name}' establecida como playlist por defecto`,
            playlist: {
                name: name,
                path: playlistPath,
                isDefault: true
            }
        });
    } catch (error) {
        console.error('Error al establecer la playlist por defecto:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al establecer la playlist por defecto',
            error: error.message
        });
    }
});

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