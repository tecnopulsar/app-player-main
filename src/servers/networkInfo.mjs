import { promisify } from 'util';
import { exec } from 'node:child_process'

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

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

export async function getNetworkInfo() {
    const scriptPath = path.join(__dirname, '../scripts/network_info.sh');

    try {
        // Verificar si el script existe
        await fs.access(scriptPath);

        // Dar permisos de ejecución al script
        await fs.chmod(scriptPath, 0o755);

        const { stdout, stderr } = await execAsync(scriptPath);

        if (stderr) {
            console.error('Error en la salida estándar:', stderr);
            return null;
        }

        return parseNetworkInfo(stdout);
    } catch (error) {
        console.error('Error al obtener información de red:', error);
        return null;
    }
}