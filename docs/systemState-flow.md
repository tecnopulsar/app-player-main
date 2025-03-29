# Flujo del Sistema de Estado en Tiempo Real

## 1. Arquitectura General

```mermaid
graph TD
    A[App Player] --> B[StateManager]
    B --> C[Redis]
    B --> D[systemState.json]
    A --> E[SocketClient]
    E --> F[App Administradora]
    F --> G[Base de Datos]
```

## 2. Flujo de Inicialización

```mermaid
sequenceDiagram
    participant App as App Player
    participant SM as StateManager
    participant Redis as Redis Server
    participant File as systemState.json
    participant Socket as SocketClient
    participant Admin as App Administradora

    App->>SM: initialize()
    SM->>Redis: loadStateFromRedis()
    alt Estado en Redis
        Redis-->>SM: Retorna estado
    else No hay estado
        SM->>File: loadFromFile()
        alt Archivo existe
            File-->>SM: Retorna estado
            SM->>Redis: saveStateToRedis()
        else No hay archivo
            SM->>SM: createInitialState()
            SM->>Redis: saveStateToRedis()
            SM->>File: saveToFile()
        end
    end
    App->>Socket: initialize()
    Socket->>Admin: connect()
    Socket->>Admin: sendDeviceInfo()
```

## 3. Flujo de Actualización de Estado

```mermaid
sequenceDiagram
    participant App as App Player
    participant SM as StateManager
    participant Redis as Redis Server
    participant File as systemState.json
    participant Socket as SocketClient
    participant Admin as App Administradora

    Note over App: Evento de cambio
    App->>SM: updateState()
    SM->>Redis: saveStateToRedis()
    SM->>File: saveToFile()
    SM->>Socket: notifyStateChange()
    Socket->>Admin: emit('state:update')
```

## 4. Flujo de Comandos

```mermaid
sequenceDiagram
    participant Admin as App Administradora
    participant Socket as SocketClient
    participant SM as StateManager
    participant VLC as VLC Player

    Admin->>Socket: emit('player:command')
    Socket->>Socket: handleCommand()
    Socket->>VLC: executeVLCCommand()
    VLC-->>Socket: response
    Socket->>SM: updateState()
    Socket-->>Admin: emit('player:command:response')
```

## 5. Componentes Principales

### StateManager
- Gestiona el estado centralizado
- Mantiene sincronización entre Redis y archivo
- Proporciona métodos para actualizar secciones específicas
- Maneja la persistencia de datos

### SocketClient
- Gestiona la comunicación en tiempo real
- Maneja comandos y eventos
- Sincroniza estado con la app administradora
- Implementa reconexión automática

### Redis
- Almacenamiento primario del estado
- Proporciona acceso rápido
- Mantiene consistencia entre instancias

### systemState.json
- Respaldo del estado
- Persistencia local
- Recuperación en caso de fallo

## 6. Eventos y Comandos

### Eventos Principales
1. `player:register` - Registro inicial del dispositivo
2. `player:state` - Actualización de estado
3. `player:command` - Comandos de control
4. `player:command:response` - Respuestas a comandos

### Comandos VLC
1. `vlc:play` - Reproducir
2. `vlc:pause` - Pausar
3. `vlc:stop` - Detener
4. `vlc:fullscreen` - Pantalla completa
5. `vlc:snapshot` - Captura de pantalla

## 7. Manejo de Errores

```mermaid
graph TD
    A[Error Detectado] --> B{Tipo de Error}
    B -->|Conexión| C[Reintentar Conexión]
    B -->|Comando| D[Notificar Error]
    B -->|Estado| E[Recuperar Estado]
    C --> F[Reconectar]
    D --> G[Enviar Respuesta de Error]
    E --> H[Cargar desde Respaldo]
```

## 8. Consideraciones de Rendimiento

1. **Caché en Memoria**
   - Estado mantenido en memoria
   - Actualizaciones diferenciales
   - Sincronización periódica

2. **Persistencia**
   - Redis como almacenamiento primario
   - Archivo como respaldo
   - Sincronización asíncrona

3. **Optimización de Red**
   - Envío de cambios incrementales
   - Compresión de datos
   - Reintentos inteligentes

## 9. Mejores Prácticas

1. **Gestión de Estado**
   - Estado inmutable
   - Actualizaciones atómicas
   - Validación de datos

2. **Comunicación**
   - Protocolo de eventos estandarizado
   - Manejo de desconexiones
   - Reconexión automática

3. **Seguridad**
   - Autenticación de dispositivos
   - Validación de comandos
   - Protección de datos sensibles 