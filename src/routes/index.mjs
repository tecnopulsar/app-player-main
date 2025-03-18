/**
 * Archivo de barril para exportar todas las rutas de la aplicación
 */

import systemEndpoints from './systemEndpoints.mjs';
import playlistUploadHandler from './playlistUploadHandler.mjs';
import vlcEndpoints from './vlcEndpoints.mjs';
import appEndpoints from './appEndpoints.mjs';
import fileHandler from './fileHandler.mjs';
import defaultEndpoints from './endpoints.mjs';

// Exportar todas las rutas individualmente
export {
    systemEndpoints,
    playlistUploadHandler,
    vlcEndpoints,
    appEndpoints,
    fileHandler,
    defaultEndpoints
};

// Exportar un router combinado con todas las rutas
import express from 'express';
const router = express.Router();

router.use('/', defaultEndpoints);
router.use('/system', systemEndpoints);
router.use('/playlist', playlistUploadHandler);
router.use('/vlc', vlcEndpoints);
router.use('/app', appEndpoints);
router.use('/files', fileHandler);

export { router as endpoints }; 