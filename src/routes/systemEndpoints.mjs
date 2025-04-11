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

/**
 * @swagger
 * /api/system/datetime:
 *   get:
 *     summary: Obtiene la fecha y hora actual del sistema
 *     description: Devuelve la fecha y hora actual del sistema, junto con la configuración de zona horaria
 *     responses:
 *       200:
 *         description: Fecha y hora actual del sistema
 *       500:
 *         description: Error al obtener la fecha y hora
 */
router.get('/datetime', async (req, res) => {
    try {
        // Obtener la fecha y hora actual
        const currentDateTime = new Date();

        // Obtener la zona horaria
        const { stdout: timezoneInfo } = await execAsync('timedatectl show --property=Timezone --value');
        const { stdout: timezoneOffset } = await execAsync('date +"%z %Z"');

        // Verificar si NTP está activo
        let ntpActive = false;
        try {
            const { stdout: ntpStatus } = await execAsync('ntpq -p');
            // Verificar si hay servidores NTP activos
            ntpActive = ntpStatus.includes('*') || ntpStatus.includes('o'); // '*' o 'o' indica que el servidor está en uso
        } catch (error) {
            console.warn('Error al verificar el estado de NTP:', error.message);
        }

        // Parsear offset y abreviatura
        const [offset, abbr] = timezoneOffset.trim().split(' ');

        res.json({
            success: true,
            datetime: {
                current: currentDateTime.toISOString(),
                localtime: currentDateTime.toString(),
                timestamp: Math.floor(currentDateTime.getTime() / 1000),
                timezone: {
                    name: timezoneInfo.trim(),
                    offset: offset || "+0000",
                    abbr: abbr || "UTC"
                },
                ntpActive: ntpActive // Refleja el estado real de NTP
            }
        });
    } catch (error) {
        console.error(`Error al obtener la fecha y hora: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la fecha y hora',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/system/datetime:
 *   post:
 *     summary: Establece la fecha y hora del sistema
 *     description: Establece una nueva fecha y hora para el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               datetime:
 *                 type: string
 *                 description: Fecha y hora en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)
 *               timezone:
 *                 type: string
 *                 description: Zona horaria (e.j. 'America/Santiago')
 *     responses:
 *       200:
 *         description: Fecha y hora actualizadas correctamente
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error al establecer la fecha y hora
 */
router.post('/datetime', async (req, res) => {
    try {
        const { datetime, timezone, localDateTime } = req.body;

        // Validación de entrada
        if (!datetime && !timezone && !localDateTime) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere fecha/hora (datetime), hora local (localDateTime) o zona horaria (timezone)'
            });
        }

        // Objeto para almacenar los resultados
        const result = {
            success: true,
            changes: {},
            warnings: []
        };

        // Primero procesamos la zona horaria si se proporciona, para que la fecha se establezca con la zona correcta
        if (timezone) {
            // Validar formato de timezone (ej: "America/Mexico_City")
            if (!timezone.match(/^[a-zA-Z_]+\/[a-zA-Z_]+$/)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de zona horaria inválido. Use "Continente/Ciudad"'
                });
            }

            try {
                await execAsync(`sudo timedatectl set-timezone ${timezone}`);
                result.changes.timezone = timezone;
            } catch (tzError) {
                console.error('Error al actualizar zona horaria:', tzError);
                throw new Error('No se pudo actualizar la zona horaria');
            }
        }

        // Procesamiento de la fecha/hora basado en localDateTime o datetime
        if (localDateTime || datetime) {
            try {
                let formattedDate;

                if (localDateTime) {
                    // Si recibimos localDateTime, lo procesamos directamente
                    // Primero extraemos la parte de fecha y hora sin la zona horaria
                    const localTimeMatch = localDateTime.match(/([A-Za-z]{3}\s[A-Za-z]{3}\s\d{1,2}\s\d{4}\s\d{2}:\d{2}:\d{2})/);

                    if (!localTimeMatch) {
                        return res.status(400).json({
                            success: false,
                            error: 'Formato de localDateTime inválido. Use el formato devuelto por GET /datetime'
                        });
                    }

                    // Convertimos directamente el formato local al formato aceptado por date
                    const { stdout: dateConversion } = await execAsync(`date -d "${localTimeMatch[1]}" '+%Y-%m-%d %H:%M:%S'`);
                    formattedDate = dateConversion.trim();
                    result.changes.localDateTime = localDateTime;
                } else {
                    // Si recibimos datetime (ISO), lo procesamos como antes
                    const dateObj = new Date(datetime);
                    if (isNaN(dateObj.getTime())) {
                        return res.status(400).json({
                            success: false,
                            error: 'Formato de fecha inválido. Use ISO 8601 (ej: 2023-12-31T23:59:59)'
                        });
                    }

                    // Formatear para usar hora local del sistema
                    const { stdout: localTimeFormat } = await execAsync(`date -d "${datetime}" '+%Y-%m-%d %H:%M:%S'`);
                    formattedDate = localTimeFormat.trim();
                    result.changes.datetime = formattedDate;
                }

                // Actualizar fecha del sistema
                await execAsync(`sudo date -s "${formattedDate}"`);

                // Intentar sincronizar con reloj hardware (opcional)
                try {
                    await execAsync('sudo hwclock --systohc');
                    result.changes.hwclockSynced = true;
                } catch (hwclockError) {
                    result.warnings.push('No se pudo sincronizar con el reloj de hardware (RTC)');
                }
            } catch (dateError) {
                console.error('Error al actualizar fecha:', dateError);
                throw new Error('No se pudo actualizar la fecha del sistema: ' + dateError.message);
            }
        }

        // Obtener información actualizada del sistema
        const currentDateTime = new Date();
        const { stdout: timezoneInfo } = await execAsync('timedatectl show --property=Timezone --value');
        const { stdout: timezoneOffset } = await execAsync('date +"%z %Z"');
        const { stdout: ntpStatus } = await execAsync('timedatectl show --property=NTPSynchronized --value');

        // Parsear offset y abreviatura
        const [offset, abbr] = timezoneOffset.trim().split(' ');

        // Preparar respuesta
        res.json({
            ...result,
            currentStatus: {
                isoDateTime: currentDateTime.toISOString(),
                localDateTime: currentDateTime.toString(),
                unixTimestamp: Math.floor(currentDateTime.getTime() / 1000),
                timezone: {
                    name: timezoneInfo.trim(),
                    offset: offset || "+0000",
                    abbr: abbr || "UTC"
                },
                ntpActive: ntpStatus.trim() === 'yes'
            }
        });

    } catch (error) {
        console.error(`Error en /datetime: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al procesar la solicitud',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * @swagger
 * /api/system/datetime/ntp:
 *   post:
 *     summary: Activa o desactiva la sincronización NTP
 *     description: Permite habilitar o deshabilitar la sincronización automática de fecha y hora mediante NTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Indica si NTP debe estar habilitado o no
 *     responses:
 *       200:
 *         description: Estado de NTP actualizado correctamente
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error al configurar NTP
 */
router.post('/datetime/ntp', async (req, res) => {
    try {
        const { enabled } = req.body;

        if (enabled === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere el parámetro "enabled"'
            });
        }

        // Activar o desactivar NTP según el parámetro
        const command = enabled ? 'sudo systemctl start ntp' : 'sudo systemctl stop ntp';
        await execAsync(command);

        res.json({
            success: true,
            message: `NTP ${enabled ? 'activado' : 'desactivado'} correctamente`,
            ntpEnabled: enabled
        });
    } catch (error) {
        console.error(`Error al configurar NTP: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error al configurar NTP',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/system/datetime/sync:
 *   post:
 *     summary: Sincroniza la fecha y hora con un servidor NTP
 *     description: Fuerza una sincronización inmediata con un servidor NTP
 *     responses:
 *       200:
 *         description: Sincronización iniciada correctamente
 *       500:
 *         description: Error al sincronizar
 */
router.post('/datetime/sync', async (req, res) => {
    try {
        // Forzar una sincronización con NTP
        await execAsync('sudo systemctl restart systemd-timesyncd');

        // Esperar un momento para que se complete la sincronización
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Obtener información actualizada
        const currentDateTime = new Date();
        const { stdout: timezoneInfo } = await execAsync('timedatectl show --property=Timezone --value');
        const { stdout: timezoneOffset } = await execAsync('date +"%z %Z"');
        const { stdout: ntpStatus } = await execAsync('timedatectl show --property=NTPSynchronized --value');

        // Parsear offset y abreviatura
        const [offset, abbr] = timezoneOffset.trim().split(' ');

        res.json({
            success: true,
            message: 'Sincronización con servidor NTP iniciada',
            currentStatus: {
                isoDateTime: currentDateTime.toISOString(),
                localDateTime: currentDateTime.toString(),
                unixTimestamp: Math.floor(currentDateTime.getTime() / 1000),
                timezone: {
                    name: timezoneInfo.trim(),
                    offset: offset || "+0000",
                    abbr: abbr || "UTC"
                },
                ntpActive: ntpStatus.trim() === 'yes'
            }
        });
    } catch (error) {
        console.error(`Error al sincronizar con NTP: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error al sincronizar con NTP',
            message: error.message
        });
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