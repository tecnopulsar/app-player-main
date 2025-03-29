import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración
const PORT = 3001;
const LOG_DIR = './logs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear servidor Express
const app = express();
const httpServer = createServer(app);

// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Almacenamiento de dispositivos conectados
const connectedDevices = new Map();

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Función para guardar evento en log
function logEvent(deviceId, event, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    data
  };

  const deviceDir = path.join(LOG_DIR, deviceId || 'unknown');
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }

  const logFile = path.join(deviceDir, `${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

  console.log(`[${timestamp}] ${deviceId} - ${event}`);
}

// Configurar rutas para la interfaz web
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API para obtener dispositivos conectados
app.get('/api/devices', (req, res) => {
  const devices = [];
  connectedDevices.forEach((device, id) => {
    devices.push({
      id,
      deviceId: device.deviceId,
      name: device.deviceName,
      connected: device.connected,
      lastSeen: device.lastSeen,
      status: device.status
    });
  });
  res.json({ devices });
});

// API para obtener logs de un dispositivo
app.get('/api/logs/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;
  const deviceDir = path.join(LOG_DIR, deviceId);

  if (!fs.existsSync(deviceDir)) {
    return res.status(404).json({ error: 'No logs found for this device' });
  }

  const files = fs.readdirSync(deviceDir);
  const logFiles = files.filter(file => file.endsWith('.log'));

  res.json({ deviceId, logFiles });
});

// API para obtener contenido de un log específico
app.get('/api/logs/:deviceId/:filename', (req, res) => {
  const { deviceId, filename } = req.params;
  const logFile = path.join(LOG_DIR, deviceId, filename);

  if (!fs.existsSync(logFile)) {
    return res.status(404).json({ error: 'Log file not found' });
  }

  const content = fs.readFileSync(logFile, 'utf8');
  const events = content.split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

  res.json({ deviceId, filename, events });
});

// API para enviar comando a un dispositivo
app.post('/api/command/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;
  const { action, params } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  const device = Array.from(connectedDevices.entries())
    .find(([_, dev]) => dev.deviceId === deviceId);

  if (!device) {
    return res.status(404).json({ error: 'Device not found or not connected' });
  }

  const socketId = device[0];
  const command = {
    id: `cmd_${Date.now()}`,
    action,
    params: params || {},
    timestamp: new Date().toISOString()
  };

  io.to(socketId).emit('command', command);
  logEvent(deviceId, 'command:sent', command);

  res.json({ success: true, command });
});

// Manejar conexiones Socket.IO
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Nueva conexión: ${socket.id}`);

  // Almacenar información inicial
  connectedDevices.set(socket.id, {
    connected: true,
    lastSeen: new Date(),
    deviceId: 'unknown',
    deviceName: 'unknown',
    status: 'connected'
  });

  // Enviar mensaje de bienvenida al cliente
  socket.emit('welcome', {
    message: 'Conectado al servidor de depuración',
    serverId: 'debug-server',
    timestamp: new Date().toISOString()
  });

  // Manejar evento device:info (identificación del dispositivo)
  socket.on('device:info', (data) => {
    console.log(`[${new Date().toISOString()}] device:info de ${socket.id}:`, data);

    const deviceInfo = connectedDevices.get(socket.id) || {};
    deviceInfo.deviceId = data.id || 'unknown';
    deviceInfo.deviceName = data.name || 'unnamed';
    deviceInfo.deviceType = data.type || 'player';
    deviceInfo.lastSeen = new Date();
    deviceInfo.info = data;

    connectedDevices.set(socket.id, deviceInfo);
    logEvent(deviceInfo.deviceId, 'device:info', data);

    // Notificar a todos los clientes web sobre el nuevo dispositivo
    io.emit('device:connected', {
      socketId: socket.id,
      ...deviceInfo
    });
  });

  // Manejar evento state:update (estado completo)
  socket.on('state:update', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';

    console.log(`[${new Date().toISOString()}] state:update de ${deviceId}`);

    if (deviceInfo) {
      deviceInfo.lastSeen = new Date();
      deviceInfo.state = data;
      deviceInfo.status = data.player?.status || 'unknown';
      connectedDevices.set(socket.id, deviceInfo);
    }

    logEvent(deviceId, 'state:update', data);

    // Emitir a clientes web
    io.emit('device:state', {
      socketId: socket.id,
      deviceId,
      state: data
    });
  });

  // Manejar eventos específicos de componentes
  const componentEvents = [
    'player:status',
    'system:status',
    'network:status',
    'playlist:status'
  ];

  componentEvents.forEach(eventName => {
    socket.on(eventName, (data) => {
      const deviceInfo = connectedDevices.get(socket.id);
      const deviceId = deviceInfo?.deviceId || 'unknown';

      console.log(`[${new Date().toISOString()}] ${eventName} de ${deviceId}`);

      if (deviceInfo) {
        deviceInfo.lastSeen = new Date();
        deviceInfo[eventName.split(':')[0]] = data;

        // Actualizar estado si es player:status
        if (eventName === 'player:status') {
          deviceInfo.status = data.status || 'unknown';
        }

        connectedDevices.set(socket.id, deviceInfo);
      }

      logEvent(deviceId, eventName, data);

      // Emitir a clientes web
      io.emit('device:component', {
        socketId: socket.id,
        deviceId,
        component: eventName.split(':')[0],
        data
      });
    });
  });

  // Manejar respuestas a comandos
  socket.on('command:response', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';

    console.log(`[${new Date().toISOString()}] command:response de ${deviceId}:`, data);
    logEvent(deviceId, 'command:response', data);

    // Emitir a clientes web
    io.emit('device:command:response', {
      socketId: socket.id,
      deviceId,
      response: data
    });
  });

  // Manejar errores de comandos
  socket.on('command:error', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';

    console.log(`[${new Date().toISOString()}] command:error de ${deviceId}:`, data);
    logEvent(deviceId, 'command:error', data);

    // Emitir a clientes web
    io.emit('device:command:error', {
      socketId: socket.id,
      deviceId,
      error: data
    });
  });

  // Manejar errores de monitoreo
  socket.on('monitor:error', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';

    console.log(`[${new Date().toISOString()}] monitor:error de ${deviceId}:`, data);
    logEvent(deviceId, 'monitor:error', data);

    // Emitir a clientes web
    io.emit('device:monitor:error', {
      socketId: socket.id,
      deviceId,
      error: data
    });
  });

  // Manejar solicitudes de estado
  socket.on('request:state', () => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';

    console.log(`[${new Date().toISOString()}] request:state de ${deviceId}`);
    logEvent(deviceId, 'request:state', {});
  });

  // Manejar desconexión
  socket.on('disconnect', (reason) => {
    const deviceInfo = connectedDevices.get(socket.id);
    const deviceId = deviceInfo?.deviceId || 'unknown';

    console.log(`[${new Date().toISOString()}] Desconexión: ${deviceId} (${socket.id}) - Razón: ${reason}`);

    if (deviceInfo) {
      deviceInfo.connected = false;
      deviceInfo.disconnectReason = reason;
      deviceInfo.disconnectTime = new Date();
      connectedDevices.set(socket.id, deviceInfo);
    }

    logEvent(deviceId, 'disconnect', { reason });

    // Notificar a clientes web
    io.emit('device:disconnected', {
      socketId: socket.id,
      deviceId,
      reason
    });
  });
});

// Iniciar servidor
httpServer.listen(PORT, () => {
  console.log(`Servidor de depuración iniciado en puerto ${PORT}`);
  console.log(`Panel web disponible en: http://localhost:${PORT}`);
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
  console.log('\nCerrando servidor...');
  httpServer.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});