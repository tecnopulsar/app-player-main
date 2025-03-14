import express from 'express';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const router = express.Router();

/**
 * @swagger
 * /api/system/info:
 *   get:
 *     summary: Obtiene información del sistema
 */
router.get('/info', async (req, res) => {
    try {
        const info = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus(),
            totalMem: os.totalmem(),
            freeMem: os.freemem(),
            uptime: os.uptime(),
            network: os.networkInterfaces()
        };
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener información del sistema' });
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

// Endpoint para obtener información del sistema
router.get('/system-info', (req, res) => {
    res.json({
        version: appConfig.app.version,
        name: appConfig.app.name,
        uptime: process.uptime()
    });
});

export default router; 