import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Estado del servidor
const serverState = {
    connectedDevices: new Map(),
    lastHeartbeats: new Map(),
    deviceHistory: new Map()
};

// Rutas API
app.get('/api/devices', (req, res) => {
    const devices = Array.from(serverState.connectedDevices.values()).map(device => ({
        ...device,
        lastHeartbeat: serverState.lastHeartbeats.get(device.id),
        history: serverState.deviceHistory.get(device.id) || []
    }));
    res.json(devices);
});

app.get('/api/device/:id', (req, res) => {
    const device = serverState.connectedDevices.get(req.params.id);
    if (!device) {
        return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }
    res.json({
        ...device,
        lastHeartbeat: serverState.lastHeartbeats.get(device.id),
        history: serverState.deviceHistory.get(device.id) || []
    });
});

// Manejo de conexiones Socket.IO
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado al monitor:', socket.id);

    // Manejar heartbeat
    socket.on('heartbeat', (data) => {
        try {
            const { id, name, ip, mac, status, vlc, snapshot, timestamp } = data;

            // Actualizar estado del dispositivo
            serverState.connectedDevices.set(id, {
                id,
                name,
                ip,
                mac,
                status,
                lastSeen: timestamp
            });

            // Actualizar último heartbeat
            serverState.lastHeartbeats.set(id, {
                timestamp,
                vlc,
                snapshot: snapshot ? 'Presente' : 'No disponible'
            });

            // Actualizar historial
            const history = serverState.deviceHistory.get(id) || [];
            history.push({
                timestamp,
                vlc,
                snapshot: snapshot ? 'Presente' : 'No disponible'
            });
            // Mantener solo los últimos 10 registros
            if (history.length > 10) history.shift();
            serverState.deviceHistory.set(id, history);

            console.log(`💓 Heartbeat recibido de ${name} (${id})`);
            console.log(`   Estado VLC: ${vlc?.status?.status || 'N/A'}`);
            console.log(`   Snapshot: ${snapshot ? 'Presente' : 'No disponible'}`);
        } catch (error) {
            console.error('❌ Error al procesar heartbeat:', error);
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado del monitor:', socket.id);
    });
});

// Iniciar servidor
const PORT = 3002;
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor de Monitor ejecutándose en http://localhost:${PORT}`);
    console.log('📊 Endpoints disponibles:');
    console.log(`   GET /api/devices - Lista de dispositivos conectados`);
    console.log(`   GET /api/device/:id - Información detallada de un dispositivo`);
}); 