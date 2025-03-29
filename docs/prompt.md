

Ran tool

Read file: package.json

Read file: README.md

Read file: docs/monitor_realtime.md

Ran tool

Search files...

Search files...

Search files...
# Prompt para Desarrollar Aplicación de Administración Centralizada para Players

A continuación, un prompt detallado para desarrollar la aplicación de administración centralizada para los dispositivos player:

## Objetivo

Desarrollar una aplicación web centralizada usando Next.js 15 (o 14) para monitorear y controlar múltiples dispositivos "app-player" basados en Electron, estableciendo conexiones en tiempo real mediante Socket.IO y complementando con llamadas a API REST.

## Especificaciones Técnicas

### Stack Tecnológico
- **Frontend y Backend**: Next.js 15 (o 14) con TypeScript
- **UI**: Shadcn/UI con TailwindCSS
- **Base de Datos**: PostgreSQL con Prisma ORM (en Docker)
- **Comunicación en Tiempo Real**: Socket.IO
- **API**: Fetch API para llamadas REST

### Estructura de la Aplicación

La aplicación debe implementar:

1. **Panel de Control Principal**:
   - Mapa visual de todos los dispositivos conectados
   - Indicadores de estado: conectado/desconectado, reproduciendo/pausado/detenido
   - Estadísticas agregadas (dispositivos activos, errores, etc.)

2. **Vista Detallada por Dispositivo**:
   - Estado del reproductor VLC (reproduciendo/pausado/detenido)
   - Información del contenido actual (nombre, duración, progreso)
   - Estado del sistema (CPU, memoria, almacenamiento)
   - Información de red (IP, MAC, estado de conexión)
   - Control remoto del reproductor (play, pause, stop, fullscreen)

3. **Gestión de Playlists**:
   - Subir nuevos archivos multimedia
   - Crear y editar playlists
   - Asignar playlists a dispositivos específicos
   - Ver contenido de playlists existentes

4. **Configuración y Monitoreo**:
   - Ajustes de monitoreo (intervalos, alertas)
   - Configuración de dispositivos (nombres, grupos)
   - Logs de eventos y errores

### Implementación de Socket.IO

Para la comunicación en tiempo real:

- Conectar con cada dispositivo usando su URL Socket.IO
- Suscribirse a eventos: `device:info`, `state:update`, `player:status`, `system:status`, `network:status`, `playlist:status`
- Implementar manejo de comandos mediante el evento `command`
- Gestionar reconexiones automáticas en caso de desconexión
- Mostrar estado de conexión en tiempo real

### API REST

Integrar los endpoints REST existentes:

- `/api/vlc/*` para control del reproductor (play, pause, stop, etc.)
- `/api/playlist/*` para gestión de playlists
- `/api/system/*` para información del sistema
- `/api/app/*` para información de la aplicación
- `/api/files/*` para gestión de archivos

### Modelo de Datos

Utilizar Prisma para modelar:

- Dispositivos (ID, nombre, tipo, IP, estado)
- Grupos de dispositivos
- Playlists y contenido multimedia
- Histórico de comandos y eventos
- Configuración de la aplicación

### Interfaz de Usuario

Crear una interfaz moderna con:

- Dashboard responsivo con diseño adaptable
- Tablas y grids para visualización de múltiples dispositivos
- Tarjetas de estado para cada dispositivo
- Controles intuitivos para acciones comunes
- Gráficos y visualizaciones para estadísticas
- Diseño modular con componentes reutilizables

## Consideraciones Técnicas

- Implementar manejo de estado con Zustand
- Utilizar Server Components y Client Components adecuadamente
- Optimizar el rendimiento con estrategias de caching y paginación
- Implementar manejo de errores y reconexiones automáticas
- Garantizar la escalabilidad para gestionar cientos de dispositivos

## Estructura de Eventos Socket.IO

La aplicación debe manejar todos los eventos documentados en el sistema de monitoreo, especialmente:

- `connect/disconnect`: Gestión de conexión
- `device:info`: Información básica del dispositivo
- `state:update`: Estado completo del sistema 
- `player:status`: Estado actual del reproductor
- `system:status`: Estadísticas del sistema
- `network:status`: Estado de conectividad
- `playlist:status`: Información de la playlist activa
- `command`: Envío de comandos al dispositivo

## Consideraciones finales

La aplicación debe ser fácilmente ampliable para añadir nuevas funcionalidades y debe seguir las mejores prácticas de desarrollo con Next.js y TypeScript para asegurar un código mantenible y escalable.
