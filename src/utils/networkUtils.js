// ✅

import os from 'os';

/**
 * Obtiene información detallada de la red usando solo Node.js (sin scripts externos).
 * @returns {Object} Información de interfaces de red (IPv4).
 */
export function getNetworkInfo() {
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
 * Obtiene la IP local principal.
 * @returns {string} Dirección IP local o '127.0.0.1' si no se encuentra.
 */
export function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback
}

/**
 * Obtiene la dirección MAC principal.
 * @returns {string} Dirección MAC o '00:00:00:00:00:00' si no se encuentra.
 */
export function getMACAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.mac;
            }
        }
    }
    return '00:00:00:00:00:00'; // Fallback
}
