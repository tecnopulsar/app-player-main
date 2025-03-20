# Documentación API App-Player

Esta documentación detalla todas las rutas disponibles en la API, organizadas por funcionalidad, con ejemplos de uso en Postman.

## Índice
1. [Control de VLC](#control-de-vlc)
2. [Gestión de Playlists](#gestión-de-playlists)
3. [Subida de Archivos](#subida-de-archivos)
4. [Playlist Activa](#playlist-activa)

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
    "state": "playing",
    "currentplid": "1",
    "fullscreen": true,
    "volume": "256",
    "length": "120",
    "position": "0.5"
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
            "name": "playlist_principal",
            "files": 3,
            "created": "2023-03-18T14:30:45.123Z",
            "path": "/home/tecno/app-player/public/videos/playlist_principal/playlist_principal.m3u"
        },
        {
            "name": "videos_institucionales",
            "files": 5,
            "created": "2023-03-17T10:15:30.456Z",
            "path": "/home/tecno/app-player/public/videos/videos_institucionales/videos_institucionales.m3u"
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
        "name": "playlist_principal",
        "path": "/home/tecno/app-player/public/videos/playlist_principal/playlist_principal.m3u",
        "files": [
            {
                "fileName": "video1.mp4",
                "filePath": "/home/tecno/app-player/public/videos/playlist_principal/video1.mp4"
            },
            {
                "fileName": "video2.mp4",
                "filePath": "/home/tecno/app-player/public/videos/playlist_principal/video2.mp4"
            }
        ],
        "totalFiles": 2
    }
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/vlc/playlists/playlist_principal
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
    "message": "Playlist 'playlist_principal' eliminada correctamente"
}
```

**Ejemplo Postman:**
```
DELETE http://localhost:3000/api/vlc/playlists/playlist_principal
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
    "message": "Playlist 'playlist_principal' cargada correctamente",
    "playlist": {
        "name": "playlist_principal",
        "path": "/home/tecno/app-player/public/videos/playlist_principal/playlist_principal.m3u",
        "files": [
            {
                "fileName": "video1.mp4",
                "filePath": "/home/tecno/app-player/public/videos/playlist_principal/video1.mp4"
            },
            {
                "fileName": "video2.mp4",
                "filePath": "/home/tecno/app-player/public/videos/playlist_principal/video2.mp4"
            }
        ],
        "totalFiles": 2
    }
}
```

**Ejemplo Postman:**
```
POST http://localhost:3000/api/vlc/playlist/load/playlist_principal
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

**Ejemplo Postman (Modo Individual):**
```
POST http://localhost:3000/api/playlist/upload
Body: form-data
- file: [seleccionar archivo]
- playlistName: mi_playlist
- mode: single
```

**Ejemplo Postman (Modo Múltiple):**
```
POST http://localhost:3000/api/playlist/upload
Body: form-data
- files: [seleccionar múltiples archivos]
- playlistName: mi_playlist
- mode: multi
```

**Ejemplo Postman (Modo Progresivo):**
```
POST http://localhost:3000/api/playlist/upload
Body: form-data
- file: [seleccionar archivo]
- playlistName: mi_playlist
- countPlaylistItems: 3
- mode: progressive
```

**Respuesta (Modo Individual/Progresivo, archivo intermedio):**
```json
{
    "success": true,
    "message": "Archivo procesado correctamente",
    "progress": {
        "current": 1,
        "total": 3,
        "filename": "video1.mp4"
    }
}
```

**Respuesta (Modo Individual/Progresivo, último archivo):**
```json
{
    "success": true,
    "message": "Playlist procesada correctamente",
    "playlist": {
        "name": "mi_playlist",
        "path": "/home/tecno/app-player/public/videos/mi_playlist/mi_playlist.m3u",
        "totalFiles": 3
    }
}
```

**Respuesta (Modo Múltiple):**
```json
{
    "success": true,
    "message": "Playlist procesada correctamente",
    "playlist": {
        "name": "mi_playlist",
        "path": "/home/tecno/app-player/public/videos/mi_playlist/mi_playlist.m3u",
        "totalFiles": 3,
        "files": ["video1.mp4", "video2.mp4", "video3.mp4"]
    }
}
```

## Colección Postman

Para facilitar las pruebas, puedes importar la siguiente colección en Postman:

```json
{
  "info": {
    "name": "App-Player API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Control VLC",
      "item": [
        {
          "name": "Estado VLC",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/vlc/status"
          }
        },
        {
          "name": "Iniciar Reproducción",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/vlc/play"
          }
        },
        {
          "name": "Pausar Reproducción",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/vlc/pause"
          }
        },
        {
          "name": "Detener Reproducción",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/vlc/stop"
          }
        }
      ]
    },
    {
      "name": "Gestión Playlists",
      "item": [
        {
          "name": "Listar Playlists",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/vlc/playlists"
          }
        },
        {
          "name": "Detalles Playlist",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/vlc/playlists/{{playlist_name}}"
          }
        },
        {
          "name": "Eliminar Playlist",
          "request": {
            "method": "DELETE",
            "url": "http://localhost:3000/api/vlc/playlists/{{playlist_name}}"
          }
        },
        {
          "name": "Eliminar Todas las Playlists",
          "request": {
            "method": "DELETE",
            "url": "http://localhost:3000/api/vlc/playlists"
          }
        },
        {
          "name": "Cargar Playlist",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/vlc/playlist/load/{{playlist_name}}"
          }
        }
      ]
    },
    {
      "name": "Subida de Archivos",
      "item": [
        {
          "name": "Subir Archivos Múltiples",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/playlist/upload",
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "files",
                  "type": "file",
                  "src": []
                },
                {
                  "key": "playlistName",
                  "value": "mi_playlist",
                  "type": "text"
                },
                {
                  "key": "mode",
                  "value": "multi",
                  "type": "text"
                }
              ]
            }
          }
        },
        {
          "name": "Subir Archivo Individual",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/playlist/upload",
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "file",
                  "type": "file",
                  "src": []
                },
                {
                  "key": "playlistName",
                  "value": "mi_playlist",
                  "type": "text"
                },
                {
                  "key": "countPlaylistItems",
                  "value": "1",
                  "type": "text"
                }
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "playlist_name",
      "value": "mi_playlist"
    }
  ]
}
```

Para usar esta colección:
1. Copia el JSON anterior
2. En Postman, haz clic en "Import" > "Raw text"
3. Pega el JSON y haz clic en "Import"
4. Ajusta la variable `playlist_name` según necesites 

## Playlist Activa

Endpoints para gestionar la información de la playlist actualmente activa.

### Obtener información de la playlist activa

```
GET /api/active-playlist
```

Obtiene información sobre la playlist actualmente configurada como activa.

**Respuesta:**
```json
{
    "success": true,
    "activePlaylist": {
        "playlistName": "playlistDefecto",
        "playlistPath": "./public/videosDefecto/playlistDefecto/playlistDefecto.m3u",
        "lastLoaded": "2023-03-20T15:30:45.123Z",
        "isActive": true
    }
}
```

**Ejemplo Postman:**
```
GET http://localhost:3000/api/active-playlist
```

### Establecer una playlist como activa

```
POST /api/active-playlist
```

Establece una playlist específica como la playlist activa del sistema.

**Body:**
```json
{
    "playlistName": "mi_playlist"
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Playlist 'mi_playlist' establecida como activa",
    "activePlaylist": {
        "playlistName": "mi_playlist",
        "playlistPath": "/home/tecno/app-player/public/videos/mi_playlist/mi_playlist.m3u",
        "lastLoaded": "2023-03-20T15:35:12.456Z",
        "isActive": true
    }
}
```

**Ejemplo Postman:**
```
POST http://localhost:3000/api/active-playlist
Content-Type: application/json

{
    "playlistName": "mi_playlist"
}
```

#### Notas sobre la Playlist Activa

- Al iniciar la aplicación, el sistema verifica la existencia del archivo `src/config/activePlaylist.json` que almacena la información de la playlist activa.
- Si el archivo no existe, se crea automáticamente con la playlist por defecto (`playlistDefecto`).
- La playlist activa se carga automáticamente al iniciar VLC.
- Cualquier playlist cargada a través de `/api/vlc/playlist/load/{nombre_playlist}` actualiza automáticamente el archivo de configuración de la playlist activa. 