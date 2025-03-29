# Sistema de Monitoreo en Tiempo Real

## Descripción

El sistema de monitoreo en tiempo real permite compartir el estado de la aplicación con otras aplicaciones controladoras o administrativas mediante socket.io. Esta funcionalidad facilita la supervisión centralizada de múltiples dispositivos player desde una única interfaz de administración.

## Arquitectura

El sistema se compone de los siguientes módulos:

### 1. Servidor Socket.IO

**Archivo**: `src/servers/socketServer.mjs`

Este módulo implementa un servidor Socket.IO que se monta sobre el servidor HTTP existente. Proporciona los siguientes servicios:

- Gestión de conexiones de clientes
- Autenticación de conexiones mediante tokens
- Emisión de eventos de estado en tiempo real
- Recepción de comandos desde aplicaciones controladoras

### 2. Servicio de Monitoreo

**Archivo**: `src/services/monitorService.mjs`

Este servicio administra la recopilación periódica de datos y su transmisión a través de Socket.IO. Ofrece:

- Configuración de intervalos de monitoreo
- Detección de cambios de estado para optimizar transmisiones
- Emisión selectiva de datos por categorías (sistema, reproductor, red, playlist)
- Manejo de errores en la recopilación de datos

### 3. Gestor de Estado

**Archivo**: `src/services/stateManager.mjs`

Proporciona una capa de abstracción para administrar el estado del sistema de forma centralizada:

- Persistencia del estado en Redis
- Sistema de notificaciones basado en eventos
- Cache de estado para acceso rápido
- API de acceso a secciones específicas del estado

## Tipos de Eventos

El sistema utiliza los siguientes eventos Socket.IO:

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `connect` | Cliente ⟷ Servidor | Establecimiento de conexión |
| `disconnect` | Cliente ⟷ Servidor | Cierre de conexión |
| `device:info` | Servidor → Cliente | Información del dispositivo player |
| `state:update` | Servidor → Cliente | Estado completo del sistema |
| `player:status` | Servidor → Cliente | Estado del reproductor VLC |
| `system:status` | Servidor → Cliente | Estado del sistema operativo |
| `network:status` | Servidor → Cliente | Estado de la red |
| `playlist:status` | Servidor → Cliente | Estado de la playlist actual |
| `command` | Cliente → Servidor | Envío de comandos al player |
| `command:response` | Servidor → Cliente | Respuesta a comandos recibidos |
| `command:error` | Servidor → Cliente | Error en procesamiento de comandos |
| `request:state` | Cliente → Servidor | Solicitud de estado actual |
| `monitor:error` | Servidor → Cliente | Error en el sistema de monitoreo |

## Estructura de Datos

### Estado completo del sistema

```javascript
{
  player: {
    status: "playing" | "paused" | "stopped",
    currentItem: "nombre_archivo.mp4",
    position: 0.75, // Posición de reproducción (0-1)
    time: 130, // Tiempo de reproducción en segundos
    length: 180, // Duración total en segundos
    volume: 100, // Volumen (0-100)
    fullscreen: true,
    // Otros detalles del reproductor...
  },
  playlist: {
    name: "playlist_principal",
    path: "/ruta/a/playlist.m3u",
    items: [
      // Lista de elementos en la playlist
    ],
    // Otros detalles de la playlist...
  },
  system: {
    hostname: "player-001",
    platform: "linux",
    arch: "arm",
    cpus: 4,
    totalMem: 8589934592, // Memoria total en bytes
    freeMem: 4294967296, // Memoria libre en bytes
    uptime: 86400, // Tiempo de funcionamiento en segundos
    // Otros detalles del sistema...
  },
  network: {
    eth0: {
      address: "192.168.1.100",
      mac: "00:11:22:33:44:55",
      netmask: "255.255.255.0"
    },
    wlan0: {
      address: "192.168.1.101",
      mac: "AA:BB:CC:DD:EE:FF",
      netmask: "255.255.255.0"
    },
    // Otras interfaces de red...
  },
  _meta: {
    timestamp: "2024-03-26T12:34:56.789Z", // Hora de generación
    version: "1.0.0" // Versión del esquema de datos
  }
}
```

### Formato de comandos

```javascript
{
  id: "cmd_12345", // ID único del comando
  action: "play" | "pause" | "stop" | "volume" | "playlist" | "reboot" | ...,
  params: {
    // Parámetros específicos del comando
    volume: 80, // Para comando "volume"
    playlist: "nombre_playlist", // Para comando "playlist"
    // Otros parámetros...
  },
  timestamp: "2024-03-26T12:34:56.789Z"
}
```

## Implementación en la Aplicación Controladora

Para implementar un cliente que se conecte al sistema de monitoreo:

```javascript
import { io } from "socket.io-client";

// Conectar al servidor Socket.IO
const socket = io("http://ip-del-player:3000", {
  auth: {
    token: "dev_token" // Token de autenticación
  }
});

// Manejar conexión
socket.on("connect", () => {
  console.log("Conectado al player");
  
  // Solicitar estado actual
  socket.emit("request:state");
});

// Recibir información del dispositivo
socket.on("device:info", (data) => {
  console.log("Información del dispositivo:", data);
});

// Recibir actualizaciones de estado
socket.on("state:update", (state) => {
  console.log("Estado completo actualizado:", state);
});

// Recibir estado del reproductor
socket.on("player:status", (status) => {
  console.log("Estado del reproductor:", status);
  
  // Actualizar interfaz con el estado del reproductor
  updatePlayerUI(status);
});

// Enviar comandos al player
function sendCommand(action, params = {}) {
  const command = {
    id: `cmd_${Date.now()}`,
    action,
    params,
    timestamp: new Date().toISOString()
  };
  
  socket.emit("command", command);
}

// Ejemplos de comandos
function playVideo() {
  sendCommand("play");
}

function pauseVideo() {
  sendCommand("pause");
}

function setVolume(volume) {
  sendCommand("volume", { volume });
}

function changePlaylist(playlistName) {
  sendCommand("playlist", { playlist: playlistName });
}
```

## Consideraciones de Seguridad

- Implementar autenticación robusta para las conexiones Socket.IO
- Validar todos los comandos recibidos antes de ejecutarlos
- Limitar el número de conexiones por IP para prevenir ataques DoS
- Configurar CORS adecuadamente para restringir el acceso
- Encriptar las comunicaciones mediante SSL/TLS
- Monitorear y registrar intentos de conexión fallidos

## Optimizaciones

Para optimizar el rendimiento del sistema de monitoreo:

1. Transmitir solo los cambios de estado, no el estado completo
2. Ajustar los intervalos de monitoreo según las necesidades
3. Implementar compresión de datos en transmisiones grandes
4. Utilizar Redis para almacenar estados anteriores
5. Implementar mecanismos de reconexión automática

## Integración con Otras Funcionalidades

- Sistema de alertas para notificar problemas críticos
- Historial de estado para análisis retrospectivo
- Paneles de control en tiempo real
- Sincronización entre múltiples dispositivos
- Programación de tareas basada en condiciones de estado

## Pruebas

Se recomienda implementar los siguientes tipos de pruebas:

1. Pruebas unitarias para componentes individuales
2. Pruebas de integración para verificar la comunicación
3. Pruebas de carga para verificar el rendimiento bajo múltiples conexiones
4. Pruebas de estabilidad a largo plazo
5. Pruebas de reconexión en caso de fallos de red 