import express from 'express';
import cors from 'cors';
import { appConfig } from '../config/appConfig.mjs';

/**
 * Crea y configura una aplicación Express
 * @returns {express.Application} Aplicación Express configurada
 */
export function createExpressApp() {
    // Inicializar la aplicación Express
    const app = express();

    // Configuración del middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.static('public'));

    return app;
}

/**
 * Añade rutas para la configuración pública y el estado
 * @param {express.Application} app - Aplicación Express
 */
export function addConfigRoutes(app) {
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
} 