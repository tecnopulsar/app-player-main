# Documentación API App-Player

Esta documentación detalla todas las rutas disponibles en la API, organizadas por funcionalidad, con ejemplos de uso en Postman.

## Índice
1. [Control de VLC](#control-de-vlc)
2. [Gestión de Playlists](#gestión-de-playlists)
3. [Subida de Archivos](#subida-de-archivos)
4. [Playlist Activa](#playlist-activa)
5. [Sistema](#sistema)
6. [Aplicación](#aplicación)
7. [Archivos](#archivos)
8. [Clientes de Control](#clientes-de-control)
9. [Socket.IO API](#socketio-api)

---

## Control de VLC

Endpoints para controlar el reproductor VLC.

### Obtener estado actual

```
GET /api/vlc/status
```

Devuelve el estado actual del reproductor VLC, incluyendo si está reproduciendo, pausado o detenido, el volumen, la posición actual, etc.

**Respuesta:**
```json
{
    "success": true,
    "status": {
        "connected": true,
        "playing": true,
        "paused": false,
        "stopped": false,
        "currentItem": "ForBiggerEscapes.mp4",
        "position": 0.5,
        "time": 65,
        "length": 130,
        "volume": 256,
        "random": false,
        "repeat": false,
        "fullscreen": true
    }
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/status
```

### Iniciar reproducción

```
GET /api/vlc/play
```

Inicia la reproducción del contenido actual.

**Respuesta:**
```json
{
    "success": true,
    "message": "Reproducción iniciada"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/play
```

### Pausar reproducción

```
GET /api/vlc/pause
```

Pausa la reproducción actual.

**Respuesta:**
```json
{
    "success": true,
    "message": "Reproducción pausada"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/pause
```

### Detener reproducción

```
GET /api/vlc/stop
```

Detiene completamente la reproducción.

**Respuesta:**
```json
{
    "success": true,
    "message": "Reproducción detenida"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/stop
```

### Capturar snapshot

```
GET /api/vlc/snapshot
```

Captura una imagen de baja resolución (320x180) del contenido actual en reproducción. La imagen se guarda en el directorio de screenshots y sobrescribe cualquier captura anterior.

**Respuesta:**
```json
{
    "success": true,
    "message": "Snapshot capturado correctamente",
    "snapshotPath": "/home/tecno/app-player/public/screenshots/screenshot.jpg",
    "snapshotURL": "/screenshots/screenshot.jpg"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/snapshot
```

---

## Gestión de Playlists

Endpoints para administrar playlists de video.

### Listar todas las playlists

```
GET /api/vlc/playlists
```

Obtiene una lista de todas las playlists disponibles.

**Respuesta:**
```json
{
    "success": true,
    "playlists": [
        {
            "name": "VideosCortos",
            "files": 3,
            "created": "2024-03-25T14:30:45.123Z",
            "path": "/home/tecno/app-player/public/videos/VideosCortos/VideosCortos.m3u"
        },
        {
            "name": "Institucionales",
            "files": 5,
            "created": "2024-03-17T10:15:30.456Z",
            "path": "/home/tecno/app-player/public/videos/Institucionales/Institucionales.m3u"
        }
    ]
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/playlists
```

### Obtener detalles de una playlist

```
GET /api/vlc/playlists/{nombre_playlist}
```

Obtiene información detallada de una playlist específica, incluyendo los archivos que contiene.

**Parámetros:**
- `nombre_playlist` (en la URL): Nombre de la playlist

**Respuesta:**
```json
{
    "success": true,
    "playlist": {
        "name": "VideosCortos",
        "path": "/home/tecno/app-player/public/videos/VideosCortos/VideosCortos.m3u",
        "files": [
            {
                "fileName": "ForBiggerEscapes.mp4",
                "filePath": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerEscapes.mp4"
            },
            {
                "fileName": "ForBiggerJoyrides.mp4",
                "filePath": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerJoyrides.mp4"
            }
        ],
        "totalFiles": 2
    }
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/playlists/VideosCortos
```

### Eliminar una playlist

```
DELETE /api/vlc/playlists/{nombre_playlist}
```

Elimina una playlist específica y todos sus archivos.

**Parámetros:**
- `nombre_playlist` (en la URL): Nombre de la playlist a eliminar

**Respuesta:**
```json
{
    "success": true,
    "message": "Playlist 'VideosCortos' eliminada correctamente"
}
```

**Ejemplo Postman:**
```
DELETE http://localhost:3000/api/vlc/playlists/VideosCortos
```

### Eliminar todas las playlists

```
DELETE /api/vlc/playlists
```

Elimina todas las playlists y sus archivos.

**Respuesta:**
```json
{
    "success": true,
    "message": "3 playlists eliminadas correctamente"
}
```

**Ejemplo Postman:**
```
DELETE http://localhost:3000/api/vlc/playlists
```

### Cargar una playlist en VLC

```
POST /api/vlc/playlist/load/{nombre_playlist}
```

Carga una playlist específica en VLC para su reproducción.

**Parámetros:**
- `nombre_playlist` (en la URL): Nombre de la playlist a cargar

**Respuesta:**
```json
{
    "success": true,
    "message": "Playlist 'VideosCortos' cargada correctamente",
    "playlist": {
        "name": "VideosCortos",
        "path": "/home/tecno/app-player/public/videos/VideosCortos/VideosCortos.m3u",
        "files": [
            {
                "fileName": "ForBiggerEscapes.mp4",
                "filePath": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerEscapes.mp4"
            },
            {
                "fileName": "ForBiggerJoyrides.mp4",
                "filePath": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerJoyrides.mp4"
            }
        ],
        "totalFiles": 2
    }
}
```

**Ejemplo Postman:**
```
POST http://localhost:3000/api/vlc/playlist/load/VideosCortos
```

---

## Subida de Archivos

Endpoints para subir archivos y crear playlists.

### Subir archivos (múltiple o individual)

```
POST /api/playlist/upload
```

Este endpoint flexible permite subir uno o varios archivos a una playlist. Soporta tres modos de operación:

1. **Modo individual**: Sube un archivo individual
2. **Modo múltiple**: Sube varios archivos simultáneamente
3. **Modo progresivo**: Sube varios archivos en secuencia, indicando el total esperado

**Parámetros:**
- `file` (form-data): Archivo individual a subir (para modo individual/progresivo)
- `files` (form-data): Múltiples archivos a subir (para modo múltiple)
- `playlistName` (form-data, opcional): Nombre de la playlist. Si no se proporciona, se genera automáticamente
- `countPlaylistItems` (form-data, opcional): Número total de archivos esperados (para modo progresivo)
- `mode` (form-data, opcional): Modo de subida ('single', 'multi', 'progressive', o 'auto')
- `isDefault` (form-data, opcional): Si es `true`, establece la playlist como la playlist por defecto del sistema

**Respuesta (Modo Individual/Progresivo, archivo intermedio):**
```json
{
    "success": true,
    "message": "Archivo subido correctamente (1/3)",
    "file": {
        "filename": "ForBiggerEscapes.mp4",
        "size": 12345678,
        "path": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerEscapes.mp4"
    },
    "playlist": {
        "name": "VideosCortos",
        "path": "/home/tecno/app-player/public/videos/VideosCortos/VideosCortos.m3u",
        "currentProgress": 1,
        "totalFiles": 3
    }
}
```

**Respuesta (Modo Múltiple o progresivo completado):**
```json
{
    "success": true,
    "message": "Todos los archivos (3) han sido subidos correctamente",
    "playlist": {
        "name": "VideosCortos",
        "path": "/home/tecno/app-player/public/videos/VideosCortos/VideosCortos.m3u",
        "files": [
            {
                "fileName": "ForBiggerEscapes.mp4",
                "filePath": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerEscapes.mp4"
            },
            {
                "fileName": "ForBiggerJoyrides.mp4",
                "filePath": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerJoyrides.mp4"
            },
            {
                "fileName": "ForBiggerMeltdowns.mp4",
                "filePath": "/home/tecno/app-player/public/videos/VideosCortos/ForBiggerMeltdowns.mp4"
            }
        ],
        "totalFiles": 3,
        "isDefault": false
    }
}
```

**Ejemplo Postman (Modo Individual):**
```
POST http://localhost:3000/api/playlist/upload
Body: form-data
- file: [seleccionar archivo]
- playlistName: VideosCortos
- mode: single
```

**Ejemplo Postman (Modo Múltiple):**
```
POST http://localhost:3000/api/playlist/upload
Body: form-data
- files: [seleccionar múltiples archivos]
- playlistName: VideosCortos
- mode: multi
```

## Playlist Activa

Endpoints para gestionar la playlist activa.

### Obtener todas las playlists

```
GET /api/active-playlist/all
```

Obtiene todas las playlists disponibles.

**Respuesta:**
```json
{
    "success": true,
    "playlists": [
        {
            "playlistName": "VideosCortos",
            "playlistPath": "/home/tecno/app-player/public/videos/VideosCortos/VideosCortos.m3u",
            "fileCount": 3,
            "lastLoaded": "2024-03-26T12:30:00.000Z",
            "isActive": true
        },
        {
            "playlistName": "Institucionales",
            "playlistPath": "/home/tecno/app-player/public/videos/Institucionales/Institucionales.m3u",
            "fileCount": 5,
            "lastLoaded": "2024-03-25T10:15:00.000Z",
            "isActive": false
        }
    ]
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/active-playlist/all
```

### Eliminar playlists excepto la activa

```
DELETE /api/active-playlist/purge?keepActive=true
```

Elimina todas las playlists excepto la que está marcada como activa.

**Parámetros:**
- `keepActive` (query): Si es "true", mantiene la playlist activa

**Respuesta:**
```json
{
    "success": true,
    "message": "Se eliminaron todas las playlists excepto la activa",
    "deleted": 2,
    "kept": "VideosCortos"
}
```

**Ejemplo Postman:**
```
DELETE http://localhost:3000/api/active-playlist/purge?keepActive=true
```

### Eliminar todas las playlists

```
DELETE /api/active-playlist/purge
```

Elimina absolutamente todas las playlists, incluyendo la activa.

**Respuesta:**
```json
{
    "success": true,
    "message": "Se eliminaron todas las playlists",
    "deleted": 3
}
```

**Ejemplo Postman:**
```
DELETE http://localhost:3000/api/active-playlist/purge
```

## Sistema

Endpoints para gestionar información del sistema.

### Obtener información del sistema

```
GET /api/system/info
```

Devuelve información básica del sistema.

**Respuesta:**
```json
{
    "success": true,
    "system": {
        "hostname": "base",
        "platform": "linux",
        "arch": "x64",
        "cpus": 4,
        "totalMem": 8589934592,
        "freeMem": 4294967296,
        "uptime": 86400,
        "networkInterfaces": {
            "eth0": {
                "address": "192.168.1.200",
                "mac": "00:11:22:33:44:55"
            }
        },
        "timestamp": "2024-03-26T12:00:00.000Z"
    }
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/system/info
```

### Obtener estado del sistema

```
GET /api/system/state
```

Devuelve el estado completo del sistema.

**Respuesta:**
```json
{
    "success": true,
    "state": {
        "timestamp": "2024-03-26T12:00:00.000Z",
        "system": { /* información del sistema */ },
        "storage": { /* información de almacenamiento */ },
        "vlc": { /* estado de VLC */ },
        "app": { /* información de la aplicación */ },
        "activePlaylist": { /* información de la playlist activa */ }
    }
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/system/state
```

### Guardar estado del sistema

```
POST /api/system/state/save
```

Guarda el estado actual del sistema.

**Respuesta:**
```json
{
    "success": true,
    "message": "Estado del sistema guardado correctamente",
    "timestamp": "2024-03-26T12:00:00.000Z"
}
```

**Ejemplo Postman:**
```
POST http://localhost:3000/api/system/state/save
```

## Aplicación

Endpoints para gestionar la aplicación.

### Obtener información de la aplicación

```
GET /api/app/info
```

Devuelve información sobre la aplicación.

**Respuesta:**
```json
{
    "success": true,
    "app": {
        "name": "app-player",
        "version": "1.0.0",
        "deviceId": "base",
        "deviceName": "base",
        "deviceType": "player",
        "server": {
            "port": 3000,
            "host": "0.0.0.0"
        }
    }
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/app/info
```

## Archivos

Endpoints para gestionar archivos.

### Listar archivos

```
GET /api/files/list
```

Lista archivos en un directorio específico.

**Parámetros:**
- `dir` (query, opcional): Directorio a listar, por defecto 'public/videos'

**Respuesta:**
```json
{
    "success": true,
    "path": "public/videos",
    "files": [
        {
            "name": "VideosCortos",
            "isDirectory": true,
            "size": 0,
            "modified": "2024-03-26T12:00:00.000Z"
        },
        {
            "name": "video.mp4",
            "isDirectory": false,
            "size": 1048576,
            "modified": "2024-03-26T10:30:00.000Z"
        }
    ]
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/files/list?dir=public/videos
```

### Eliminar archivo

```
DELETE /api/files/delete
```

Elimina un archivo específico.

**Parámetros:**
- `file` (query): Ruta del archivo a eliminar

**Respuesta:**
```json
{
    "success": true,
    "message": "Archivo eliminado correctamente",
    "file": "public/videos/video.mp4"
}
```

**Ejemplo Postman:**
```
DELETE http://localhost:3000/api/files/delete?file=public/videos/video.mp4
```

## Clientes de Control

App-Player implementa clientes que permiten la comunicación bidireccional con servidores de control y monitoreo.

### ControllerClient

El `ControllerClient` permite la comunicación con un servidor de control central y otro de monitoreo, facilitando:

- Control remoto del reproductor VLC
- Monitoreo del estado del dispositivo
- Envío periódico de heartbeats con información del estado
- Captura de snapshots de la reproducción actual

#### Configuración

```json
{
    "controller": {
        "url": "http://servidor-control.ejemplo.com:3001",
        "heartbeatInterval": 25000,
        "verboseLogs": false,
        "maxReconnectAttempts": 5
    },
    "monitor": {
        "url": "http://servidor-monitor.ejemplo.com:3002"
    },
    "device": {
        "name": "reproductor-sala-principal",
        "id": "player-001"
    }
}
```

#### Eventos Soportados

El cliente responde a los siguientes eventos del servidor:

- `PLAY`: Inicia la reproducción
- `PAUSE`: Pausa la reproducción
- `STOP`: Detiene la reproducción
- `NEXT`: Avanza al siguiente elemento de la playlist
- `PREVIOUS`: Retrocede al elemento anterior de la playlist
- `VOLUME_UP`: Aumenta el volumen
- `VOLUME_DOWN`: Disminuye el volumen
- `MUTE`: Silencia el audio
- `UNMUTE`: Restaura el volumen

### DeviceClient

El `DeviceClient` es una versión simplificada del ControllerClient enfocada únicamente en heartbeats y comunicación básica.

#### Uso desde Código

```javascript
import ControllerClient from './src/clients/controllerClient.mjs';
import DeviceClient from './src/clients/deviceClient.mjs';

// Crear y conectar un cliente de controlador
const controllerClient = new ControllerClient();
controllerClient.connect();

// O crear un cliente de dispositivo simple
const deviceClient = new DeviceClient();
deviceClient.connect();

// Enviar un evento de estado manualmente
controllerClient.sendStatus('active');

// Desconectar cuando sea necesario
controllerClient.disconnect();
```

## Socket.IO API

Además de la API REST, la aplicación ofrece una API Socket.IO para comunicación en tiempo real.

### Conexión

```javascript
import { io } from "socket.io-client";

// Conectar al servidor Socket.IO
const socket = io("http://[dirección-ip]:[puerto]", {
  auth: {
    token: "dev_token" // Token de autenticación
  }
});
```

### Eventos del Servidor al Cliente

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `device:info` | Información del dispositivo | Detalles del dispositivo player |
| `state:update` | Estado completo actualizado | Estado completo del sistema |
| `player:status` | Estado del reproductor | Información del reproductor VLC |
| `system:status` | Estado del sistema | Información del sistema operativo |
| `network:status` | Estado de la red | Información de las interfaces de red |
| `playlist:status` | Estado de la playlist | Información de la playlist actual |
| `command:response` | Respuesta a un comando | Resultado de un comando enviado |
| `command:error` | Error en un comando | Detalles del error en un comando |
| `monitor:error` | Error en el monitoreo | Información sobre un error en el sistema de monitoreo |

### Eventos del Cliente al Servidor

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `command` | Envío de comando | Objeto con detalles del comando a ejecutar |
| `request:state` | Solicitud de estado | Sin datos, solicita el estado actual |

### Ejemplo de Comando

```javascript
// Enviar un comando para cambiar el volumen
socket.emit("command", {
  id: "cmd_12345",
  action: "volume",
  params: {
    volume: 80
  },
  timestamp: new Date().toISOString()
});

// Recibir respuesta al comando
socket.on("command:response", (response) => {
  console.log("Respuesta al comando:", response);
});
```

Para una documentación completa del sistema de monitoreo en tiempo real, consulte la [documentación específica](monitor_realtime.md). 

# Servidor de Depuración Socket.IO para App-Player

A continuación, presento el código para un servidor de depuración que te permitirá monitorear y probar la comunicación en tiempo real de tu aplicación App-Player mediante Socket.IO.

## Servidor de Depuración (`debug-server.js`)

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración
const PORT = process.env.PORT || 4000;
const LOG_DIR = './logs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear servidor Express
const app = express();
const httpServer = createServer(app);

// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Almacenamiento de dispositivos conectados
const connectedDevices = new Map();

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Función para guardar evento en log
function logEvent(deviceId, event, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    data
  };
  
  const deviceDir = path.join(LOG_DIR, deviceId || 'unknown');
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  
  const logFile = path.join(deviceDir, `${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  console.log(`[${timestamp}] ${deviceId} - ${event}`);
}

// Configurar rutas para la interfaz web
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API para obtener dispositivos conectados
app.get('/api/devices', (req, res) => {
  const devices = [];
  connectedDevices.forEach((device, id) => {
    devices.push({
      id,
      deviceId: device.deviceId,
      name: device.deviceName,
      connected: device.connected,
      lastSeen: device.lastSeen,
      status: device.status
    });
  });
  res.json({ devices });
});

// API para obtener logs de un dispositivo
app.get('/api/logs/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;
  const deviceDir = path.join(LOG_DIR, deviceId);
  
  if (!fs.existsSync(deviceDir)) {
    return res.status(404).json({ error: 'No logs found for this device' });
  }
  
  const files = fs.readdirSync(deviceDir);
  const logFiles = files.filter(file => file.endsWith('.log'));
  
  res.json({ deviceId, logFiles });
});

// API para obtener contenido de un log específico
app.get('/api/logs/:deviceId/:filename', (req, res) => {
  const { deviceId, filename } = req.params;
  const logFile = path.join(LOG_DIR, deviceId, filename);
  
  if (!fs.existsSync(logFile)) {
    return res.status(404).json({ error: 'Log file not found' });
  }
  
  const content = fs.readFileSync(logFile, 'utf8');
  const events = content.split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
  
  res.json({ deviceId, filename, events });
});

// API para enviar comando a un dispositivo
app.post('/api/command/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;
  const { action, params } = req.body;
  
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }
  
  const device = Array.from(connectedDevices.entries())
    .find(([_, dev]) => dev.deviceId === deviceId);
  
  if (!device) {
    return res.status(404).json({ error: 'Device not found or not connected' });
  }
  
  const socketId = device[0];
  const command = {
    id: `cmd_${Date.now()}`,
    action,
    params: params || {},
    timestamp: new Date().toISOString()
  };
  
  io.to(socketId).emit('command', command);
  logEvent(deviceId, 'command:sent', command);
  
  res.json({ success: true, command });
});

// Manejar conexiones Socket.IO
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Nueva conexión: ${socket.id}`);
  
  // Almacenar información inicial
  connectedDevices.set(socket.id, {
    connected: true,
    lastSeen: new Date(),
    deviceId: 'unknown',
    deviceName: 'unknown',
    status: 'connected'
  });
  
  // Enviar mensaje de bienvenida al cliente
  socket.emit('welcome', {
    message: 'Conectado al servidor de depuración',
    serverId: 'debug-server',
    timestamp: new Date().toISOString()
  });
  
  // Manejar evento device:info (identificación del dispositivo)
  socket.on('device:info', (data) => {
    console.log(`[${new Date().toISOString()}] device:info de ${socket.id}:`, data);
    
    const deviceInfo = connectedDevices.get(socket.id) || {};
    deviceInfo.deviceId = data.id || 'unknown';
    deviceInfo.deviceName = data.name || 'unnamed';
    deviceInfo.deviceType = data.type || 'player';
    deviceInfo.lastSeen = new Date();
    deviceInfo.info = data;
    
    connectedDevices.set(socket.id, deviceInfo);
    logEvent(deviceInfo.deviceId, 'device:info', data);
    
    // Notificar a todos los clientes web sobre el nuevo dispositivo
    io.emit('device:connected', {
      socketId: socket.id,
      ...deviceInfo
    });
  });
  
  // Manejar evento state:update (estado completo)
  socket.on('state:update', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';
    
    console.log(`[${new Date().toISOString()}] state:update de ${deviceId}`);
    
    if (deviceInfo) {
      deviceInfo.lastSeen = new Date();
      deviceInfo.state = data;
      deviceInfo.status = data.player?.status || 'unknown';
      connectedDevices.set(socket.id, deviceInfo);
    }
    
    logEvent(deviceId, 'state:update', data);
    
    // Emitir a clientes web
    io.emit('device:state', {
      socketId: socket.id,
      deviceId,
      state: data
    });
  });
  
  // Manejar eventos específicos de componentes
  const componentEvents = [
    'player:status', 
    'system:status', 
    'network:status', 
    'playlist:status'
  ];
  
  componentEvents.forEach(eventName => {
    socket.on(eventName, (data) => {
      const deviceInfo = connectedDevices.get(socket.id);
      const deviceId = deviceInfo?.deviceId || 'unknown';
      
      console.log(`[${new Date().toISOString()}] ${eventName} de ${deviceId}`);
      
      if (deviceInfo) {
        deviceInfo.lastSeen = new Date();
        deviceInfo[eventName.split(':')[0]] = data;
        
        // Actualizar estado si es player:status
        if (eventName === 'player:status') {
          deviceInfo.status = data.status || 'unknown';
        }
        
        connectedDevices.set(socket.id, deviceInfo);
      }
      
      logEvent(deviceId, eventName, data);
      
      // Emitir a clientes web
      io.emit('device:component', {
        socketId: socket.id,
        deviceId,
        component: eventName.split(':')[0],
        data
      });
    });
  });
  
  // Manejar respuestas a comandos
  socket.on('command:response', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';
    
    console.log(`[${new Date().toISOString()}] command:response de ${deviceId}:`, data);
    logEvent(deviceId, 'command:response', data);
    
    // Emitir a clientes web
    io.emit('device:command:response', {
      socketId: socket.id,
      deviceId,
      response: data
    });
  });
  
  // Manejar errores de comandos
  socket.on('command:error', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';
    
    console.log(`[${new Date().toISOString()}] command:error de ${deviceId}:`, data);
    logEvent(deviceId, 'command:error', data);
    
    // Emitir a clientes web
    io.emit('device:command:error', {
      socketId: socket.id,
      deviceId,
      error: data
    });
  });
  
  // Manejar errores de monitoreo
  socket.on('monitor:error', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';
    
    console.log(`[${new Date().toISOString()}] monitor:error de ${deviceId}:`, data);
    logEvent(deviceId, 'monitor:error', data);
    
    // Emitir a clientes web
    io.emit('device:monitor:error', {
      socketId: socket.id,
      deviceId,
      error: data
    });
  });
  
  // Manejar solicitudes de estado
  socket.on('request:state', () => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';
    
    console.log(`[${new Date().toISOString()}] request:state de ${deviceId}`);
    logEvent(deviceId, 'request:state', {});
  });
  
  // Manejar desconexión
  socket.on('disconnect', (reason) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';
    
    console.log(`[${new Date().toISOString()}] Desconexión: ${deviceId} (${socket.id}) - Razón: ${reason}`);
    
    if (deviceInfo) {
      deviceInfo.connected = false;
      deviceInfo.disconnectReason = reason;
      deviceInfo.disconnectTime = new Date();
      connectedDevices.set(socket.id, deviceInfo);
    }
    
    logEvent(deviceId, 'disconnect', { reason });
    
    // Notificar a clientes web
    io.emit('device:disconnected', {
      socketId: socket.id,
      deviceId,
      reason
    });
  });
});

// Iniciar servidor
httpServer.listen(PORT, () => {
  console.log(`Servidor de depuración iniciado en puerto ${PORT}`);
  console.log(`Panel web disponible en: http://localhost:${PORT}`);
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
  console.log('\nCerrando servidor...');
  httpServer.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});
```

## Cliente de Prueba (`test-client.js`)

Este cliente simula un dispositivo App-Player para probar la conexión con el servidor de depuración:

```javascript
import { io } from 'socket.io-client';
import readline from 'readline';

// Configuración
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const DEVICE_ID = process.env.DEVICE_ID || `player-${Math.floor(Math.random() * 1000)}`;
const DEVICE_NAME = process.env.DEVICE_NAME || `Test Player ${DEVICE_ID}`;

// Crear interfaz de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`Connecting to ${SERVER_URL} as ${DEVICE_NAME} (${DEVICE_ID})...`);
const socket = io(SERVER_URL);

// Estado simulado del dispositivo
let deviceState = {
  player: {
    status: 'stopped',
    currentItem: null,
    position: 0,
    time: 0,
    length: 0,
    volume: 80,
    fullscreen: false
  },
  playlist: {
    name: null,
    path: null,
    items: []
  },
  system: {
    hostname: DEVICE_ID,
    platform: process.platform,
    arch: process.arch,
    cpus: 4,
    totalMem: 8589934592,
    freeMem: 4294967296,
    uptime: 3600
  },
  network: {
    eth0: {
      address: '192.168.1.100',
      mac: '00:11:22:33:44:55',
      netmask: '255.255.255.0'
    }
  },
  _meta: {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
};

// Enviar información del dispositivo al conectar
socket.on('connect', () => {
  console.log('Connected to debug server!');
  
  // Enviar información del dispositivo
  socket.emit('device:info', {
    id: DEVICE_ID,
    name: DEVICE_NAME,
    type: 'player',
    group: 'default',
    version: '1.0.0'
  });
  
  // Enviar estado inicial después de 1 segundo
  setTimeout(() => {
    socket.emit('state:update', deviceState);
    console.log('Initial state sent');
  }, 1000);
});

// Manejar mensaje de bienvenida
socket.on('welcome', (data) => {
  console.log('Server welcome message:', data.message);
});

// Manejar solicitudes de estado
socket.on('request:state', () => {
  console.log('Received request for state');
  socket.emit('state:update', deviceState);
  console.log('State sent in response to request');
});

// Manejar comandos
socket.on('command', (command) => {
  console.log('Received command:', command);
  
  // Procesar comando
  let response = {
    commandId: command.id,
    status: 'success',
    message: `Command ${command.action} executed successfully`
  };
  
  try {
    switch (command.action) {
      case 'play':
        deviceState.player.status = 'playing';
        deviceState.player.currentItem = 'test_video.mp4';
        deviceState.player.length = 300;
        break;
        
      case 'pause':
        deviceState.player.status = 'paused';
        break;
        
      case 'stop':
        deviceState.player.status = 'stopped';
        deviceState.player.currentItem = null;
        deviceState.player.position = 0;
        deviceState.player.time = 0;
        break;
        
      case 'volume':
        if (command.params && command.params.volume !== undefined) {
          deviceState.player.volume = command.params.volume;
        } else {
          throw new Error('Volume parameter is required');
        }
        break;
        
      case 'playlist':
        if (command.params && command.params.playlist) {
          deviceState.playlist.name = command.params.playlist;
          deviceState.playlist.path = `/playlists/${command.params.playlist}.m3u`;
          deviceState.playlist.items = [
            { fileName: 'video1.mp4', filePath: `/videos/${command.params.playlist}/video1.mp4` },
            { fileName: 'video2.mp4', filePath: `/videos/${command.params.playlist}/video2.mp4` }
          ];
        } else {
          throw new Error('Playlist name is required');
        }
        break;
        
      case 'reboot':
        deviceState.system.uptime = 0;
        break;
        
      default:
        throw new Error(`Unknown command: ${command.action}`);
    }
    
    // Actualizar timestamp
    deviceState._meta.timestamp = new Date().toISOString();
    
    // Enviar respuesta exitosa
    socket.emit('command:response', response);
    
    // Enviar estado actualizado
    socket.emit('state:update', deviceState);
    
    // También enviar actualizaciones específicas
    socket.emit('player:status', deviceState.player);
    
    if (command.action === 'playlist') {
      socket.emit('playlist:status', deviceState.playlist);
    }
    
  } catch (error) {
    console.error('Error processing command:', error);
    
    // Enviar respuesta de error
    socket.emit('command:error', {
      commandId: command.id,
      error: error.message
    });
  }
});

// Manejar desconexión
socket.on('disconnect', (reason) => {
  console.log(`Disconnected: ${reason}`);
});

// Menú de comandos para el usuario
console.log('\nTest Client Commands:');
console.log 