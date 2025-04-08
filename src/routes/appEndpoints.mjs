import express from 'express';
import { getSystemState } from '../utils/systemState.mjs';
import { appConfig } from '../config/appConfig.mjs';
import process from 'node:process';


const router = express.Router();

/**
 * @swagger
 * /api/app/state:
 *   get:
 *     summary: Obtiene el estado del dispositivo para controladores
 *     description: Devuelve un estado resumido optimizado para aplicaciones controladoras
 *     responses:
 *       200:
 *         description: Estado del dispositivo
 */
router.get('/state', async (req, res) => {
    try {
        // Obtener el estado completo del sistema
        const fullState = await getSystemState();

        // Formatear la respuesta para controladores
        const response = {
            timestamp: new Date().toISOString(),
            device: {
                id: fullState.app.deviceId,
                name: fullState.app.deviceName,
                type: fullState.app.deviceType,
                group: fullState.app.deviceGroup,
                system: `${fullState.system.platform} ${fullState.system.arch}`
            },
            network: {},
            storage: {
                totalSpace: fullState.storage.totalSpace,
                freeSpace: fullState.storage.freeSpace,
                usedPercent: Math.round((fullState.storage.usedSpace / fullState.storage.totalSpace) * 100)
            },
            player: {
                status: fullState.vlc.connected ?
                    (fullState.vlc.playing ? 'playing' :
                        fullState.vlc.paused ? 'paused' : 'stopped') :
                    'disconnected',
                currentItem: fullState.vlc.currentItem || null,
                progress: fullState.vlc.position ? Math.round(fullState.vlc.position * 100) : 0
            },
            playlist: {
                name: fullState.activePlaylist.playlistName,
                fileCount: fullState.activePlaylist.fileCount,
                currentIndex: fullState.activePlaylist.currentIndex
            }
        };

        // Añadir detalles de red
        for (const [name, iface] of Object.entries(fullState.system.network)) {
            // Solo añadir interfaces no internas
            if (!iface.internal) {
                response.network[name] = iface.address;
            }
        }

        res.json({
            success: true,
            state: response
        });
    } catch (error) {
        console.error(`Error al obtener el estado de la aplicación: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el estado de la aplicación',
            message: error.message
        });
    }
});

// Endpoint para obtener información general de la aplicación
router.get('/info', (req, res) => {
    res.json({
        version: appConfig.app.version,
        name: appConfig.app.name,
        uptime: process.uptime()
    });
});

// Puedes agregar más endpoints relacionados con la aplicación aquí

export default router; 