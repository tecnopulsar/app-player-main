// serverClient.js
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import endpoints from '../routes/endpoints.mjs';
import { getNetworkInfo } from './networkInfo.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appConfig } from '../config/appConfig.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Definir el puerto usando la configuración o la variable de entorno
const port = process.env.PORT ? parseInt(process.env.PORT) : (appConfig.server.port || 3000);

// Variables globales para el servidor
export let networkInfo;
let device;
let server;

function createApp() {
  const app = express();

  // Configuración de middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Servir archivos estáticos desde la nueva ubicación
  app.use(express.static(join(__dirname, '../../public')));

  return app;
}

async function getAllNetworkInfo() {
  try {
    // Obtener información de red
    networkInfo = await getNetworkInfo();
    if (!networkInfo) {
      throw new Error('No se pudo obtener la información de red');
    }

    // Configurar el dispositivo
    device = {
      id: '',
      name: 'Monitor 1',
      urlServer: 'http://192.168.1.3:3001',
      networkInfo,
      heartbeatInterval: 25000,
    };

    return networkInfo;
  } catch (error) {
    console.error('Error al obtener información de red:', error);
    throw error;
  }
}

export async function initializeServer(customPort = port, app = null) {
  try {
    // Obtener información de red antes de iniciar el servidor
    await getAllNetworkInfo();

    if (server) {
      console.log('El servidor ya está en ejecución');
      return server;
    }

    // Si no se proporciona una app, crear una nueva
    if (!app) {
      app = createApp();

      // Configurar rutas solo si estamos creando una nueva app
      app.use('/api', endpoints);
      app.use('/api/upload', uploadHandler);
    }

    // Crear servidor HTTP
    server = createServer(app);

    return new Promise((resolve, reject) => {
      server.listen(customPort, '0.0.0.0', () => {
        console.log('╔═══════════════════════════════════════════════╗');
        console.log('║           SERVIDOR EXPRESS INICIADO           ║');
        console.log('╠═══════════════════════════════════════════════╣');
        console.log(`║ Puerto: ${customPort}`);
        console.log(`║ Local: http://localhost:${customPort}`);

        // Asegúrate de que networkInfo esté definido antes de usarlo
        const ipAddress = networkInfo?.eth0?.ip || networkInfo?.wlan0?.ip || 'IP_LOCAL';
        console.log(`║ Red local: http://${ipAddress}:${customPort}`);
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