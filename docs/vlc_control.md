# Control de VLC - Documentación de API

## Endpoints de Control de VLC

### Obtener Estado
```http
GET /api/vlc/status
```
Retorna el estado actual del reproductor VLC.

### Control de Reproducción
```http
POST /api/vlc/play
POST /api/vlc/pause
POST /api/vlc/stop
```

### Control de Playlist
```http
GET /api/vlc/playlist
```
Obtiene la lista de reproducción actual.

```http
POST /api/vlc/playlist/add
```
Agrega un archivo a la playlist.

Body:
```json
{
    "path": "ruta/al/archivo.mp4"
}
```

### Control de Volumen
```http
POST /api/vlc/volume
```
Ajusta el volumen del reproductor.

Body:
```json
{
    "level": 100
}
``` 