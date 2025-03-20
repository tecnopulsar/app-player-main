import express from 'express';
import cors from 'cors';
import { appConfig } from './config/appConfig.mjs';
import { setupDirectories } from './utils/setupDirectories.js';
import playlistService from './services/playlistService.mjs';
import playlistRoutes from './routes/playlistRoutes.mjs';
import fs from 'fs';
import path from 'path';

// Inicializar la aplicación Express
const app = express();
const PORT = appConfig.server.port || 3000;

// Configuración del middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurar rutas
app.use('/api/playlist', playlistRoutes);

// Ruta para verificar el estado del servidor
app.get('/api/status', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Ruta para obtener la configuración pública
app.get('/api/config', (req, res) => {
    const publicConfig = {
        app: {
            name: appConfig.app.name,
            version: appConfig.app.version,
            defaultPlaylist: appConfig.app.defaultPlaylist
        }
    };
    res.json(publicConfig);
});

// Verificación explícita del archivo activePlaylist.json
async function verifyActivePlaylistFile() {
    try {
        const activePlaylistFile = path.join(process.cwd(), 'src/config/activePlaylist.json');

        if (!fs.existsSync(activePlaylistFile)) {
            console.log('⚠️ No se encontró archivo de playlist activa, creando uno nuevo...');

            // Crear archivo con datos nulos
            const emptyPlaylist = {
                playlistName: null,
                playlistPath: null,
                lastLoaded: null,
                isActive: false,
                isDefault: false
            };

            // Asegurar que el directorio existe
            const activePlaylistDir = path.dirname(activePlaylistFile);
            if (!fs.existsSync(activePlaylistDir)) {
                fs.mkdirSync(activePlaylistDir, { recursive: true });
            }

            // Crear el archivo
            fs.writeFileSync(activePlaylistFile, JSON.stringify(emptyPlaylist, null, 2));
            console.log('✅ Archivo de playlist activa creado con valores iniciales nulos');
        } else {
            console.log('✅ Archivo de playlist activa verificado correctamente');
        }

        return true;
    } catch (error) {
        console.error('❌ Error al verificar/crear archivo de playlist activa:', error);
        return false;
    }
}

// Inicializar directorios necesarios y iniciar el servidor
async function startServer() {
    try {
        // Verificar archivo de playlist activa
        await verifyActivePlaylistFile();

        // Crear directorios necesarios
        await setupDirectories();

        // Inicializar el servicio de playlist
        await playlistService.initialize();

        // Iniciar el servidor
        app.listen(PORT, () => {
            console.log(`✅ Servidor iniciado en http://localhost:${PORT}`);

            // Verificar la playlist activa al iniciar
            playlistService.getActivePlaylist()
                .then(activePlaylist => {
                    // Mostrar información sobre el estado actual
                    if (!activePlaylist || activePlaylist.playlistName === null) {
                        console.log('ℹ️ Estado actual: No hay playlist configurada');
                    } else {
                        console.log(`ℹ️ Estado actual: Playlist configurada '${activePlaylist.playlistName}'`);

                        // Intentar cargar la playlist solo si hay una configurada
                        playlistService.loadActivePlaylist()
                            .then(result => {
                                if (result && result.playlistName) {
                                    console.log(`✅ Playlist '${result.playlistName}' cargada correctamente`);
                                } else if (result && result.errorMessage) {
                                    console.log(`⚠️ No se pudo cargar la playlist: ${result.errorMessage}`);
                                } else {
                                    console.log('⚠️ No se cargó ninguna playlist');
                                }
                            })
                            .catch(error => {
                                console.error('❌ Error al cargar la playlist:', error);
                            });
                    }
                })
                .catch(error => {
                    console.error('❌ Error al verificar la playlist activa:', error);
                });
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Iniciar el servidor
startServer(); 