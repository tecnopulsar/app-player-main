import { Router } from 'express';
import { getActivePlaylist, updateActivePlaylist } from '../utils/activePlaylist.mjs';
import { getPlaylistDetails } from './vlcEndpoints.mjs';
import { VLCPlayer } from '../lib/vlcPlayer.js';

// Acceso seguro a global
let global;
try {
    // En un entorno ESM, no podemos usar require directamente
    const electron = await import('electron');
    global = electron.default;
} catch (e) {
    console.log('ℹ️ Módulo Electron no disponible en este contexto. Esto es normal en un entorno de servidor.');
    global = { mainWindow: null, vlcPlayer: null };
}

const router = Router();
let vlcInstance = null;

/**
 * @swagger
 * /api/active-playlist:
 *   get:
 *     summary: Obtiene la información de la playlist actualmente activa
 */
router.get('/', async (req, res) => {
    try {
        const activePlaylist = await getActivePlaylist();
        res.json({
            success: true,
            activePlaylist
        });
    } catch (error) {
        console.error('Error al obtener la playlist activa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la playlist activa',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/active-playlist:
 *   post:
 *     summary: Actualiza la playlist activa
 *     parameters:
 *       - name: playlistName
 *         in: body
 *         required: true
 *         type: string
 *         description: Nombre de la playlist a establecer como activa
 */
router.post('/', async (req, res) => {
    try {
        const { playlistName } = req.body;

        if (!playlistName) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el nombre de la playlist'
            });
        }

        // Obtener los detalles de la playlist solicitada
        const playlist = await getPlaylistDetails(playlistName);

        if (!playlist) {
            return res.status(404).json({
                success: false,
                message: `Playlist '${playlistName}' no encontrada`
            });
        }

        // Actualizar la playlist activa
        const updatedPlaylist = await updateActivePlaylist({
            playlistName: playlistName,
            playlistPath: playlist.path
        });

        // Verificar si necesitamos iniciar o reiniciar VLC
        try {
            // Comprobar si VLC ya está iniciado
            let needRestartVLC = false;

            // Verificar si hay una instancia global de VLC 
            if (!global.vlcPlayer) {
                console.log('ℹ️ No hay instancia de VLC. Iniciando una nueva...');

                // Crear una nueva instancia de VLC si no existe
                if (!vlcInstance) {
                    vlcInstance = VLCPlayer.getInstance();
                }

                // Iniciar VLC con la playlist actualizada
                const startSuccess = await vlcInstance.start();

                if (startSuccess) {
                    console.log(`✅ VLC iniciado correctamente con la playlist: ${playlistName}`);

                    // Asignar la instancia a la variable global para que otros componentes puedan acceder
                    global.vlcPlayer = vlcInstance;

                    // Notificar al proceso principal que VLC ha sido iniciado
                    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
                        global.mainWindow.webContents.send('vlc-started', {
                            success: true,
                            message: `VLC iniciado con la playlist: ${playlistName}`,
                            playlist: updatedPlaylist
                        });
                    }
                } else {
                    console.error('❌ Error al iniciar VLC');
                    return res.status(500).json({
                        success: false,
                        message: 'Error al iniciar VLC con la playlist actualizada',
                        activePlaylist: updatedPlaylist
                    });
                }
            } else {
                console.log('ℹ️ VLC ya está iniciado. Actualizando playlist...');

                // Si VLC ya está iniciado, simplemente cargar la nueva playlist
                if (global.vlcPlayer.loadPlaylist) {
                    await global.vlcPlayer.loadPlaylist(playlist.path);
                    console.log(`✅ Playlist actualizada en VLC: ${playlistName}`);
                } else {
                    // Si no tiene el método loadPlaylist, reiniciar VLC
                    if (vlcInstance) {
                        await vlcInstance.stop();
                    }

                    vlcInstance = VLCPlayer.getInstance();
                    const startSuccess = await vlcInstance.start();

                    if (startSuccess) {
                        console.log(`✅ VLC reiniciado con la nueva playlist: ${playlistName}`);
                        global.vlcPlayer = vlcInstance;
                    } else {
                        console.error('❌ Error al reiniciar VLC');
                    }
                }

                // Notificar al proceso principal sobre la actualización
                if (global.mainWindow && !global.mainWindow.isDestroyed()) {
                    global.mainWindow.webContents.send('playlist-updated', {
                        success: true,
                        message: `Playlist actualizada: ${playlistName}`,
                        playlist: updatedPlaylist
                    });
                }
            }

            return res.json({
                success: true,
                message: `Playlist '${playlistName}' establecida como activa y cargada en VLC`,
                activePlaylist: updatedPlaylist
            });

        } catch (vlcError) {
            console.error('Error al gestionar VLC:', vlcError);

            // Aunque hubo error con VLC, la playlist fue actualizada
            return res.json({
                success: true,
                warning: `La playlist fue establecida pero hubo un error al iniciar/actualizar VLC: ${vlcError.message}`,
                message: `Playlist '${playlistName}' establecida como activa`,
                activePlaylist: updatedPlaylist
            });
        }
    } catch (error) {
        console.error('Error al actualizar la playlist activa:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar la playlist activa',
            error: error.message
        });
    }
});

export default router; 