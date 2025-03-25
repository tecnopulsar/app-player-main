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
    console.log('📝 POST /api/active-playlist - Estableciendo playlist activa:', req.body);
    try {
        // Validación básica
        const { playlistName } = req.body;

        if (!playlistName) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el nombre de la playlist'
            });
        }

        // Obtener los datos de la playlist desde el sistema de archivos
        const playlistPath = await getPlaylistPath(playlistName);

        if (!playlistPath || !fs.existsSync(playlistPath)) {
            return res.status(404).json({
                success: false,
                message: `Playlist '${playlistName}' no encontrada en el sistema`
            });
        }

        // Contar archivos en la playlist
        let fileCount = 0;
        try {
            const playlistContent = await fsPromises.readFile(playlistPath, 'utf8');
            // Contar líneas que no sean comentarios o vacías
            fileCount = playlistContent.split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .length;
        } catch (err) {
            console.error(`Error al leer el contenido de la playlist: ${err.message}`);
        }

        // Obtener datos actuales de la playlist activa si existe
        let currentActivePlaylist = {
            playlistName: null,
            playlistPath: null,
            currentIndex: 0,
            fileCount: 0,
            isDefault: false,
            lastLoaded: null
        };

        try {
            // Primero verificamos si hay una playlist activa en el estado
            const systemState = await getSystemState();
            if (systemState && systemState.activePlaylist) {
                currentActivePlaylist = systemState.activePlaylist;
            }
        } catch (err) {
            console.error(`Error al obtener la playlist activa actual: ${err.message}`);
        }

        // Actualizar la playlist activa con todos los datos necesarios
        await updateActivePlaylist({
            playlistName,
            playlistPath,
            // Mantener el índice actual si estamos actualizando la misma playlist
            currentIndex: playlistName === currentActivePlaylist.playlistName ?
                currentActivePlaylist.currentIndex : 0,
            fileCount,
            // Por defecto no es la playlist por defecto a menos que se indique lo contrario
            isDefault: req.body.isDefault !== undefined ?
                req.body.isDefault : currentActivePlaylist.isDefault,
            // Actualizar timestamp
            lastLoaded: new Date().toISOString()
        });

        // Verificar que la información se guardó correctamente en systemState
        try {
            const { getSystemState } = await import('../utils/systemState.mjs');
            const systemState = await getSystemState();

            if (systemState && systemState.activePlaylist) {
                // Verificar que playlistPath se guardó correctamente
                if (!systemState.activePlaylist.playlistPath && playlistPath) {
                    console.warn(`⚠️ playlistPath no se guardó correctamente en systemState. Forzando actualización...`);

                    // Forzar actualización explícita del estado
                    const { saveSystemState } = await import('../utils/systemState.mjs');
                    systemState.activePlaylist.playlistPath = playlistPath;
                    await saveSystemState(systemState);

                    console.log(`✅ Actualización forzada de playlistPath: ${playlistPath}`);
                }
            }
        } catch (err) {
            console.error(`❌ Error al verificar systemState después de actualizar: ${err.message}`);
        }

        // Intentar cargar la playlist en VLC
        let vlcRestarted = false;
        let vlcPlaylistLoaded = false;

        try {
            const vlc = VLCPlayer.getInstance();
            // Primer intento - carga normal
            vlcPlaylistLoaded = await vlc.loadPlaylist(playlistPath, false);

            // Si falló, intentar con reinicio forzado
            if (!vlcPlaylistLoaded) {
                console.log('🔄 El primer intento de carga falló, intentando con reinicio forzado...');
                vlcRestarted = true;
                vlcPlaylistLoaded = await vlc.loadPlaylist(playlistPath, true);
            }

            if (vlcPlaylistLoaded) {
                console.log(`✅ Playlist '${playlistName}' cargada exitosamente en VLC`);
            } else {
                console.error(`❌ No se pudo cargar la playlist '${playlistName}' en VLC después de múltiples intentos`);
            }
        } catch (error) {
            console.error(`🛑 Error al cargar la playlist en VLC: ${error.message}`);
        }

        // Obtener los datos actualizados para la respuesta
        const updatedActivePlaylist = await getActivePlaylist();

        res.json({
            success: true,
            message: `Playlist '${playlistName}' establecida como activa${vlcPlaylistLoaded ? ' y cargada en VLC' : ''}${vlcRestarted ? ' (con reinicio)' : ''}`,
            activePlaylist: updatedActivePlaylist,
            vlcStatus: {
                loaded: vlcPlaylistLoaded,
                restarted: vlcRestarted
            }
        });
    } catch (error) {
        console.error('❌ Error al establecer playlist activa:', error);
        res.status(500).json({
            success: false,
            message: `Error al establecer playlist activa: ${error.message}`
        });
    }
});