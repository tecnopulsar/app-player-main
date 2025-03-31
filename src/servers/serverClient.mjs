// serverClient.js
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appConfig } from '../config/appConfig.mjs';
import { getNetworkInfo } from '../utils/networkUtils.mjs';

// Importar el router centralizado
import router from '../routes/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Definir el puerto usando la configuración
export const portAppServer = appConfig.appServer.port;

// Variables globales para el servidor
export let app;
export let server;
export let networkInfo;
export let socketClient; // Cliente Socket.IO

function createExpressApp() {
  app = express();
  // Configuración de middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Servir archivos estáticos desde la ubicación public
  app.use(express.static(join(__dirname, '../../public')));

  // Configurar ruta principal para servir index.html
  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '../../public/index.html'));
  });

  // Usar el router centralizado para todas las rutas API
  app.use('/api', router);

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

export async function initAppServer(port = portAppServer) {
  try {
    // Obtener información de red antes de iniciar el servidor
    await getAllNetworkInfo();

    app = createExpressApp();

    // Crear servidor HTTP
    server = createServer(app);

    return new Promise((resolve, reject) => {
      server.listen(port, '0.0.0.0', () => {
        // Asegúrate de que networkInfo esté definido antes de usarlo
        const ipAddress = networkInfo?.eth0?.ip || networkInfo?.wlan0?.ip || 'IP_LOCAL';
        console.log('╔═══════════════════════════════════════════════╗');
        console.log('║           SERVIDOR EXPRESS INICIADO           ║');
        console.log('╠═══════════════════════════════════════════════╣');
        console.log(`║ Puerto: ${port}                               ║`);
        console.log(`║ Local: http://localhost:${port}               ║`);
        console.log(`║ Red local: http://${ipAddress}:${port}        ║`);
        console.log('╚═══════════════════════════════════════════════╝');

        // Iniciar el monitoreo en tiempo real desde monitorService
        try {
          import('../services/monitorService.mjs')
            .then(monitor => {
              monitor.startMonitoring();
              console.log('✅ Servicio de monitoreo en tiempo real iniciado');
            })
            .catch(err => {
              console.error('Error al cargar el servicio de monitoreo:', err);
            });
        } catch (error) {
          console.warn('No se pudo iniciar el servicio de monitoreo:', error.message);
        }

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

export function stopAppServer() {
  if (server) {
    console.log('Deteniendo servidor Express...');

    // Detener el servicio de monitoreo
    try {
      import('../services/monitorService.mjs')
        .then(monitor => {
          monitor.stopMonitoring();
          console.log('Servicio de monitoreo detenido');
        })
        .catch(err => {
          console.error('Error al detener el servicio de monitoreo:', err);
        });
    } catch (error) {
      console.warn('Error al detener el servicio de monitoreo:', error.message);
    }

    // Desconectar cliente Socket.IO
    disconnectSocketClient();

    // Cerrar el servidor HTTP
    server.close(() => {
      console.log('Servidor Express detenido correctamente');
      server = null;
    });
  }
}

// Manejar el cierre de la aplicación
process.on('SIGINT', () => {
  stopAppServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAppServer();
  process.exit(0);
});