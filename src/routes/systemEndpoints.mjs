import express from 'express';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import {
    getSystemInfo,
    getSystemState,
    saveSystemState,
    loadSystemState
} from '../utils/systemState.mjs';
import { appConfig } from '../config/appConfig.mjs';

const execAsync = promisify(exec);
const router = express.Router();

/**
 * @swagger
 * /api/system/info:
 *   get:
 *     summary: Obtiene información básica del sistema
 *     description: Devuelve información sobre el sistema operativo, hardware y redes
 *     responses:
 *       200:
 *         description: Información del sistema
 */
router.get('/info', async (req, res) => {
    try {
        const systemInfo = await getSystemInfo();
        const networkInterfaces = getNetworkInterfaces();

        res.json({
            success: true,
            system: {
                hostname: systemInfo.hostname,
                platform: systemInfo.platform,
                arch: systemInfo.arch,
                cpus: systemInfo.cpus,
                totalMem: systemInfo.totalMem,
                freeMem: systemInfo.freeMem,
                uptime: systemInfo.uptime,
                networkInterfaces,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error(`Error al obtener información del sistema: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error al obtener información del sistema',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/system/state:
 *   get:
 *     summary: Obtiene el estado completo del sistema
 *     description: Devuelve el estado completo del sistema incluyendo hardware, VLC, almacenamiento, y aplicación
 *     responses:
 *       200:
 *         description: Estado completo del sistema
 */
router.get('/state', async (req, res) => {
    try {
        const state = await getSystemState();

        res.json({
            success: true,
            state
        });
    } catch (error) {
        console.error(`Error al obtener el estado del sistema: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el estado del sistema',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/system/state/save:
 *   post:
 *     summary: Guarda el estado actual del sistema
 *     description: Guarda el estado actual del sistema en un archivo JSON
 *     responses:
 *       200:
 *         description: Estado guardado correctamente
 *       500:
 *         description: Error al guardar el estado
 */
router.post('/state/save', async (req, res) => {
    try {
        const state = await saveSystemState();

        res.json({
            success: true,
            message: 'Estado del sistema guardado correctamente',
            timestamp: new Date().toISOString(),
            state
        });
    } catch (error) {
        console.error(`Error al guardar el estado del sistema: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error al guardar el estado del sistema',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/system/resources:
 *   get:
 *     summary: Monitorea recursos del sistema
 */
router.get('/resources', async (req, res) => {
    try {
        const { stdout: temperature } = await execAsync('vcgencmd measure_temp');
        const { stdout: clockSpeed } = await execAsync('vcgencmd measure_clock arm');

        const resources = {
            temperature: temperature.trim(),
            clockSpeed: clockSpeed.trim(),
            memoryUsage: process.memoryUsage(),
            cpuLoad: os.loadavg()
        };
        res.json(resources);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener recursos del sistema' });
    }
});

// Control del sistema
router.post('/reboot', async (req, res) => {
    try {
        // Ejecutar el comando de reinicio
        await execAsync('sudo shutdown -r now');
        res.json({ message: 'Sistema reiniciándose' });
    } catch (error) {
        console.error('Error al reiniciar el sistema:', error);
        res.status(500).json({ error: 'Error al reiniciar el sistema', details: error.message });
    }
});

// Función auxiliar para obtener interfaces de red (solo IPv4)
function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = {};

    // Filtrar solo las direcciones IPv4 y no internas
    Object.keys(interfaces).forEach(ifaceName => {
        const addrs = interfaces[ifaceName].filter(
            addr => addr.family === 'IPv4'
        );

        if (addrs.length > 0) {
            result[ifaceName] = addrs;
        }
    });

    return result;
}

export default router; 