# App Player WeTechar

Aplicación de reproducción de contenido multimedia desarrollada con Electron.js, diseñada para funcionar en dispositivos Raspberry Pi.

## 🚀 Características

- Interfaz gráfica moderna y responsiva
- Gestión de servidor Express integrado
- Monitoreo de estado de red
- Visualización de estado de conexión
- Sistema de reproducción de contenido multimedia con integración VLC
- Control remoto vía API REST
- Gestión de ventanas optimizada
- Monitoreo de recursos del sistema

## 🛠️ Tecnologías Utilizadas

- Electron.js
- Node.js
- Express.js
- VLC Media Player
- Socket.IO
- Python (para scripts de control)

## 📁 Estructura del Proyecto

```
app-player/
├── docs/                    # Documentación del proyecto
├── homepage/                # Página web de presentación del proyecto
├── info/                    # Información adicional
├── lib/                     # Bibliotecas
├── node_modules/            # Dependencias de Node.js
├── public/                  # Archivos estáticos públicos
├── src/                     # Código fuente de la aplicación
│   ├── config/              # Configuraciones
│   ├── interface/           # Componentes de interfaz
│   ├── ipc/                 # Comunicación entre procesos
│   ├── lib/                 # Bibliotecas internas
│   ├── routes/              # Definición de rutas y endpoints
│   ├── scripts/             # Scripts adicionales
│   ├── servers/             # Configuración de servidores
│   ├── services/            # Servicios de la aplicación
│   ├── utils/               # Utilidades
│   └── windows/             # Configuración de ventanas
├── views/                   # Vistas y plantillas
├── main.js                  # Punto de entrada principal
├── package.json             # Configuración de npm
├── player.html              # Interfaz del reproductor
└── preload.js               # Script de precarga de Electron
```

### Rutas (src/routes)
La aplicación utiliza un sistema modular de rutas organizado mediante un archivo de barril (`index.mjs`):

- `endpoints.mjs`: Rutas principales y generales de la aplicación
- `vlcEndpoints.mjs`: Endpoints relacionados con el control de VLC
- `systemEndpoints.mjs`: Endpoints para operaciones del sistema
- `fileHandler.mjs`: Manejo de archivos y operaciones relacionadas
- `appEndpoints.mjs`: Endpoints específicos de la aplicación
- `playlistUploadHandler.mjs`: Manejo de carga y gestión de playlists

Cada archivo de ruta exporta su router usando `export default`, y el archivo `index.mjs` los importa y combina en un único router para simplificar el uso en la aplicación.

### Uso de Rutas

```javascript
// Importar todas las rutas desde el archivo de barril
import { endpoints } from './src/routes/index.mjs';

// Configurar rutas en Express - Una sola línea configura todas las rutas
app.use('/api', endpoints);
```

## Estructura de Rutas API

La aplicación expone las siguientes rutas API:

### Rutas del Sistema (`/api/system`)
- `GET /api/system/info`: Obtiene información del sistema
- `GET /api/system/network`: Obtiene información de red
- `GET /api/system/status`: Obtiene estado del sistema

### Rutas de Playlist (`/api/playlist`)
- `POST /api/playlist/upload`: Sube una nueva playlist
- `GET /api/playlist/list`: Lista las playlists disponibles
- `DELETE /api/playlist/:id`: Elimina una playlist

### Rutas de VLC (`/api/vlc`)
- `GET /api/vlc/status`: Obtiene estado de VLC
- `POST /api/vlc/control`: Controla la reproducción
- `GET /api/vlc/playlist`: Obtiene la playlist actual

### Rutas de Aplicación (`/api/app`)
- `GET /api/app/version`: Obtiene versión de la aplicación
- `GET /api/app/config`: Obtiene configuración

### Rutas de Archivos (`/api/files`)
- `GET /api/files/list`: Lista archivos disponibles
- `POST /api/files/upload`: Sube archivos
- `DELETE /api/files/:id`: Elimina archivos

## Estructura del Proyecto

### Utilidades (src/utils)
La aplicación utiliza un sistema de utilidades para centralizar funcionalidades comunes:

- **networkUtils.js**: Funciones relacionadas con la obtención de información de red
  - `getBasicNetworkInfo()`: Información básica de interfaces de red
  - `getDetailedNetworkInfo()`: Información detallada mediante script bash
  - `getLocalIP()`: Obtiene la IP local principal
  - `getMACAddress()`: Obtiene la dirección MAC principal

- **templateUtils.js**: Funciones para el manejo de plantillas
  - `renderTemplate()`: Renderiza plantillas HTML con variables

- **logUtils.js**: Sistema centralizado de logging
  - `initLogs()`: Inicializa el sistema de logs
  - `sendLog()`: Envía mensajes de log al frontend
  - `restoreLogs()`: Restaura las funciones originales de console

- **vlcStatus.js**: Utilidades para consultar el estado de VLC
  - `getVLCStatus()`: Obtiene el estado actual del reproductor
  - `getPlaylistInfo()`: Obtiene información sobre la playlist actual

## 🔧 Requisitos del