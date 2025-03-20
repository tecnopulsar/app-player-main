# Informe de la Aplicación App-Player

## Resumen Ejecutivo

App-Player es una aplicación de reproducción multimedia desarrollada con Electron y Node.js, diseñada para proporcionar una interfaz unificada para la reproducción y gestión de contenido multimedia. La aplicación ofrece control remoto a través de una API REST, permitiendo a los usuarios controlar la reproducción desde cualquier dispositivo en la misma red.

## Arquitectura de la Aplicación

### Tecnologías Utilizadas

- **Electron**: Framework para desarrollo de aplicaciones de escritorio multiplataforma con tecnologías web
- **Node.js**: Entorno de ejecución para JavaScript en el servidor
- **Express**: Framework para desarrollo de APIs y aplicaciones web en Node.js
- **Socket.IO**: Biblioteca para comunicación en tiempo real
- **VLC**: Reproductor multimedia utilizado como motor de reproducción

### Componentes Principales

1. **Interfaz de Usuario**
   - Implementada con HTML, CSS y JavaScript
   - Diseño responsive para adaptarse a diferentes tamaños de pantalla
   - Componentes modulares para facilitar el mantenimiento

2. **Servidor API**
   - Implementado con Express.js
   - Proporciona endpoints RESTful para control remoto
   - Gestión de solicitudes asíncronas

3. **Motor de Reproducción**
   - Integración con VLC a través de su interfaz HTTP
   - Soporte para múltiples formatos de audio y video
   - Control avanzado de reproducción

4. **Sistema de Archivos**
   - Gestión de archivos multimedia locales
   - Soporte para listas de reproducción
   - Carga y descarga de archivos

5. **Sistema de Playlist Activa**
   - Persistencia de la playlist activa mediante archivo JSON
   - Carga automática de la playlist al iniciar la aplicación
   - Endpoints dedicados para gestionar la playlist activa
   - Integración con el sistema de reproducción VLC

## Funcionalidades Principales

### Reproducción Multimedia

- Reproducción de archivos de audio y video en múltiples formatos
- Control básico (reproducir, pausar, detener)
- Ajuste de volumen y posición de reproducción
- Soporte para pantalla completa

### Control Remoto

- API REST para control desde dispositivos externos
- Interfaz web accesible desde cualquier navegador en la red local
- Autenticación para acceso seguro

### Gestión del Sistema

- Monitoreo de recursos del sistema (CPU, memoria, temperatura)
- Control de energía (reinicio, apagado)
- Información detallada del sistema

### Gestión de Archivos

- Explorador de archivos integrado
- Soporte para listas de reproducción
- Carga y descarga de archivos multimedia

### Gestión de Playlist

- Creación y gestión de múltiples playlists
- Sistema de playlist activa con persistencia entre reinicios
- Cambio de playlist mediante API
- Información detallada de la playlist en reproducción

## Casos de Uso

### Reproductor Multimedia Centralizado

App-Player puede utilizarse como un reproductor multimedia centralizado en un hogar u oficina, permitiendo a los usuarios controlar la reproducción desde sus dispositivos móviles o computadoras.

### Digital Signage

Gracias a su capacidad de control remoto y reproducción programada, App-Player es ideal para aplicaciones de señalización digital, permitiendo mostrar contenido multimedia en pantallas públicas.

### Servidor Multimedia

La aplicación puede funcionar como un servidor multimedia, permitiendo acceder y reproducir contenido desde cualquier dispositivo en la red local.

## Roadmap y Mejoras Futuras

- Implementación de un sistema de usuarios con diferentes niveles de acceso
- Soporte para streaming de contenido desde servicios en línea
- Mejora de la interfaz de usuario con más opciones de personalización
- Integración con sistemas de automatización del hogar
- Soporte para reproducción sincronizada en múltiples dispositivos
- Mejoras en el sistema de playlists para soportar programación y rotación de contenido

## Conclusiones

App-Player representa una solución versátil y potente para la reproducción y gestión de contenido multimedia, combinando la flexibilidad de las tecnologías web con la potencia de herramientas nativas para ofrecer una experiencia de usuario de alta calidad. Su arquitectura modular y extensible permite adaptarla a diferentes casos de uso y expandir sus funcionalidades según las necesidades específicas. 