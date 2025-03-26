# Implementación de Redis para el Estado del Sistema

## Introducción

Este documento describe la implementación de Redis como cache para mejorar el rendimiento en el manejo del estado del sistema en la aplicación App Player. Redis se utiliza como una capa de almacenamiento primaria en memoria, con persistencia en archivo JSON como respaldo.

## Arquitectura

El sistema utiliza una arquitectura de caché en dos niveles:

1. **Redis (Nivel 1)**: Almacenamiento primario en memoria para acceso rápido
2. **Archivo JSON (Nivel 2)**: Persistencia de datos como respaldo

```
┌─────────────┐      ┌─────────┐      ┌─────────────┐
│ Aplicación  │ <--> │  Redis  │ <--> │ systemState │
│             │      │ (Caché) │      │    .json    │
└─────────────┘      └─────────┘      └─────────────┘
      ^                                      ^
      │                                      │
      └───────────── Fallback ───────────────┘
```

## Configuración

La configuración de Redis se define en `src/config/appConfig.mjs`:

```javascript
redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 0,
    keyPrefix: 'player:',
    retryInterval: 1000,
    maxRetries: 10
}
```

## Implementación

### Conexión a Redis

El cliente Redis se inicializa en `src/utils/redisClient.mjs` y proporciona una interfaz para guardar y cargar el estado del sistema.

### Estrategia de Lectura/Escritura

1. **Lectura de Estado**:
   - Intentar leer desde Redis primero
   - Si no existe o hay un error, leer desde el archivo JSON
   - Si se lee desde el archivo, actualizar Redis para futuras lecturas

2. **Escritura de Estado**:
   - Guardar en Redis
   - Guardar también en el archivo JSON como respaldo

3. **Mantenimiento programado**:
   - Cada 24 horas se realiza una sincronización completa entre Redis y el archivo
   - Esto evita posibles inconsistencias entre ambos almacenamientos

## Beneficios

1. **Rendimiento**: Acceso rápido al estado del sistema desde memoria
2. **Reducción de I/O**: Minimiza las operaciones de lectura/escritura en disco
3. **Resiliencia**: La persistencia en archivo JSON garantiza que no se pierdan datos
4. **Compartición de estado**: Permite compartir el estado entre múltiples procesos/servicios

## Manejo de Fallos

- El sistema funciona incluso si Redis no está disponible, recurriendo al archivo JSON
- Los errores de conexión a Redis son manejados con reintentos automáticos
- Se registran todos los errores para diagnóstico

## Integración con Componentes Existentes

- `systemState.mjs` ha sido modificado para utilizar Redis como almacenamiento primario
- Se mantiene la compatibilidad con el resto del sistema

## Consideraciones para Producción

- En entornos de producción, configurar credenciales de acceso seguras para Redis
- Considerar implementar replicación de Redis para alta disponibilidad
- Monitorear el uso de memoria de Redis para prevenir problemas de rendimiento

## Herramientas de Diagnóstico

Para verificar el estado de Redis y la caché:

```bash
# Verificar si Redis está ejecutándose
redis-cli ping

# Ver tamaño actual de la clave de estado
redis-cli memory usage player:system:state

# Ver contenido actual del estado en Redis
redis-cli get player:system:state
``` 