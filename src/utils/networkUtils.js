import os from 'os';
import { promisify } from 'util';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Obtiene información de red usando os.networkInterfaces()
 * @returns {Object} Información de interfaces de red
 */
export function getBasicNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const networkInfo = {};

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                networkInfo[name] = {
                    ip: iface.address,
                    mac: iface.mac
                };
            }
        }
    }

    return networkInfo;
}

/**
 * Obtiene información detallada de red usando un script bash
 * @returns {Promise<Object>} Información detallada de interfaces de red
 */
export async function getDetailedNetworkInfo() {
    const scriptPath = join(__dirname, '../scripts/network_info.sh');

    try {
        await fs.access(scriptPath);
        await fs.chmod(scriptPath, 0o755);

        const { stdout, stderr } = await execAsync(scriptPath);

        if (stderr) {
            console.error('Error en la salida estándar:', stderr);
            return null;
        }

        return parseNetworkInfo(stdout);
    } catch (error) {
        console.error('Error al obtener información de red:', error);
        return getBasicNetworkInfo(); // Fallback a información básica
    }
}

/**
 * Parsea la salida del script de red
 * @param {string} output Salida del script
 * @returns {Object} Información parseada
 */
function parseNetworkInfo(output) {
    const interfaces = {};
    const lines = output.trim().split('\n');

    for (const line of lines) {
        const match = line.match(/^(\w+)=(\S+?)=(\d+\.\d+\.\d+\.\d+)/);
        if (match) {
            const [_, interfaceName, macAddress, ipAddress] = match;
            interfaces[interfaceName] = { mac: macAddress, ip: ipAddress };
        }
    }

    return interfaces;
}

/**
 * Obtiene la IP local principal
 * @returns {string} Dirección IP local
 */
export function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.internal === false && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

/**
 * Obtiene la dirección MAC principal
 * @returns {string} Dirección MAC
 */
export function getMACAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.internal === false && iface.family === 'IPv4') {
                return iface.mac;
            }
        }
    }
    return '00:00:00:00:00:00';
} 