// main.js
import { app, ipcMain, BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import { WindowManager } from './src/windows/windowManager.js';
import { VLCPlayer } from './src/lib/vlcPlayer.js';
import { appConfig } from './src/config/appConfig.mjs';
import { initializeServer, stopServer } from './src/servers/serverClient.mjs';
import { setupDirectories } from './src/utils/setupDirectories.js';
import express from 'express';
import endpoints from './src/routes/endpoints.mjs';
import vlcEndpoints from './src/routes/vlcEndpoints.mjs';
import systemEndpoints from './src/routes/systemEndpoints.mjs';
import cors from 'cors';
import fileHandler from './src/routes/fileHandler.mjs';
import appEndpoints from './src/routes/appEndpoints.mjs';
import playlistUploadHandler from './src/routes/playlistUploadHandler.mjs';
import os from 'os';
import fs from 'fs/promises';
import ControllerClient from './src/clients/controllerClient.mjs';

// Deshabilitar la aceleración por hardware
app.disableHardwareAcceleration();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar el puerto
const port = appConfig.server.port || 3000;
const windowManager = new WindowManager();

// Mantener una referencia global del objeto window
let mainWindow;
let vlcPlayer;
let controllerClient;

// Función para obtener información de red
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const networkInfo = {};

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkInfo[name] = {
          ip: iface.address,
          mac: iface.mac
        };
      }
    }
  }

  return networkInfo;
}

// Función para enviar logs a la ventana de renderizado
function sendLog(message, type = 'info') {
  if (mainWindow) {
    mainWindow.webContents.send('log', { message, type });
  }
}

// Interceptar logs de la consola
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

console.log = (...args) => {
  originalConsole.log(...args);
  sendLog(args.join(' '), 'info');
};

console.error = (...args) => {
  originalConsole.error(...args);
  sendLog(args.join(' '), 'error');
};

console.warn = (...args) => {
  originalConsole.warn(...args);
  sendLog(args.join(' '), 'warning');
};

console.info = (...args) => {
  originalConsole.info(...args);
  sendLog(args.join(' '), 'info');
};

// Función para renderizar plantillas
async function renderTemplate(templatePath, data) {
  try {
    let template = await fs.readFile(templatePath, 'utf-8');

    // Reemplazar todas las variables en el template
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, value);
    }

    return template;
  } catch (error) {
    console.error('Error al renderizar template:', error);
    throw error;
  }
}

async function createWindow() {
  try {
    await setupDirectories();

    // Inicializar el cliente de controlador
    console.log('\n=== Iniciando Cliente de Controlador ===');
    controllerClient = new ControllerClient('http://localhost:3001');
    controllerClient.connect();
    console.log('=====================================\n');

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    vlcPlayer = new VLCPlayer();
    const success = await vlcPlayer.start();
    if (!success) {
      console.error('Error al iniciar VLC');
    }

    // Crear y configurar la aplicación Express
    const app = express();

    // Configuración de middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors());
    app.use(express.static(path.join(__dirname, 'public')));

    // Ruta principal para el dashboard
    app.get('/', async (req, res) => {
      try {
        const templatePath = path.join(__dirname, 'index.html');
        const data = {
          port: port,
          directorioVideos: path.join(__dirname, 'videos'),
          networkInfo: JSON.stringify(getNetworkInfo()),
          year: new Date().getFullYear()
        };

        const html = await renderTemplate(templatePath, data);
        res.send(html);
      } catch (error) {
        console.error('Error al renderizar el dashboard:', error);
        res.status(500).send('Error al cargar el dashboard');
      }
    });

    // Configuración de rutas API
    app.use('/api', endpoints);
    app.use('/api/app', appEndpoints);
    app.use('/api/system', systemEndpoints);
    app.use('/api/files', fileHandler);
    app.use('/api/playlist', playlistUploadHandler);
    app.use('/api/vlc', vlcEndpoints);

    // Iniciar el servidor con la app configurada
    await initializeServer(port, app);

    // Cargar el archivo index.html
    await mainWindow.loadURL(`http://localhost:${port}`);

    // Pasar variables al frontend
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        window.port = ${port};
        window.directorioVideos = '${path.join(__dirname, 'videos')}';
      `);
    });

    // Enviar logs iniciales
    sendLog('Aplicación iniciada', 'success');
    sendLog(`Servidor Express corriendo en puerto ${port}`, 'info');
    sendLog(`Directorio de videos: ${path.join(__dirname, 'videos')}`, 'info');
    sendLog('VLC está funcionando correctamente', 'success');

  } catch (error) {
    console.error('Error en la inicialización:', error);
    if (mainWindow) {
      mainWindow.webContents.send('initialization-error', error.message);
    }
  }
}

// Este método se llamará cuando Electron haya terminado
// la inicialización y esté listo para crear ventanas del navegador.
app.whenReady().then(createWindow);

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  // Detener el servidor
  console.log('Deteniendo servidor web...');
  stopServer();

  // Desconectar el cliente de controlador
  if (controllerClient) {
    controllerClient.disconnect();
  }

  if (vlcPlayer) {
    vlcPlayer.stop();
  }
  windowManager.closePlayerWindow();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promesa rechazada no manejada:', error);
});

// Manejar el evento 'start-timer' desde el frontend
ipcMain.on('start-timer', (event) => {
  exec(`python3 ${join(__dirname, 'contador.py')}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error ejecutando el script: ${error.message}`);
      event.reply('timer-completed', 'Error al iniciar el contador');
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      event.reply('timer-completed', 'Error en el script');
      return;
    }
    console.log(`stdout: ${stdout}`);
    event.reply('timer-completed', '¡Tiempo cumplido!');
  });
});

// Manejar el evento para iniciar el reproductor
ipcMain.on('start-player', async () => {
  if (vlcPlayer) {
    const success = await vlcPlayer.start();
    if (!success && mainWindow) {
      mainWindow.webContents.send('player-error', 'Error al iniciar el reproductor');
    }
  } else {
    console.error('VLC Player no está inicializado');
    if (mainWindow) {
      mainWindow.webContents.send('player-error', 'El reproductor no está inicializado');
    }
  }
});

// Manejar el evento para detener el reproductor
ipcMain.on('stop-player', () => {
  if (vlcPlayer) {
    vlcPlayer.stop();
  } else {
    windowManager.closePlayerWindow();
  }
});

// Manejar el evento para alternar el audio
ipcMain.on('toggle-audio', () => {
  if (vlcPlayer) {
    vlcPlayer.toggleAudio();
  } else {
    windowManager.togglePlayerAudio();
  }
});

// Manejo de eventos IPC
ipcMain.on('some-event', (event) => {
  if (mainWindow) {
    mainWindow.webContents.send('response-event', 'data');
  } else {
    console.error('La ventana principal no está disponible');
  }
});