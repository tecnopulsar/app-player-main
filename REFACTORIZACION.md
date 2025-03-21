# Refactorización de la Arquitectura

## Cambios Realizados

Se ha realizado una refactorización completa de la arquitectura de la aplicación para eliminar redundancias y mejorar la organización del código. El cambio principal ha sido la eliminación del archivo `src/index.mjs` que creaba un servidor Express independiente, y la distribución de sus funcionalidades en módulos más específicos.

### Eliminación de Duplicidad

- Se eliminó el servidor Express redundante en `src/index.mjs`
- Se integró toda la funcionalidad en el servidor Express del proceso principal de Electron

### Nuevos Módulos Creados

1. **src/utils/expressUtils.mjs**
   - `createExpressApp()`: Centraliza la creación y configuración de la aplicación Express
   - `addConfigRoutes()`: Añade rutas comunes para configuración y estado del servidor

2. **src/services/playlistSystemService.mjs**
   - `initializePlaylistSystem()`: Inicializa todos los componentes del sistema de playlists

3. **src/servers/expressServer.mjs**
   - `startStandaloneServer()`: Permite iniciar un servidor Express independiente si es necesario

4. **src/utils/activePlaylist.mjs (actualizado)**
   - Se añadió `verifyActivePlaylistFile()`: Verifica la existencia del archivo de configuración de playlist activa

### Mejoras en el Proceso Principal (main.js)

- Importaciones más organizadas y específicas
- Uso de funciones de utilidad para crear el servidor y añadir rutas
- Mejor modularización del código

### Actualización del package.json

- Se actualizó el script `standalone-server` para usar el nuevo módulo `expressServer.mjs`

## Beneficios de la Refactorización

1. **Mejor Organización**
   - Cada módulo tiene una responsabilidad clara y específica
   - Separación de preocupaciones: configuración, inicialización, servicios, etc.

2. **Eliminación de Redundancias**
   - Ya no hay dos servidores Express ejecutándose en paralelo
   - Se eliminó código duplicado para la inicialización y verificación

3. **Mayor Mantenibilidad**
   - Código más modular y fácil de mantener
   - Reutilización de componentes en diferentes partes de la aplicación

4. **Flexibilidad**
   - Se mantiene la posibilidad de iniciar un servidor independiente cuando sea necesario

## Modo de Uso

Para iniciar la aplicación completa con Electron y el servidor Express integrado:
```
npm start
```

Para iniciar únicamente el servidor Express sin la interfaz de Electron:
```
npm run standalone-server
``` 