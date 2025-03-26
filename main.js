// main.js
console.log('🔄 Iniciando la aplicación...');
import { app, ipcMain, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { WindowManager } from './src/windows/windowManager.js';
import { VLCPlayer } from './src/lib/vlcPlayer.js';
import { appConfig } from './src/config/appConfig.mjs';
import { initializeServer, stopServer } from './src/servers/serverClient.mjs';
import { setupDirectories } from './src/utils/setupDirectories.js';
import { initLogs, sendLog, restoreLogs } from './src/utils/logUtils.mjs';
import { getActivePlaylist, verifyActivePlaylistFile } from './src/utils/activePlaylist.mjs';
// Deshabilitar la aceleración por hardware
console.log('🔄 Deshabilitando la aceleración por hardware...');
app.disableHardwareAcceleration();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar el puerto
const port = appConfig.server.port || 3000;
const windowManager = new WindowManager();

// Mantener una referencia global del objeto window
let mainWindow;
let vlcPlayer;

// Hacer la ventana global para poder acceder a ella desde el controllerClient
global.mainWindow = null;
global.vlcPlayer = null;

// Añadir variable global para el monitor de estado
let stateMonitor = null;

async function createWindow() {
  try {
    await setupDirectories();

    // Verificar que exista el archivo de playlist activa
    let playlistIsValid = false;
    let activePlaylist = null;

    try {
      // Verificar archivo de playlist activa
      await verifyActivePlaylistFile();

      // Obtener la playlist activa
      activePlaylist = await getActivePlaylist();

      // Verificar si hay datos válidos para iniciar VLC
      if (!activePlaylist || activePlaylist.playlistName === null) {
        console.log('ℹ️ No hay playlist configurada actualmente. No se iniciará VLC.');
      } else {
        console.log(`ℹ️ Playlist activa configurada: ${activePlaylist.playlistName}`);
        playlistIsValid = true; // Marcar que hay una playlist válida
      }
    } catch (error) {
      console.warn('⚠️ No se pudo verificar el archivo de playlist activa:', error);
      console.log('ℹ️ Continuando sin cargar playlist ni iniciar VLC...');
    }

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
      vlcPlayer = VLCPlayer.getInstance();
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

    // ✅
    // Iniciar el servidor con la app configurada
    await initializeServer();

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

  } catch (error) {
    console.error('Error en la inicialización:', error);
    if (mainWindow) {
      mainWindow.webContents.send('initialization-error', error.message);
    }
  }
}

// Este método se llamará cuando Electron haya terminado
// la inicialización y esté listo para crear ventanas del navegador.
console.log('🔄 Esperando a que Electron esté listo para crear ventanas del navegador...');
app.whenReady().then(createWindow);

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  // Restaurar las funciones originales del console
  restoreLogs();

  // Detener el servidor
  console.log('Deteniendo servidor web...');
  stopServer();


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
    vlcPlayer = VLCPlayer.getInstance();

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

// En el evento 'will-quit' o 'before-quit', detener el monitor de estado
app.on('will-quit', () => {
  console.log('🛑 Deteniendo servicios antes de cerrar la aplicación...');

  // Detener el monitor de estado del sistema
  if (stateMonitor) {
    stateMonitor.stop();
    console.log('Monitor de estado del sistema detenido');
  }

  // Otros procesos de limpieza...
  console.log('Aplicación cerrándose, recursos liberados');
});