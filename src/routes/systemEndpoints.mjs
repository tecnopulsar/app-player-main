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
        const { stdout: timezone } = await execAsync('timedatectl | grep "Time zone"');

        // Obtener si NTP está activo
        const { stdout: ntpStatus } = await execAsync('timedatectl | grep "NTP"');

        res.json({
            success: true,
            datetime: {
                current: currentDateTime.toISOString(),
                localtime: currentDateTime.toString(),
                timestamp: Math.floor(currentDateTime.getTime() / 1000),
                timezone: timezone.trim(),
                ntpStatus: ntpStatus.trim()
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
// router.post('/datetime', async (req, res) => {
//     try {
//         const { datetime, timezone } = req.body;

//         if (!datetime && !timezone) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Se requiere fecha/hora o zona horaria'
//             });
//         }

//         // Cambiar la fecha y hora si se proporciona
//         if (datetime) {
//             const dateObj = new Date(datetime);
//             if (isNaN(dateObj.getTime())) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Formato de fecha inválido. Use ISO 8601 (YYYY-MM-DDTHH:MM:SS)'
//                 });
//             }

//             // Formatear para el comando date
//             const formattedDate = dateObj.toISOString().replace('T', ' ').substr(0, 19);
//             await execAsync(`sudo date -s "${formattedDate}"`);

//             // Intentar establecer el reloj de hardware, pero continuar si falla
//             try {
//                 await execAsync('sudo hwclock --systohc');
//             } catch (hwclockError) {
//                 console.warn('No se pudo acceder al reloj de hardware:', hwclockError.message);
//                 // Continuamos sin error, ya que la fecha del sistema se actualizó correctamente
//             }
//         }

//         // Cambiar la zona horaria si se proporciona
//         if (timezone) {
//             await execAsync(`sudo timedatectl set-timezone ${timezone}`);
//         }

//         // Obtener la información actualizada para devolver en la respuesta
//         const currentDateTime = new Date();
//         const { stdout: updatedTimezone } = await execAsync('timedatectl | grep "Time zone"');
//         const { stdout: updatedNtpStatus } = await execAsync('timedatectl | grep "NTP"');

//         res.json({
//             success: true,
//             message: 'Fecha y hora actualizadas correctamente',
//             datetime: {
//                 current: currentDateTime.toISOString(),
//                 localtime: currentDateTime.toString(),
//                 timestamp: Math.floor(currentDateTime.getTime() / 1000),
//                 timezone: updatedTimezone.trim(),
//                 ntpStatus: updatedNtpStatus.trim()
//             }
//         });
//     } catch (error) {
//         console.error(`Error al establecer la fecha y hora: ${error.message}`);
//         res.status(500).json({
//             success: false,
//             error: 'Error al establecer la fecha y hora',
//             message: error.message
//         });
//     }
// });
router.post('/datetime', async (req, res) => {
    try {
        const { datetime, timezone } = req.body;

        // Validación de entrada
        if (!datetime && !timezone) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere fecha/hora (datetime) o zona horaria (timezone)'
            });
        }

        // Objeto para almacenar los resultados
        const result = {
            success: true,
            changes: {},
            warnings: []
        };

        // 1. Procesamiento de la fecha/hora
        if (datetime) {
            // Validar formato de fecha
            const dateObj = new Date(datetime);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de fecha inválido. Use ISO 8601 (ej: 2023-12-31T23:59:59)'
                });
            }

            // Formatear para el comando date (formato aceptado por 'date -s')
            const formattedDate = dateObj.toISOString().replace('T', ' ').slice(0, 19);

            try {
                // Actualizar fecha del sistema
                await execAsync(`sudo date -s "${formattedDate}"`);
                result.changes.datetime = formattedDate;

                // Intentar sincronizar con reloj hardware (opcional)
                try {
                    await execAsync('sudo hwclock --systohc');
                    result.changes.hwclockSynced = true;
                } catch (hwclockError) {
                    result.warnings.push('No se pudo sincronizar con el reloj de hardware (RTC)');
                    // Esto es común en Raspberry Pi sin RTC conectado
                }
            } catch (dateError) {
                console.error('Error al actualizar fecha:', dateError);
                throw new Error('No se pudo actualizar la fecha del sistema');
            }
        }

        // 2. Procesamiento de la zona horaria
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

        // Obtener información actualizada del sistema
        const currentDateTime = new Date();
        const { stdout: timezoneInfo } = await execAsync('timedatectl show --property=Timezone --value');
        const { stdout: ntpStatus } = await execAsync('timedatectl show --property=NTPSynchronized --value');

        // Preparar respuesta
        res.json({
            ...result,
            currentStatus: {
                isoDateTime: currentDateTime.toISOString(),
                localDateTime: currentDateTime.toString(),
                unixTimestamp: Math.floor(currentDateTime.getTime() / 1000),
                timezone: timezoneInfo.trim(),
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
        const command = enabled ? 'sudo timedatectl set-ntp true' : 'sudo timedatectl set-ntp false';
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

        res.json({
            success: true,
            message: 'Sincronización con servidor NTP iniciada',
            timestamp: new Date().toISOString()
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