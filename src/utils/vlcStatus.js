import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { appConfig } from '../config/appConfig.mjs';
import fs from 'fs/promises';
import path from 'path';

// Configuración para la API de VLC
const VLC_HOST = 'localhost';
const VLC_PORT = 8080;
const VLC_PASSWORD = 'tecno';

/**
 * Obtiene el estado actual de VLC
 * @returns {Promise<Object>} Estado de VLC
 */
export async function getVLCStatus() {
    try {
        const response = await axios.get(`http://${VLC_HOST}:${VLC_PORT}/requests/status.xml`, {
            auth: {
                username: '',
                password: VLC_PASSWORD
            },
            timeout: 3000
        });

        // Convertir XML a JSON
        const result = await parseStringPromise(response.data);

        // Extraer información relevante
        const state = result.root?.state?.[0] || 'stopped';
        const currentItem = result.root?.information?.[0]?.category?.[0]?.info?.find(i => i.$.name === 'filename')?._;
        const time = result.root?.time?.[0];
        const length = result.root?.length?.[0];

        return {
            status: state,
            playing: state === 'playing',
            paused: state === 'paused',
            stopped: state === 'stopped',
            currentItem,
            time: time ? parseInt(time) : 0,
            length: length ? parseInt(length) : 0,
            connected: true
        };
    } catch (error) {
        console.error('Error al obtener estado de VLC:', error.message);
        return {
            status: 'disconnected',
            playing: false,
            paused: false,
            stopped: true,
            currentItem: null,
            time: 0,
            length: 0,
            connected: false
        };
    }
}

/**
 * Obtiene información sobre la playlist actual
 * @returns {Promise<Object>} Información de la playlist
 */
export async function getPlaylistInfo() {
    try {
        // Obtener la ruta de la playlist actual CORREGIR
        const playlistPath = path.join(appConfig.paths.playlists, 'playlistDefecto', 'playlistDefecto.m3u');

        // Verificar que el archivo existe
        await fs.access(playlistPath);

        // Leer el contenido de la playlist
        const playlistContent = await fs.readFile(playlistPath, 'utf8');

        // Extraer los nombres de archivos (ignorando comentarios que empiezan con #)
        const files = playlistContent
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => path.basename(line.trim()));

        return {
            name: 'playlistDefecto',
            path: playlistPath,
            files,
            totalItems: files.length
        };
    } catch (error) {
        console.error('Error al obtener información de la playlist:', error.message);
        return {
            name: 'Desconocida',
            path: null,
            files: [],
            totalItems: 0
        };
    }
} 