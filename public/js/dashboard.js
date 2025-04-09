class Dashboard {
    constructor() {
        this.socket = null;
        this.devices = new Map();
        this.config = {
            serverUrl: localStorage.getItem('serverUrl') || 'http://localhost:3002',
            reconnectInterval: 5000,
            maxReconnectAttempts: 5
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.connect();
    }

    setupEventListeners() {
        // Configuración del servidor
        document.getElementById('serverUrl').value = this.config.serverUrl;
        document.getElementById('connectBtn').addEventListener('click', () => this.connect());

        // Navegación
        document.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });
    }

    setupNavigation() {
        const hash = window.location.hash || '#devices';
        this.showSection(hash.substring(1));
    }

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelectorAll('.menu a').forEach(link => {
            link.classList.remove('active');
        });

        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`.menu a[href="#${sectionId}"]`).classList.add('active');
    }

    connect() {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(this.config.serverUrl);
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            this.addLog('Conectado al servidor', 'info');
        });

        this.socket.on('disconnect', () => {
            this.addLog('Desconectado del servidor', 'warning');
        });

        this.socket.on('error', (error) => {
            this.addLog(`Error: ${error.message}`, 'error');
        });

        this.socket.on('deviceUpdate', (device) => {
            this.updateDevice(device);
        });

        this.socket.on('deviceList', (devices) => {
            this.updateDeviceList(devices);
        });
    }

    updateDevice(device) {
        this.devices.set(device.id, device);
        this.renderDevice(device);
    }

    updateDeviceList(devices) {
        this.devices.clear();
        devices.forEach(device => this.updateDevice(device));
    }

    renderDevice(device) {
        let deviceElement = document.getElementById(`device-${device.id}`);

        if (!deviceElement) {
            deviceElement = document.createElement('div');
            deviceElement.id = `device-${device.id}`;
            deviceElement.className = 'device-card';
            document.querySelector('.device-grid').appendChild(deviceElement);
        }

        deviceElement.innerHTML = `
            <div class="device-header">
                <span class="device-name">${device.name}</span>
                <span class="status-indicator ${device.online ? 'online' : ''}"></span>
            </div>
            <div class="device-info">
                <p>ID: ${device.id}</p>
                <p>IP: ${device.ip}</p>
                <p>Último heartbeat: ${new Date(device.lastHeartbeat).toLocaleString()}</p>
            </div>
            <div class="snapshot-container">
                <img src="${device.snapshot || 'images/placeholder.jpg'}" alt="Snapshot">
            </div>
            <div class="device-actions">
                <button class="btn" onclick="dashboard.sendCommand('${device.id}', 'PLAY')">Play</button>
                <button class="btn" onclick="dashboard.sendCommand('${device.id}', 'PAUSE')">Pause</button>
                <button class="btn" onclick="dashboard.sendCommand('${device.id}', 'STOP')">Stop</button>
            </div>
        `;
    }

    sendCommand(deviceId, command) {
        if (!this.socket) {
            this.addLog('No hay conexión con el servidor', 'error');
            return;
        }

        this.socket.emit('command', { deviceId, command });
        this.addLog(`Comando enviado: ${command} a dispositivo ${deviceId}`, 'info');
    }

    addLog(message, level = 'info') {
        const logsContainer = document.querySelector('.logs-container');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';

        const time = new Date().toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-level ${level}">${level.toUpperCase()}</span>
            <span class="log-message">${message}</span>
        `;

        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
}

// Inicializar el dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
}); 