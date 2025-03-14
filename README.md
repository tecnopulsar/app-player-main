# App Player WeTechar

Aplicación de reproducción de contenido multimedia desarrollada con Electron.js, diseñada para funcionar en dispositivos Raspberry Pi.

## 🚀 Características

- Interfaz gráfica moderna y responsiva
- Gestión de servidor Express integrado
- Monitoreo de estado de red
- Visualización de estado de conexión
- Sistema de reproducción de contenido multimedia
- Gestión de ventanas optimizada

## 🛠️ Tecnologías Utilizadas

- Electron.js
- Node.js
- Express.js
- Python (para scripts de control)

## 📁 Estructura del Proyecto

```
app-player/
├── main.js           # Archivo principal de Electron
├── index.html        # Interfaz principal
├── preload.js        # Script de precarga de Electron
├── contador.py       # Script Python para control
└── src/
    ├── lib/          # Librerías y utilidades
    │   └── serverManager.js
    ├── windows/      # Gestión de ventanas
    │   └── windowManager.js
    ├── servers/      # Servidores y servicios
    │   ├── serverClient.mjs
    │   ├── networkInfo.mjs
    │   └── sinred.png
    └── scripts/      # Scripts de sistema
        └── network_info.sh
```

## 🔧 Requisitos del Sistema

- Node.js (v14 o superior)
- Python 3
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

## 📝 Funcionalidades Implementadas

### ✅ Completado
- Estructura base del proyecto
- Gestión de servidor Express
- Sistema de monitoreo de red
- Gestión de ventanas
- Visualización de estado de conexión

### 🚧 En Progreso
- Sistema de reproducción de contenido multimedia
- Interfaz de usuario mejorada

### 📋 Pendiente
- Sistema de autenticación
- Gestión de contenido remoto
- Sistema de logs
- Tests automatizados

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