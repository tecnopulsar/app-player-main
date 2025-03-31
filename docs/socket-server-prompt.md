# Prompt para Desarrollo de Servidor Socket.io para Sistema de Monitoreo en Tiempo Real

## Objetivo
Desarrollar un servidor Socket.io que permita:
1. Monitorear en tiempo real múltiples clientes (App Players)
2. Controlar remotamente cada cliente mediante comandos
3. Mantener y distribuir el estado actualizado de cada dispositivo
4. Integrarse con la App Administradora

## Arquitectura General

El servidor debe formar parte de la siguiente arquitectura:

```
App Player <--> SocketClient <--> Servidor Socket.io <--> App Administradora <--> Base de Datos
```

Donde:
- **App Player**: Reproduce contenido y mantiene su estado
- **SocketClient**: Cliente Socket.io que ya está implementado
- **Servidor Socket.io**: A desarrollar según este prompt
- **App Administradora**: Interfaz para monitorear y controlar los dispositivos

## Estructura de Datos

El estado del sistema tiene la siguiente estructura:

```javascript
{
    timestamp: String, // ISO timestamp
    system: {
        // Información del sistema operativo
    },
    storage: {
        // Información de almacenamiento
    },
    vlc: {
        // Estado del reproductor VLC
    },
    app: {
        // Estado de la aplicación
    },
    activePlaylist: {
        // Información de playlist activa
    },
    defaultPlaylist: {
        // Información de playlist por defecto
    },
    snapshot: {
        // Información de captura de pantalla
    }
}
```

## Eventos y Comandos

### Eventos que el servidor debe manejar:
1. `player:register` - Cuando un nuevo dispositivo se conecta
2. `player:state` - Actualización de estado del dispositivo
3. `player:command:response` - Respuestas a comandos enviados

### Comandos que el servidor debe enviar:
1. `player:command` - Para enviar comandos a los dispositivos:
   - `vlc:play` - Reproducir
   - `vlc:pause` - Pausar
   - `vlc:stop` - Detener
   - `vlc:fullscreen` - Pantalla completa
   - `vlc:snapshot` - Captura de pantalla

## Flujo de Comunicación

1. **Registro de Dispositivo**:
```
SocketClient --[player:register]--> Servidor Socket.io
Servidor Socket.io --[player:registered]--> SocketClient
```

2. **Actualización de Estado**:
```
SocketClient --[player:state]--> Servidor Socket.io
Servidor Socket.io ---> Almacena estado
Servidor Socket.io --[state:updated]--> App Administradora
```

3. **Envío de Comandos**:
```
App Administradora --[comando]--> Servidor Socket.io
Servidor Socket.io --[player:command]--> SocketClient específico
SocketClient --[player:command:response]--> Servidor Socket.io
Servidor Socket.io --[command:response]--> App Administradora
```

## Funcionalidades Requeridas

1. **Gestión de Conexiones**
   - Mantener registro de dispositivos conectados
   - Manejar reconexiones automáticas
   - Detectar desconexiones

2. **Gestión de Estado**
   - Almacenar estado de cada dispositivo
   - Proveer historial de cambios (opcional)
   - Sincronizar con base de datos si es necesario

3. **Enrutamiento de Comandos**
   - Dirigir comandos al dispositivo correcto
   - Validar comandos antes de enviarlos
   - Manejar timeout y reintentos

4. **Autenticación y Seguridad**
   - Validar dispositivos mediante token
   - Prevenir conexiones no autorizadas
   - Registrar intentos fallidos

5. **Logging y Monitoreo**
   - Registrar eventos importantes
   - Proveer métricas de rendimiento
   - Notificar errores críticos

## Implementación del Cliente (referencia)

```javascript
class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.commandHandlers = new Map();
        this.config = null;
    }

    // Métodos principales
    async initialize() { ... }
    connect() { ... }
    disconnect() { ... }
    isConnected() { ... }

    // Manejo de eventos
    setupEventHandlers() { ... }
    handleCommand(data) { ... }
    sendDeviceInfo() { ... }
    sendPlayerState() { ... }
    handleSnapshotRequest() { ... }
    sendEvent(event, data) { ... }
}
```

## Patrón de Manejo de Comandos (referencia)

```javascript
// Registrar manejador
registerCommandHandler(command, handler) {
    this.commandHandlers.set(command, handler);
}

// Procesar comando
async handleCommand(data) {
    const { command, params = {}, commandId } = data;
    const handler = this.commandHandlers.get(command);
    
    if (handler) {
        const result = await handler(params);
        this.socket.emit('player:command:response', {
            commandId,
            status: 'success',
            result
        });
    }
}
```

## Manejo de Errores

El servidor debe implementar:

1. **Try-Catch con Logging Estructurado**
```javascript
try {
    // Operación
} catch (error) {
    console.error('Error descriptivo:', error);
    // Manejo del error
}
```

2. **Reconexión Automática**
```javascript
io.on('reconnect_attempt', (attemptNumber) => {
    // Lógica de reconexión
});
```

## Consideraciones Adicionales

1. **Escalabilidad**
   - Soporte para múltiples instancias (clustering)
   - Uso de Redis para compartir estado entre instancias
   - Manejo eficiente de conexiones simultáneas

2. **Rendimiento**
   - Envío de actualizaciones diferenciales
   - Compresión de datos grandes (snapshots)
   - Optimización de frecuencia de actualizaciones

3. **Monitoreo**
   - Dashboard para visualizar dispositivos conectados
   - Alertas para dispositivos desconectados
   - Estadísticas de uso y rendimiento

## Tecnologías Recomendadas

1. **Principal**:
   - Node.js
   - Socket.io
   - Redis para estado compartido

2. **Opcionales**:
   - Winston o Pino para logging
   - Joi o Zod para validación
   - MongoDB o PostgreSQL para persistencia
   - PM2 para gestión de procesos

## Estructura de Código Recomendada

```
src/
├── config/
│   └── index.js         # Configuración del servidor
├── models/
│   └── device.js        # Modelo de dispositivo
├── services/
│   ├── socket.js        # Servicio de Socket.io
│   ├── auth.js          # Servicio de autenticación
│   └── state.js         # Gestor de estado
├── handlers/
│   ├── connection.js    # Manejadores de conexión
│   ├── command.js       # Manejadores de comandos
│   └── state.js         # Manejadores de estado
├── utils/
│   ├── logger.js        # Utilidad de logging
│   └── validation.js    # Utilidad de validación
└── index.js             # Punto de entrada
``` 