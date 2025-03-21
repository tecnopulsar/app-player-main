import { appConfig } from '../config/appConfig.mjs';
import { createExpressApp, addConfigRoutes } from '../utils/expressUtils.mjs';
import { initializePlaylistSystem } from '../services/playlistSystemService.mjs';
import playlistRoutes from '../routes/playlistRoutes.mjs';

/**
 * Inicia un servidor Express independiente
 * @param {number} port - Puerto en el que se iniciará el servidor
 * @returns {Promise<{server: object, app: object}>} Servidor y aplicación Express
 */
export async function startStandaloneServer(port = appConfig.server.port || 3000) {
    try {
        // Inicializar el sistema de playlists
        await initializePlaylistSystem();

        // Crear la aplicación Express
        const app = createExpressApp();

        // Añadir rutas para la configuración y estado
        addConfigRoutes(app);

        // Configurar rutas de playlist
        app.use('/api/playlist', playlistRoutes);

        // Iniciar el servidor
        return new Promise((resolve) => {
            const server = app.listen(port, () => {
                console.log(`✅ Servidor independiente iniciado en http://localhost:${port}`);
                resolve({ server, app });
            });
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor independiente:', error);
        throw error;
    }
}

export default {
    startStandaloneServer
}; 