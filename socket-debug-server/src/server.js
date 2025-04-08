import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Configuración
const PORT = 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear aplicación Express
const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(join(__dirname, 'public')));

// Ruta de salud para verificar que el servidor está funcionando
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Servidor de controlador funcionando correctamente' });
});

// Crear servidor HTTP
const httpServer = createServer(app);

// Configurar Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Almacenamiento de dispositivos conectados
const connectedDevices = new Map();

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Manejar autenticación de dispositivos
    socket.on('AUTHENTICATE', (deviceInfo) => {
        console.log('Dispositivo autenticando:', deviceInfo);

        // Almacenar información del dispositivo
        connectedDevices.set(socket.id, {
            ...deviceInfo,
            socketId: socket.id,
            connectedAt: new Date().toISOString()
        });

        // Enviar confirmación de autenticación
        socket.emit('AUTH_SUCCESS', {
            id: deviceInfo.id,
            name: deviceInfo.name
        });

        console.log(`Dispositivo autenticado: ${deviceInfo.name} (${deviceInfo.id})`);
    });

    // Manejar heartbeats de dispositivos
    socket.on('heartbeat', (data) => {
        const device = connectedDevices.get(socket.id);
        if (device) {
            // Actualizar información del dispositivo
            connectedDevices.set(socket.id, {
                ...device,
                lastHeartbeat: new Date().toISOString(),
                status: data.status,
                vlcData: data.vlc
            });

            console.log(`Heartbeat recibido de ${device.name} (${device.id})`);
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        const device = connectedDevices.get(socket.id);
        if (device) {
            console.log(`Dispositivo desconectado: ${device.name} (${device.id})`);
            connectedDevices.delete(socket.id);
        } else {
            console.log(`Cliente desconectado: ${socket.id}`);
        }
    });
});

// Ruta para obtener lista de dispositivos conectados
app.get('/api/devices', (req, res) => {
    const devices = Array.from(connectedDevices.values()).map(device => ({
        id: device.id,
        name: device.name,
        ip: device.ip,
        mac: device.mac,
        status: device.status,
        connectedAt: device.connectedAt,
        lastHeartbeat: device.lastHeartbeat,
        vlcStatus: device.vlcData?.status || null
    }));

    res.json({ success: true, devices });
});

// Ruta para enviar comandos a dispositivos
app.post('/api/devices/:deviceId/command', (req, res) => {
    const { deviceId } = req.params;
    const { action } = req.body;

    console.log(`Recibido comando ${action} para dispositivo ${deviceId}`);

    // Buscar el dispositivo por ID
    const device = Array.from(connectedDevices.values()).find(d => d.id === deviceId);

    if (!device) {
        console.error(`Dispositivo no encontrado: ${deviceId}`);
        return res.status(404).json({ success: false, message: 'Dispositivo no encontrado' });
    }

    // Obtener el socket del dispositivo
    const socket = io.sockets.sockets.get(device.socketId);

    if (!socket) {
        console.error(`Socket no encontrado para dispositivo: ${deviceId}`);
        return res.status(400).json({ success: false, message: 'Dispositivo no conectado' });
    }

    // Enviar comando al dispositivo
    console.log(`Enviando comando ${action} al socket ${device.socketId}`);
    socket.emit(action, { timestamp: new Date().toISOString() });

    // Confirmar recepción del comando
    socket.once('command_received', (response) => {
        console.log(`Comando ${action} recibido por el dispositivo:`, response);
    });

    res.json({
        success: true,
        message: `Comando ${action} enviado al dispositivo ${device.name}`,
        deviceId: device.id,
        socketId: device.socketId
    });
});

// Iniciar servidor
httpServer.listen(PORT, () => {
    console.log(`Servidor de controlador iniciado en http://localhost:${PORT}`);
    console.log('Esperando conexiones de dispositivos...');
}); 