# Guía de Uso de la Colección Postman - App Player API

## Configuración Inicial

1. Descarga e instala [Postman](https://www.postman.com/downloads/)
2. Importa la colección:
   - Abre Postman
   - Click en "Import"
   - Arrastra el archivo `postman_collection.json` o selecciónalo desde tu sistema

## Estructura de la Colección

La colección está organizada en 8 secciones principales:

### 1. Página Principal
- **GET /** - Obtiene la página principal de la aplicación
- Útil para verificar que el servidor está funcionando

### 2. Control VLC
Endpoints para control básico de reproducción:
- **POST /fullscreen** - Alterna pantalla completa
- **POST /stop** - Detiene la reproducción
- **POST /play** - Inicia la reproducción
- **POST /pause** - Pausa la reproducción

### 3. Estado VLC
- **GET /status** - Obtiene el estado actual del reproductor
- Devuelve información como:
  - Estado de reproducción
  - Volumen
  - Posición actual
  - Estado de pantalla completa

### 4. Comandos VLC
- **POST /vlc_command** - Ejecuta comandos personalizados
- Ejemplo de body:
  ```json
  {
    "command": "volume&val=256"
  }
  ```
- Comandos comunes:
  - `volume&val=256` - Ajusta volumen (0-512)
  - `seek&val=60` - Salta a posición específica (segundos)
  - `rate&val=1.5` - Ajusta velocidad de reproducción

### 5. Control de Playlist
- **POST /playlist** - Cambia la playlist actual
- Requiere body con ruta a la playlist:
  ```json
  {
    "playlistPath": "/ruta/a/tu/playlist.m3u"
  }
  ```

### 6. Comandos del Sistema
- **POST /executeCommand** - Ejecuta comandos del sistema
- ⚠️ Usar con precaución
- Ejemplo de body:
  ```json
  {
    "command": "ls -la"
  }
  ```

### 7. Subida de Archivos
- **POST /receive** - Sube archivos para una playlist
- Usa form-data con los siguientes campos:
  - `file`: Archivo de video (required)
  - `playlistName`: Nombre de la playlist (opcional)
  - `countPlaylistItems`: Número total de items (opcional)

### 8. Playlist Activa
- **GET /api/active-playlist** - Obtiene información de la playlist activa
- **POST /api/active-playlist** - Establece una playlist como activa
- Ejemplo de body para establecer playlist activa:
  ```json
  {
    "playlistName": "mi_playlist"
  }
  ```
- La playlist activa persiste entre reinicios de la aplicación
- Se carga automáticamente al iniciar VLC

## Variables de Entorno

La colección incluye la variable `base_url` configurada como `http://localhost:3000`. 
Para cambiar el servidor:
1. Ve a "Variables" en la colección
2. Modifica el valor de `base_url`
3. Guarda los cambios

## Tests Automáticos

La colección incluye tests básicos que verifican:
- Códigos de estado 200 en respuestas exitosas
- Formato JSON en endpoints que devuelven datos

## Ejemplos de Uso

### Reproducir un Video
1. Sube el video usando el endpoint "Subida de Archivos"
2. Usa "Control de Playlist" para cargar la playlist
3. Usa "Reproducir" para iniciar la reproducción

### Controlar la Reproducción
1. Usa "Estado VLC" para verificar el estado actual
2. Usa los endpoints de control (play, pause, stop) según necesites
3. Ajusta el volumen o posición con "Comandos VLC"

## Solución de Problemas

1. **Error de Conexión**
   - Verifica que el servidor esté corriendo
   - Confirma el puerto correcto en la URL

2. **Error en Subida de Archivos**
   - Verifica que el archivo exista
   - Confirma que el Content-Type sea `multipart/form-data`

3. **Error en Comandos VLC**
   - Verifica que VLC esté ejecutándose
   - Confirma que la interfaz HTTP de VLC esté habilitada
   - Verifica las credenciales de VLC