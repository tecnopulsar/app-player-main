/**
 * Archivo central para la configuración de rutas API de la aplicación
 */

import systemEndpoints from './systemEndpoints.mjs';
import playlistUploadHandler from './playlistUploadHandler.mjs';
import vlcEndpoints from './vlcEndpoints.mjs';
import appEndpoints from './appEndpoints.mjs';
import fileHandler from './fileHandler.mjs';
import defaultEndpoints from './endpoints.mjs';
import activePlaylistEndpoints from './activePlaylistEndpoints.mjs';
import { Router } from 'express';

// Crear el router principal para todas las rutas API
const router = Router();

// Configurar todas las rutas con sus prefijos correspondientes
router.use('/', defaultEndpoints);           // Endpoints generales y raíz
router.use('/system', systemEndpoints);      // Control del sistema
router.use('/playlist', playlistUploadHandler); // Gestión de playlists
router.use('/vlc', vlcEndpoints);            // Control de VLC
router.use('/app', appEndpoints);            // Información de la aplicación
router.use('/files', fileHandler);           // Gestión de archivos
router.use('/active-playlist', activePlaylistEndpoints); // Playlist activa
router.use('/snapshot', vlcEndpoints);       // Acceso directo a snapshot

// Exportar el router configurado como valor por defecto
export default router; 