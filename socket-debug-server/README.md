# Emulador de Controlador

Este proyecto es un emulador de la aplicación administradora para probar la comunicación con el cliente controlador (`ControllerClient`) implementado en la aplicación principal. El emulador proporciona una interfaz web para interactuar con los dispositivos conectados y enviar comandos de control.

## Descripción

El emulador implementa un servidor Socket.IO en el puerto 3001 que se comunica con el cliente controlador de la aplicación principal. Proporciona una interfaz web para:

1. Ver los dispositivos conectados
2. Ver información detallada de cada dispositivo
3. Enviar comandos de control a los dispositivos

## Requisitos

- Node.js (v14 o superior)
- npm (v6 o superior)

## Instalación

1. Clonar el repositorio o descargar los archivos
2. Navegar al directorio del proyecto
3. Instalar las dependencias:

```bash
cd socket-debug-server
npm install
```
```bash
cd socket-debug-server && npm start
```


## Uso

### Iniciar el servidor

```bash
npm start
```

Para desarrollo con recarga automática:

```bash
npm run dev
```

### Acceder a la interfaz web

Una vez que el servidor esté en ejecución, abre un navegador web y navega a:

```
http://localhost:3001
```

## Funcionalidades

### Autenticación de Dispositivos

El servidor espera que los dispositivos se autentiquen enviando un evento `AUTHENTICATE` con la siguiente información:

```javascript
{
  id: "uuid-del-dispositivo",
  name: "Nombre-del-Dispositivo",
  ip: "dirección-ip",
  mac: "dirección-mac",
  status: "active"
}
```

### Heartbeats

Los dispositivos deben enviar periódicamente un evento `heartbeat` con información actualizada:

```javascript
{
  id: "uuid-del-dispositivo",
  name: "Nombre-del-Dispositivo",
  ip: "dirección-ip",
  mac: "dirección-mac",
  status: "active",
  timestamp: "2023-04-08T12:00:00.000Z",
  vlc: {
    status: {
      status: "playing",
      connected: true,
      currentItem: "video.mp4",
      // otras propiedades de estado de VLC
    },
    playlist: {
      name: "Mi Playlist",
      // otras propiedades de playlist
    }
  },
  snapshot: "data:image/png;base64,..." // opcional
}
```

### Comandos de Control

El emulador permite enviar los siguientes comandos a los dispositivos:

- `PLAY`: Iniciar reproducción
- `PAUSE`: Pausar reproducción
- `STOP`: Detener reproducción
- `NEXT`: Reproducir siguiente elemento
- `PREVIOUS`: Reproducir elemento anterior
- `VOLUME_UP`: Subir volumen
- `VOLUME_DOWN`: Bajar volumen
- `MUTE`: Silenciar
- `UNMUTE`: Activar sonido

## API REST

El servidor también proporciona una API REST para interactuar con los dispositivos:

### Obtener lista de dispositivos

```
GET /api/devices
```

Respuesta:

```json
{
  "success": true,
  "devices": [
    {
      "id": "uuid-del-dispositivo",
      "name": "Nombre-del-Dispositivo",
      "ip": "dirección-ip",
      "mac": "dirección-mac",
      "status": "active",
      "connectedAt": "2023-04-08T12:00:00.000Z",
      "lastHeartbeat": "2023-04-08T12:05:00.000Z",
      "vlcStatus": {
        "status": "playing",
        "connected": true,
        "currentItem": "video.mp4"
      }
    }
  ]
}
```

### Enviar comando a un dispositivo

```
POST /api/devices/:deviceId/command
```

Cuerpo de la solicitud:

```json
{
  "action": "PLAY",
  "data": {} // datos adicionales opcionales
}
```

Respuesta:

```json
{
  "success": true,
  "message": "Comando PLAY enviado al dispositivo Nombre-del-Dispositivo"
}
```

## Integración con la Aplicación Principal

Para integrar este emulador con la aplicación principal, asegúrate de que la configuración del cliente controlador (`ControllerClient`) apunte al servidor del emulador:

```javascript
const controllerUrl = 'http://localhost:3001';
const monitorUrl = 'http://localhost:3002';
controllerClient = new ControllerClient(controllerUrl, monitorUrl);
```

## Solución de Problemas

### El servidor no inicia

- Verifica que el puerto 3001 no esté en uso por otra aplicación
- Asegúrate de que todas las dependencias estén instaladas correctamente

### Los dispositivos no se conectan

- Verifica que la URL del servidor en la configuración del cliente controlador sea correcta
- Asegúrate de que no haya problemas de red o firewall que bloqueen la comunicación

### Los comandos no funcionan

- Verifica que el dispositivo esté conectado y autenticado
- Comprueba los logs del servidor para ver si hay errores

## Contribución

Si deseas contribuir a este proyecto, por favor:

1. Haz un fork del repositorio
2. Crea una rama para tu característica (`git checkout -b feature/nueva-caracteristica`)
3. Haz commit de tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Haz push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia ISC. 