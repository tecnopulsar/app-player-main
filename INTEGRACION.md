# Integración de Servidores Express

## Cambios Realizados

La aplicación originalmente tenía dos servidores Express funcionando simultáneamente:

1. Un servidor en `main.js` (proceso principal de Electron) en el puerto 3000
2. Un servidor independiente en `src/index.mjs` también en el puerto 3000

Para solucionar este problema de duplicación y potenciales conflictos, se realizaron los siguientes cambios:

### 1. Modificación de `main.js`

- Se integraron todas las rutas y funcionalidades del servidor independiente en el servidor Express de Electron
- Se importaron los módulos necesarios (`playlistService` y `playlistRoutes`)
- Se añadió la inicialización del servicio de playlist 
- Se agregaron las rutas adicionales (`/api/playlist`, `/api/status`, `/api/config`)
- Se incorporó la lógica para verificar y cargar la playlist activa al inicio

### 2. Transformación de `src/index.mjs`

- Se convirtió el archivo en un módulo que exporta funciones pero no inicia automáticamente un servidor
- Las funcionalidades principales ahora están disponibles como funciones exportadas:
  - `createExpressApp()`: Para crear una instancia de la aplicación Express
  - `verifyActivePlaylistFile()`: Para verificar el archivo de playlist activa
  - `initializePlaylistSystem()`: Para inicializar el sistema de playlists
  - `startStandaloneServer()`: Para iniciar el servidor independiente si es necesario

### 3. Actualización de `package.json`

- Se agregó un nuevo script `standalone-server` que permite iniciar el servidor independiente si es necesario
- El flujo principal de la aplicación ahora utiliza un solo servidor Express, eliminando la duplicación

## Beneficios

- Reduce el consumo de recursos al eliminar un servidor redundante
- Elimina los posibles conflictos por usar el mismo puerto
- Simplifica la arquitectura de la aplicación
- Facilita el mantenimiento al centralizar la lógica del servidor en un solo lugar
- Mejora la organización del código

## Uso

Para iniciar la aplicación con el servidor integrado:
```
npm start
```

Si se necesita iniciar únicamente el servidor independiente (sin Electron):
```
npm run standalone-server
``` 