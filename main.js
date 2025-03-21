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
import router from './src/routes/index.mjs';
import cors from 'cors';
import ControllerClient from './src/clients/controllerClient.mjs';
import { getVLCStatus, getPlaylistInfo } from './src/utils/vlcStatus.js';
import { getBasicNetworkInfo } from './src/utils/networkUtils.js';
import { renderTemplate } from './src/utils/templateUtils.js';
import { initLogs, sendLog, restoreLogs } from './src/utils/logUtils.js';
import { setControllerClient } from './src/routes/vlcEndpoints.mjs';
import { getActivePlaylist } from './src/utils/activePlaylist.mjs';

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

// Hacer la ventana global para poder acceder a ella desde el controllerClient
global.mainWindow = null;
global.vlcPlayer = null;

async function createWindow() {
  try {
    await setupDirectories();

    // Verificar que exista el archivo de playlist activa
    let playlistIsValid = false;
    let activePlaylist = null;

    try {
      const { activePlaylistExists, createEmptyActivePlaylist, getActivePlaylist } = await import('./src/utils/activePlaylist.mjs');

      // Verificar si el archivo existe, crearlo si no
      const exists = await activePlaylistExists();

      if (!exists) {
        console.log('⚠️ No se encontró archivo de playlist activa, creando uno nuevo...');
        await createEmptyActivePlaylist();
        console.log('ℹ️ No hay playlist configurada. No se iniciará VLC.');
      } else {
        // Obtener la playlist activa
        activePlaylist = await getActivePlaylist();
        console.log('✅ Archivo de playlist activa verificado correctamente');

        // Verificar si hay datos válidos para iniciar VLC
        if (!activePlaylist || activePlaylist.playlistName === null) {
          console.log('ℹ️ No hay playlist configurada actualmente. No se iniciará VLC.');
        } else {
          console.log(`ℹ️ Playlist activa configurada: ${activePlaylist.playlistName}`);
          playlistIsValid = true; // Marcar que hay una playlist válida
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo verificar el archivo de playlist activa:', error);
      console.log('ℹ️ Continuando sin cargar playlist ni iniciar VLC...');
    }

    // Inicializar el cliente de controlador
    console.log('\n=== Iniciando Cliente de Controlador ===');
    controllerClient = new ControllerClient('http://localhost:3001');
    controllerClient.connect();

    // Configurar el cliente controlador para los endpoints de VLC
    setControllerClient(controllerClient);

    console.log('=====================================\n');

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // Hacer la ventana accesible globalmente
    global.mainWindow = mainWindow;

    // Inicializar el sistema de logs
    initLogs(mainWindow);

    // Solo iniciar VLC si hay una playlist válida configurada
    if (playlistIsValid) {
      vlcPlayer = new VLCPlayer();
      const success = await vlcPlayer.start();
      if (!success) {
        console.error('❌ Error al iniciar VLC');
        sendLog('Error al iniciar VLC', 'error');
      } else {
        console.log('✅ VLC iniciado correctamente con la playlist configurada');
        sendLog('VLC iniciado correctamente', 'success');
      }
    } else {
      console.log('ℹ️ VLC no se iniciará hasta que se configure una playlist válida');
      sendLog('VLC no iniciado - No hay playlist configurada', 'warning');
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
        // Obtener el estado de VLC y la información de la playlist
        // Si VLC no está iniciado, proporcionar un estado predeterminado
        const vlcStatus = vlcPlayer ? await getVLCStatus() : {
          status: 'stopped',
          message: 'No hay playlist configurada',
          playing: false,
          position: 0,
          length: 0
        };

        const playlistInfo = activePlaylist || {
          playlistName: null,
          playlistPath: null,
          lastLoaded: null,
          message: 'No hay playlist configurada'
        };

        const templatePath = path.join(__dirname, 'index.html');
        const data = {
          port: port,
          directorioVideos: path.join(__dirname, 'videos'),
          networkInfo: JSON.stringify(getBasicNetworkInfo()),
          vlcStatus: JSON.stringify(vlcStatus),
          playlistInfo: JSON.stringify(playlistInfo),
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
    app.use('/api', router);

    // Iniciar el servidor con la app configurada
    await initializeServer(port, app);

    // Cargar el archivo index.html
    await mainWindow.loadURL(`http://localhost:${port}`);

    // Pasar variables al frontend
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        window.port = ${port};
        window.directorioVideos = '${path.join(__dirname, 'videos')}';
        window.playlistConfigured = ${playlistIsValid};
      `);
    });

    // Enviar logs iniciales
    sendLog('Aplicación iniciada', 'success');
    sendLog(`Servidor Express corriendo en puerto ${port}`, 'info');
    sendLog(`Directorio de videos: ${path.join(__dirname, 'videos')}`, 'info');

    // Solo mostrar estado de VLC si se inició
    if (playlistIsValid && vlcPlayer) {
      sendLog('VLC está funcionando correctamente', 'success');
    } else {
      sendLog('VLC no iniciado - No hay playlist configurada', 'warning');
    }

    // Iniciar un intervalo para actualizar el estado de VLC en el frontend
    const updateVLCStatusInterval = setInterval(async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          // Si VLC no está inicializado, proporcionar un estado predeterminado
          const vlcStatus = vlcPlayer ? await getVLCStatus() : {
            status: 'stopped',
            message: 'No hay playlist configurada',
            playing: false,
            position: 0,
            length: 0
          };

          const playlistInfo = activePlaylist || {
            playlistName: null,
            playlistPath: null,
            lastLoaded: null,
            message: 'No hay playlist configurada'
          };

          mainWindow.webContents.send('vlc-status-update', { vlcStatus, playlistInfo });
        } catch (error) {
          console.error('Error al actualizar estado de VLC:', error);
        }
      } else {
        clearInterval(updateVLCStatusInterval);
      }
    }, 5000); // Actualizar cada 5 segundos

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
  // Restaurar las funciones originales del console
  restoreLogs();

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
  // Verificar si VLC no está iniciado por falta de playlist
  if (!vlcPlayer) {
    console.log('⚠️ No se puede iniciar VLC: No hay playlist configurada');
    if (mainWindow) {
      mainWindow.webContents.send('player-error', 'No se puede iniciar el reproductor: No hay playlist configurada');
    }
    return;
  }

  const success = await vlcPlayer.start();
  if (!success && mainWindow) {
    mainWindow.webContents.send('player-error', 'Error al iniciar el reproductor');
  }
});

// Manejar el evento para iniciar VLC con una playlist específica
ipcMain.on('start-vlc-with-playlist', async (event, data) => {
  console.log(`📣 Evento recibido para iniciar VLC con playlist: ${data.playlistName}`);

  try {
    // Si ya existe una instancia de VLC, detenerla primero
    if (vlcPlayer) {
      console.log('⏹️ Deteniendo instancia actual de VLC...');
      await vlcPlayer.stop();
    }

    // Crear una nueva instancia de VLC
    console.log('🔄 Creando nueva instancia de VLC...');
    vlcPlayer = new VLCPlayer();

    // Iniciar VLC con la playlist
    const success = await vlcPlayer.start();

    if (success) {
      console.log(`✅ VLC iniciado correctamente con la playlist: ${data.playlistName}`);
      sendLog(`VLC iniciado con playlist: ${data.playlistName}`, 'success');

      // Actualizar la interfaz de usuario
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vlc-status-update', {
          vlcStatus: {
            status: 'playing',
            message: `Reproduciendo playlist: ${data.playlistName}`,
            playing: true
          },
          playlistInfo: {
            playlistName: data.playlistName,
            playlistPath: data.playlistPath,
            lastLoaded: new Date().toISOString(),
            isActive: true
          }
        });
      }
    } else {
      console.error('❌ Error al iniciar VLC con la playlist');
      sendLog('Error al iniciar VLC con la playlist', 'error');

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('player-error', 'Error al iniciar el reproductor con la playlist');
      }
    }
  } catch (error) {
    console.error('❌ Error al procesar evento start-vlc-with-playlist:', error);
    sendLog(`Error al iniciar VLC: ${error.message}`, 'error');

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('player-error', `Error: ${error.message}`);
    }
  }
});

// Manejar el evento para detener el reproductor
ipcMain.on('stop-player', () => {
  if (!vlcPlayer) {
    console.log('⚠️ No se puede detener VLC: No está iniciado');
    if (mainWindow) {
      mainWindow.webContents.send('player-info', 'El reproductor no está iniciado');
    }
    return;
  }

  vlcPlayer.stop();
});

// Manejar el evento para alternar el audio
ipcMain.on('toggle-audio', () => {
  if (!vlcPlayer) {
    console.log('⚠️ No se puede modificar el audio: VLC no está iniciado');
    if (mainWindow) {
      mainWindow.webContents.send('player-info', 'El reproductor no está iniciado');
    }
    return;
  }

  vlcPlayer.toggleAudio();
});

// Manejo de eventos IPC
ipcMain.on('some-event', (event) => {
  if (mainWindow) {
    mainWindow.webContents.send('response-event', 'data');
  } else {
    console.error('La ventana principal no está disponible');
  }
});

// Manejar eventos de control remoto
ipcMain.on('remote-control', async (event, { action, data }) => {
  console.log(`Recibido evento de control remoto: ${action}`, data);

  // Verificar si VLC no está iniciado para la mayoría de las acciones
  if (!vlcPlayer) {
    console.log(`⚠️ No se puede ejecutar acción '${action}': VLC no está iniciado`);
    mainWindow?.webContents.send('player-info', 'El reproductor no está iniciado');
    return;
  }

  try {
    switch (action) {
      case 'PLAY':
        const success = await vlcPlayer.start();
        if (!success && mainWindow) {
          mainWindow.webContents.send('player-error', 'Error al iniciar el reproductor');
        }
        break;
      case 'PAUSE':
        vlcPlayer.pause();
        break;
      case 'STOP':
        vlcPlayer.stop();
        break;
      case 'NEXT':
        vlcPlayer.next();
        break;
      case 'PREVIOUS':
        vlcPlayer.previous();
        break;
      case 'VOLUME_UP':
        vlcPlayer.volumeUp();
        break;
      case 'VOLUME_DOWN':
        vlcPlayer.volumeDown();
        break;
      case 'MUTE':
      case 'UNMUTE':
        vlcPlayer.toggleAudio();
        break;
      default:
        console.warn(`Acción no reconocida: ${action}`);
    }
  } catch (error) {
    console.error(`Error al procesar acción ${action}:`, error);
    mainWindow?.webContents.send('player-error', `Error: ${error.message}`);
  }
});

// Manejar eventos de actualización de playlist y estado de VLC
ipcMain.on('vlc-started', async (event, data) => {
  console.log('📣 Evento recibido: VLC iniciado');

  // Actualizar la referencia global a VLC
  if (data && data.vlcInstance) {
    vlcPlayer = data.vlcInstance;
    global.vlcPlayer = vlcPlayer;
    console.log('✅ Instancia de VLC actualizada globalmente');
  }

  // Actualizar el estado de VLC en el frontend inmediatamente
  try {
    const vlcStatus = await getVLCStatus();
    mainWindow.webContents.send('vlc-status-update', {
      vlcStatus,
      playlistInfo: data.playlist || null
    });
  } catch (error) {
    console.error('Error al obtener estado de VLC tras inicio:', error);
  }
});

ipcMain.on('playlist-updated', async (event, data) => {
  console.log('📣 Evento recibido: Playlist actualizada');

  // Actualizar el estado de VLC en el frontend inmediatamente
  try {
    const vlcStatus = await getVLCStatus();
    mainWindow.webContents.send('vlc-status-update', {
      vlcStatus,
      playlistInfo: data.playlist || null
    });
  } catch (error) {
    console.error('Error al obtener estado de VLC tras actualización de playlist:', error);
  }
});