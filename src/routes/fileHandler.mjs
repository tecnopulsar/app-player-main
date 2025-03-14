import express from 'express';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { appConfig } from '../config/appConfig.mjs';

const router = express.Router();

// Endpoint para listar archivos
router.get('/files', async (req, res) => {
    try {
        const files = await fsPromises.readdir(appConfig.paths.uploads);
        const fileStats = await Promise.all(
            files.map(async (file) => {
                const stats = await fsPromises.stat(path.join(appConfig.paths.uploads, file));
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime,
                    type: path.extname(file)
                };
            })
        );
        res.json({ success: true, files: fileStats });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al listar archivos',
            error: error.message
        });
    }
});

// Endpoint para eliminar un archivo
router.delete('/files/:filename', async (req, res) => {
    try {
        const filePath = path.join(appConfig.paths.uploads, req.params.filename);
        await fsPromises.unlink(filePath);
        res.json({
            success: true,
            message: 'Archivo eliminado correctamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el archivo',
            error: error.message
        });
    }
});

export default router;
