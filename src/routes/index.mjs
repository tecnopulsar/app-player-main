/**
 * Archivo central para la configuración de rutas API de la aplicación
 */

import systemEndpoints from './systemEndpoints.mjs';
import vlcEndpoints from './vlcEndpoints.mjs';
import appEndpoints from './appEndpoints.mjs';
import fileHandler from './fileHandler.mjs';
import defaultEndpoints from './endpoints.mjs';
import uploadPlaylistEndpoints from './uploadPlaylistEndpoints.mjs';
import activePlaylistEndpoints from './playlistEndpoints.mjs';
import { Router } from 'express';

// Crear el router principal para todas las rutas API
const router = Router();

// Endpoint de health check para verificación de disponibilidad
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Configurar todas las rutas con sus prefijos correspondientes
router.use('/', defaultEndpoints);           // Endpoints generales y raíz
router.use('/system', systemEndpoints);      // Control del sistema
router.use('/upload-playlist', uploadPlaylistEndpoints); // Gestión uploads de playlists
router.use('/vlc', vlcEndpoints);            // Control de VLC
router.use('/app', appEndpoints);            // Información de la aplicación
router.use('/files', fileHandler);           // Gestión de archivos
router.use('/playlist', playlistEndpoints); // Gestion de playlists
router.use('/snapshot', vlcEndpoints);       // Acceso directo a snapshot

// Exportar el router configurado como valor por defecto
export default router; 