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

### Siguiente elemento

```
GET /api/vlc/next
```

Avanza al siguiente elemento en la playlist actual.

**Respuesta:**
```json
{
    "success": true,
    "message": "Siguiente elemento seleccionado"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/next
```

### Elemento anterior

```
GET /api/vlc/previous
```

Retrocede al elemento anterior en la playlist actual.

**Respuesta:**
```json
{
    "success": true,
    "message": "Elemento anterior seleccionado"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/previous
```

### Subir volumen

```
GET /api/vlc/volume/up
```

Aumenta el volumen del reproductor.

**Respuesta:**
```json
{
    "success": true,
    "message": "Volumen aumentado"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/volume/up
```

### Bajar volumen

```
GET /api/vlc/volume/down
```

Disminuye el volumen del reproductor.

**Respuesta:**
```json
{
    "success": true,
    "message": "Volumen disminuido"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/volume/down
```

### Silenciar

```
GET /api/vlc/mute
```

Silencia el reproductor.

**Respuesta:**
```json
{
    "success": true,
    "message": "Reproductor silenciado"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/mute
```

### Activar sonido

```
GET /api/vlc/unmute
```

Activa el sonido del reproductor.

**Respuesta:**
```json
{
    "success": true,
    "message": "Sonido activado"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/unmute
```

### Pantalla completa

```
GET /api/vlc/fullscreen
```

Activa el modo de pantalla completa.

**Respuesta:**
```json
{
    "success": true,
    "message": "Modo de pantalla completa activado"
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/fullscreen
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
    "snapshotPath": "/home/tecno/app-player/public/screenshots/snapshot.jpg",
    "snapshotURL": "/screenshots/snapshot.jpg"
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
controllerClient.initialize();

// O crear un cliente de dispositivo simple
const deviceClient = new DeviceClient();
deviceClient.initialize();

// Enviar un evento de estado manualmente
controllerClient.sendStatus('active');

// Desconectar cuando sea necesario
controllerClient.disconnect();
```