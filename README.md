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

## 🔧 Requisitos del Sistema

- Node.js (v14 o superior)
- Python 3
- VLC Media Player
- Raspberry Pi (recomendado)
- Sistema operativo Linux (probado en Raspberry Pi OS)

## 🚀 Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tecnopulsar/app-player-wetechar.git
cd app-player-wetechar
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar la aplicación:
```bash
npm start
```

## 📚 Documentación

La documentación completa del proyecto se encuentra en la carpeta `/docs`:

- **estructura_proyecto.md**: Detalles sobre la estructura de carpetas y archivos
- **api_endpoints.md**: Documentación de todos los endpoints de la API
- **informe_aplicacion.md**: Informe completo sobre la aplicación
- **vlc_control.md**: Documentación de la integración con VLC
- **system_control.md**: Documentación del control del sistema
- **postman_guide.md**: Guía para usar Postman con esta API
- **postman_collection.json**: Colección de Postman para probar la API

## 🌐 API REST

La aplicación proporciona una API REST para controlar todas sus funcionalidades de forma remota. Algunos de los endpoints principales son:

- **Control de VLC**: `/api/vlc/play`, `/api/vlc/pause`, `/api/vlc/stop`
- **Información del Sistema**: `/api/system/info`, `/api/system/resources`
- **Control del Sistema**: `/api/system/reboot`
- **Estado General**: `/status`

Para más detalles, consulta la documentación de la API en `/docs/api_endpoints.md`.

## 📝 Funcionalidades Implementadas

### ✅ Completado
- Estructura base del proyecto
- Gestión de servidor Express
- Sistema de monitoreo de red
- Gestión de ventanas
- Visualización de estado de conexión
- Integración con VLC Media Player
- API REST para control remoto
- Monitoreo de recursos del sistema

### 🚧 En Progreso
- Sistema de reproducción de contenido multimedia avanzado
- Interfaz de usuario mejorada
- Soporte para listas de reproducción personalizadas

### 📋 Pendiente
- Sistema de autenticación
- Gestión de contenido remoto
- Sistema de logs avanzado
- Tests automatizados
- Soporte para streaming de servicios en línea

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, asegúrate de:

1. Hacer fork del repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.

## 👥 Autores

- **TecnoPulsar** - *Trabajo inicial* - [tecnopulsar](https://github.com/tecnopulsar)

## 🙏 Agradecimientos

- Electron.js Team
- Raspberry Pi Foundation
- Comunidad de desarrolladores de Node.js
- Equipo de VideoLAN (VLC) 