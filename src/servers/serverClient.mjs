// serverClient.js
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appConfig } from '../config/appConfig.mjs';

// Importar todos los endpoints directamente
import systemEndpoints from '../routes/systemEndpoints.mjs';
import playlistUploadHandler from '../routes/playlistUploadHandler.mjs';
import vlcEndpoints from '../routes/vlcEndpoints.mjs';
import appEndpoints from '../routes/appEndpoints.mjs';
import fileHandler from '../routes/fileHandler.mjs';
import defaultEndpoints from '../routes/endpoints.mjs';
import activePlaylistEndpoints from '../routes/activePlaylistEndpoints.mjs';
import playlistRoutes from '../routes/playlistRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Definir el puerto usando la configuración o la variable de entorno
const port = process.env.PORT ? parseInt(process.env.PORT) : (appConfig.server.port || 3000);

// Variables globales para el servidor
export let app;
export let server;
export let networkInfo;

function createExpressApp() {
  app = express();
  // Configuración de middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Servir archivos estáticos desde la nueva ubicación
  app.use(express.static(join(__dirname, '../../public')));

  // Configurar todas las rutas directamente
  app.use('/api', defaultEndpoints);
  app.use('/api/system', systemEndpoints);
  app.use('/api/playlist', playlistUploadHandler);
  app.use('/api/vlc', vlcEndpoints);
  app.use('/api/app', appEndpoints);
  app.use('/api/files', fileHandler);
  app.use('/api/active-playlist', activePlaylistEndpoints);
  app.use('/api/snapshot', vlcEndpoints);
  app.use('/api/playlist-routes', playlistRoutes);

  return app;
}

async function getAllNetworkInfo() {
  try {
    // Obtener información de red
    networkInfo = await getNetworkInfo();
    if (!networkInfo) {
      throw new Error('No se pudo obtener la información de red');
    }
    return networkInfo;
  } catch (error) {
    console.error('Error al obtener información de red:', error);
    throw error;
  }
}

export async function initializeServer(customPort = port) {
  try {
    // Obtener información de red antes de iniciar el servidor
    await getAllNetworkInfo();

    app = createExpressApp();

    // Crear servidor HTTP
    server = createServer(app);

    return new Promise((resolve, reject) => {
      server.listen(customPort, '0.0.0.0', () => {
        // Asegúrate de que networkInfo esté definido antes de usarlo
        const ipAddress = networkInfo?.eth0?.ip || networkInfo?.wlan0?.ip || 'IP_LOCAL';
        console.log('╔═══════════════════════════════════════════════╗');
        console.log('║           SERVIDOR EXPRESS INICIADO           ║');
        console.log('╠═══════════════════════════════════════════════╣');
        console.log(`║ Puerto: ${customPort}                         ║`);
        console.log(`║ Local: http://localhost:${customPort}         ║`);
        console.log(`║ Red local: http://${ipAddress}:${customPort}  ║`);
        console.log('╚═══════════════════════════════════════════════╝');
        resolve(server);
      });

      server.on('error', (error) => {
        console.error('Error al iniciar el servidor:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error en la inicialización del servidor:', error);
    throw error;
  }
}

export function stopServer() {
  if (server) {
    server.close(() => {
      console.log('Servidor Express detenido correctamente');
      server = null;
    });
  }
}

// Manejar el cierre de la aplicación
process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(0);
});

export { port };