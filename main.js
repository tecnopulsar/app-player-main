// main.js
import { app, ipcMain, BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import { ServerManager } from './src/lib/serverManager.js';
import { WindowManager } from './src/windows/windowManager.js';
import { VLCPlayer } from './src/lib/vlcPlayer.js';
import { appConfig } from './src/config/appConfig.mjs';
import { initializeServer, stopServer } from './src/servers/serverClient.mjs'; // Importar desde serverClient.js
import { setupDirectories } from './src/utils/setupDirectories.js';
import express from 'express';
import endpoints from './src/routes/endpoints.mjs';
import vlcEndpoints from './src/routes/vlcEndpoints.mjs';
import systemEndpoints from './src/routes/systemEndpoints.mjs';
import cors from 'cors';
import fileHandler from './src/routes/fileHandler.mjs'; // Importar el router de manejo de archivos
import appEndpoints from './src/routes/appEndpoints.mjs'; // Importar el nuevo router
import playlistUploadHandler from './src/routes/playlistUploadHandler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear instancia de ServerManager con el puerto configurado
const port = appConfig.server.port || 3000;
const serverManager = new ServerManager(port);
const windowManager = new WindowManager();

// Mantener una referencia global del objeto window
let mainWindow;
let vlcPlayer;

async function createWindow() {
  try {
    await setupDirectories();

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

    // Configuración de rutas
    app.use('/api', endpoints);
    app.use('/api/app', appEndpoints);
    app.use('/api/system', systemEndpoints);
    app.use('/api/files', fileHandler);
    app.use('/api/playlist', playlistUploadHandler);
    app.use('/api/vlc', vlcEndpoints);

    // Iniciar el servidor con la app configurada
    await initializeServer(port, app);

    // Cargar el archivo index.html
    await mainWindow.loadFile('index.html');

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
  stopServer(); // Detener el servidor desde serverClient.js

  if (vlcPlayer) {
    vlcPlayer.stop();
  }
  windowManager.closePlayerWindow(); // Asegurar que VLC se cierre
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