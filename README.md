# App-Player

Sistema de reproducción de contenido multimedia basado en VLC con control remoto.

## Características

- Reproducción de contenido multimedia usando VLC
- Control remoto a través de API REST
- Gestión de playlists
- Captura de snapshots
- Interfaz web para control y monitoreo
- Sistema de logs detallado
- Control de volumen y pantalla completa
- Soporte para múltiples dispositivos

## Tecnologías utilizadas

- Node.js
- Express.js
- VLC
- Socket.IO (solo para monitoreo)
- HTML/CSS/JavaScript

## Estructura del proyecto

```
app-player/
├── src/
│   ├── config/           # Configuraciones
│   ├── routes/           # Rutas API REST
│   ├── clients/          # Clientes de control
│   ├── utils/            # Utilidades
│   └── server.js         # Servidor principal
├── public/               # Archivos estáticos
├── docs/                 # Documentación
└── package.json
```

## API Routes

El sistema expone las siguientes rutas API:

### Control de VLC
- `GET /api/vlc/status` - Estado actual
- `GET /api/vlc/play` - Iniciar reproducción
- `GET /api/vlc/pause` - Pausar reproducción
- `GET /api/vlc/stop` - Detener reproducción
- `GET /api/vlc/next` - Siguiente elemento
- `GET /api/vlc/previous` - Elemento anterior
- `GET /api/vlc/volume/up` - Subir volumen
- `GET /api/vlc/volume/down` - Bajar volumen
- `GET /api/vlc/mute` - Silenciar
- `GET /api/vlc/unmute` - Activar sonido
- `GET /api/vlc/fullscreen` - Pantalla completa
- `GET /api/vlc/snapshot` - Capturar snapshot

### Gestión de Playlists
- `GET /api/playlists` - Listar playlists
- `POST /api/playlists/upload` - Subir playlist
- `DELETE /api/playlists/:name` - Eliminar playlist

### Sistema
- `GET /api/system/info` - Información del sistema
- `GET /api/system/status` - Estado del sistema

Para más detalles sobre las rutas API, consulta la [documentación completa](docs/API_ROUTES.md).

## Requisitos del sistema

- Node.js >= 14.x
- VLC >= 3.0
- Sistema operativo: Linux/Windows/macOS

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/app-player.git
cd app-player
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Iniciar el servidor:
```bash
npm start
```

## Uso

1. Acceder a la interfaz web:
```
http://localhost:3000
```

2. Controlar VLC a través de la API:
```
http://localhost:3000/api/vlc/status
http://localhost:3000/api/vlc/play
http://localhost:3000/api/vlc/pause
# etc...
```

## Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.