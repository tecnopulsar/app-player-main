// sudo netstat -tuln | grep :3002

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

class MonitorServer {
    constructor(port = 3001) {
        this.port = port;
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new Server(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.devices = new Map();
        this.heartbeatTimeout = 30000; // 30 segundos
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        // Ruta principal para el dashboard de monitoreo
        this.app.get('/', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Monitor de Dispositivos</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        .device-card.offline {
                            opacity: 0.7;
                            background-color: #f8d7da;
                        }
                        .status-indicator {
                            width: 10px;
                            height: 10px;
                            border-radius: 50%;
                            display: inline-block;
                            margin-right: 5px;
                        }
                        .status-online {
                            background-color: #28a745;
                        }
                        .status-offline {
                            background-color: #dc3545;
                        }
                    </style>
                </head>
                <body class="bg-gray-100">
                    <div class="container mx-auto p-4">
                        <h1 class="text-3xl font-bold mb-4">Monitor de Dispositivos</h1>
                        <div class="bg-white shadow rounded-lg p-4 mb-4">
                            <h2 class="text-xl font-semibold">Resumen</h2>
                            <p class="mt-2">Dispositivos conectados: <span id="deviceCount" class="font-bold">0</span></p>
                            <p>Última actualización: <span id="lastUpdate" class="font-bold">-</span></p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="devicesContainer">
                            <!-- Los dispositivos se agregarán aquí dinámicamente -->
                        </div>
                    </div>

                    <script src="/socket.io/socket.io.js"></script>
                    <script>
                        const socket = io();
                        const devicesContainer = document.getElementById('deviceCount');
                        const lastUpdate = document.getElementById('lastUpdate');
                        const devicesList = document.getElementById('devicesContainer');

                        socket.on('devices-update', (devices) => {
                            devicesContainer.textContent = devices.length;
                            lastUpdate.textContent = new Date().toLocaleString();
                            updateDevicesList(devices);
                        });

                        function updateDevicesList(devices) {
                            devicesList.innerHTML = '';
                            devices.forEach(device => {
                                const card = createDeviceCard(device);
                                devicesList.appendChild(card);
                            });
                        }

                        function createDeviceCard(device) {
                            const card = document.createElement('div');
                            card.className = 'bg-white shadow rounded-lg p-4 transition-all duration-300 ' + 
                                            (device.status === 'active' ? '' : 'device-card offline');
                            card.innerHTML = \`
                                <h3 class="text-lg font-semibold">
                                    <span class="status-indicator \${device.status === 'active' ? 'status-online' : 'status-offline'}"></span>
                                    \${device.name || 'Dispositivo sin nombre'}
                                </h3>
                                <p class="mt-2 text-sm">
                                    <strong>ID:</strong> \${device.id || 'No asignado'}<br>
                                    <strong>IP:</strong> \${device.ip}<br>
                                    <strong>MAC:</strong> \${device.mac}<br>
                                    <strong>Estado:</strong> \${device.status === 'active' ? 'Activo' : 'Inactivo'}<br>
                                    <strong>Último heartbeat:</strong> 
                                    <span class="heartbeat-time">\${new Date(device.lastSeen).toLocaleString()}</span>
                                </p>
                            \`;
                            return card;
                        }
                    </script>
                </body>
                </html>
            `);
        });

        // API para obtener el estado de los dispositivos
        this.app.get('/api/devices', (req, res) => {
            res.json(Array.from(this.devices.values()));
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('\n=== Cliente de Monitoreo Conectado ===');
            console.log(`ID del socket: ${socket.id}`);
            console.log('=====================================\n');

            // Enviar estado actual al cliente que se conecta
            socket.emit('devices-update', Array.from(this.devices.values()));

            // Manejar heartbeats de dispositivos
            socket.on('heartbeat', (deviceInfo) => {
                console.log('\n=== Heartbeat Recibido ===');
                console.log(`ID: ${deviceInfo.id || 'No asignado'}`);
                console.log(`IP: ${deviceInfo.ip}`);
                console.log(`MAC: ${deviceInfo.mac}`);
                console.log(`Estado: ${deviceInfo.status ? 'Activo' : 'Inactivo'}`);
                console.log('========================\n');

                this.updateDevice(deviceInfo);
            });

            // Simular eventos de control
            socket.on('PLAY', (data) => {
                console.log('\n=== Evento PLAY Recibido ===');
                console.log('Datos:', data);
                console.log('========================\n');
            });

            socket.on('PAUSE', (data) => {
                console.log('\n=== Evento PAUSE Recibido ===');
                console.log('Datos:', data);
                console.log('========================\n');
            });

            socket.on('STOP', (data) => {
                console.log('\n=== Evento STOP Recibido ===');
                console.log('Datos:', data);
                console.log('========================\n');
            });

            socket.on('disconnect', () => {
                console.log('\n=== Cliente de Monitoreo Desconectado ===');
                console.log(`ID del socket: ${socket.id}`);
                console.log('========================================\n');
            });
        });

        // Verificar dispositivos offline cada 30 segundos
        setInterval(() => {
            const now = Date.now();
            for (const [deviceId, device] of this.devices.entries()) {
                const lastSeen = new Date(device.lastSeen).getTime();
                if (now - lastSeen > this.heartbeatTimeout) {
                    console.log(`\nDispositivo ${deviceId} marcado como offline`);
                    this.markDeviceOffline(deviceId);
                }
            }
        }, this.heartbeatTimeout);
    }

    // Método para actualizar el estado de un dispositivo
    updateDevice(deviceInfo) {
        const deviceId = deviceInfo.id || deviceInfo.mac;
        const existingDevice = this.devices.get(deviceId);

        this.devices.set(deviceId, {
            ...deviceInfo,
            lastSeen: new Date().toISOString(),
            status: 'active',
            name: deviceInfo.name || existingDevice?.name || 'Dispositivo sin nombre'
        });

        // Notificar a todos los clientes conectados
        this.io.emit('devices-update', Array.from(this.devices.values()));
    }

    // Método para marcar un dispositivo como offline
    markDeviceOffline(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.status = 'offline';
            this.io.emit('devices-update', Array.from(this.devices.values()));
        }
    }

    // Método para liberar el puerto antes de iniciar el servidor
    async freePort() {
        return new Promise((resolve, reject) => {
            const server = createServer();
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`El puerto ${this.port} está en uso. Intentando liberar...`);
                    server.close(() => {
                        console.log(`Puerto ${this.port} liberado.`);
                        resolve();
                    });
                } else {
                    reject(err);
                }
            });

            server.listen(this.port, () => {
                server.close(() => {
                    console.log(`Puerto ${this.port} está disponible.`);
                    resolve();
                });
            });
        });
    }

    // Método para iniciar el servidor
    async start() {
        try {
            await this.freePort(); // Liberar el puerto antes de iniciar
            this.httpServer.listen(this.port, () => {
                console.log('\n=== Servidor de Monitoreo Iniciado ===');
                console.log(`URL: http://localhost:${this.port}`);
                console.log(`Puerto: ${this.port}`);
                console.log('Modo: Simulación de App Controladora');
                console.log('=====================================\n');
            });
        } catch (err) {
            console.error('Error al iniciar el servidor:', err);
        }
    }

    // Método para detener el servidor
    stop() {
        this.httpServer.close(() => {
            console.log('\n=== Servidor de Monitoreo Detenido ===');
            console.log('=====================================\n');
        });
    }
}

export default MonitorServer;