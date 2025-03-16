# API Endpoints de App-Player

Este documento proporciona una descripción detallada de todos los endpoints disponibles en la API de App-Player.

## Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Página principal de la aplicación |
| GET | `/status` | Devuelve el estado general de la aplicación |
| POST | `/executeCommand` | Ejecuta un comando en el sistema |

## Endpoints del Sistema (`/api/system`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/system/info` | Obtiene información detallada del sistema |
| GET | `/api/system/resources` | Monitorea recursos del sistema (temperatura, velocidad de reloj, uso de memoria, carga de CPU) |
| POST | `/api/system/reboot` | Reinicia el sistema |
| GET | `/api/system/system-info` | Obtiene información básica del sistema (versión, nombre, tiempo de actividad) |

## Endpoints de VLC (`/api/vlc`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/vlc/status` | Obtiene el estado actual del reproductor VLC |
| GET | `/api/vlc/play` | Inicia la reproducción |
| GET | `/api/vlc/pause` | Pausa la reproducción |
| GET | `/api/vlc/stop` | Detiene la reproducción |

## Endpoints de Archivos y Listas de Reproducción

Los endpoints para el manejo de archivos y listas de reproducción permiten subir, gestionar y reproducir contenido multimedia en la aplicación.

## Cómo utilizar la API

### Ejemplos de Solicitudes

#### Obtener estado de VLC

```bash
curl http://localhost:3000/api/vlc/status
```

Respuesta esperada:

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

#### Control del Sistema

```bash
curl -X POST http://localhost:3000/api/system/reboot
```

Respuesta esperada:

```json
{
  "message": "Sistema reiniciándose"
}
```

### Guía de Postman

Para facilitar las pruebas de la API, se proporciona una colección de Postman en el archivo `/docs/postman_collection.json` que contiene ejemplos preconfiguradores para todos los endpoints disponibles.

## Notas Adicionales

- La mayoría de los endpoints devuelven respuestas en formato JSON
- Los errores se devuelven con códigos de estado HTTP apropiados junto con mensajes descriptivos
- Se recomienda probar los endpoints en un entorno local antes de utilizarlos en producción 