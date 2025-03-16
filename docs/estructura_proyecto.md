# Estructura del Proyecto App-Player

## Visión General

Esta documentación describe la estructura de archivos y directorios del proyecto App-Player, una aplicación de reproducción multimedia basada en Electron.

## Estructura de Directorios

```
app-player/
├── docs/                    # Documentación del proyecto
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
│   │   ├── appEndpoints.mjs        # Endpoints de la aplicación
│   │   ├── endpoints.mjs            # Endpoints principales
│   │   ├── fileHandler.mjs          # Manejo de archivos
│   │   ├── playlistUploadHandler.mjs # Manejo de listas de reproducción
│   │   ├── systemEndpoints.mjs      # Endpoints del sistema
│   │   └── vlcEndpoints.mjs         # Endpoints para control de VLC
│   ├── scripts/             # Scripts adicionales
│   ├── servers/             # Configuración de servidores
│   ├── services/            # Servicios de la aplicación
│   ├── utils/               # Utilidades
│   └── windows/             # Configuración de ventanas
├── views/                   # Vistas y plantillas
├── .git/                    # Directorio de Git
├── .gitignore               # Archivos ignorados por Git
├── index.html               # Página principal
├── LICENSE.md               # Licencia del proyecto
├── main.js                  # Punto de entrada principal
├── package.json             # Configuración de npm
├── package-lock.json        # Bloqueo de versiones de dependencias
├── player.html              # Interfaz del reproductor
├── preload.js               # Script de precarga de Electron
└── README.md                # Documentación principal
```

## Detalles de Componentes Principales

### Servidor y API

La aplicación implementa un servidor Express que proporciona varios endpoints para controlar la reproducción multimedia, gestionar archivos y controlar el sistema. Los principales archivos relacionados con estos endpoints se encuentran en la carpeta `src/routes/`.

### Interfaz de Usuario

La interfaz de usuario está implementada utilizando HTML, CSS y JavaScript, con archivos principales como `index.html` y `player.html` en la raíz del proyecto.

### Electron

La aplicación utiliza Electron para proporcionar una experiencia de escritorio multiplataforma. El archivo `main.js` en la raíz del proyecto es el punto de entrada principal para la aplicación Electron. 