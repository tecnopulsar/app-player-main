// Elementos del DOM
const devicesList = document.getElementById('devices-list');
const deviceSelect = document.getElementById('device-select');
const refreshButton = document.getElementById('refresh-devices');
const lastUpdateSpan = document.getElementById('last-update');
const deviceDetails = document.getElementById('device-details');
const commandButtons = document.querySelectorAll('.command-btn');
const systemInfo = document.getElementById('system-info');
const systemResources = document.getElementById('system-resources');
const networkInfo = document.getElementById('network-info');
const vlcInfo = document.getElementById('vlc-info');
const deviceSnapshot = document.getElementById('device-snapshot');
const noSnapshotMessage = document.getElementById('no-snapshot-message');

// Estado de la aplicación
let devices = [];
let selectedDeviceId = null;
let snapshotInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 segundos

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar dispositivos al iniciar
    fetchDevices();

    // Configurar eventos
    refreshButton.addEventListener('click', fetchDevices);
    deviceSelect.addEventListener('change', handleDeviceSelection);

    // Configurar eventos para los botones de comando
    commandButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            sendCommand(action);
        });
    });

    // Actualizar automáticamente cada 5 segundos
    setInterval(fetchDevices, 5000);
});

// Funciones principales
async function fetchDevices() {
    try {
        const response = await fetch('/api/devices');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();

        if (data.success) {
            devices = data.devices;
            updateDevicesList();
            updateDeviceSelect();
            updateLastUpdateTime();

            // Si hay un dispositivo seleccionado, actualizar sus detalles
            if (selectedDeviceId) {
                const device = devices.find(d => d.id === selectedDeviceId);
                if (device) {
                    updateDeviceDetails(device);
                } else {
                    // Si el dispositivo ya no está disponible, deseleccionar
                    selectedDeviceId = null;
                    deviceSelect.value = '';
                    deviceSelect.disabled = true;
                    updateDeviceDetails(null);
                    stopSnapshotInterval();
                }
            }
            // Resetear contador de reconexión si la conexión es exitosa
            reconnectAttempts = 0;
        } else {
            throw new Error(data.message || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
        handleConnectionError();
    }
}

function handleConnectionError() {
    reconnectAttempts++;
    console.log(`Intento de reconexión ${reconnectAttempts} de ${MAX_RECONNECT_ATTEMPTS}`);

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Máximo número de intentos de reconexión alcanzado');
        alert('Error de conexión con el servidor. Por favor, verifica la conexión y recarga la página.');
        return;
    }

    // Intentar reconectar después de un delay
    setTimeout(fetchDevices, RECONNECT_DELAY);
}

function updateDevicesList() {
    // Limpiar lista actual
    devicesList.innerHTML = '';

    if (devices.length === 0) {
        devicesList.innerHTML = '<p class="no-devices">No hay dispositivos conectados</p>';
        return;
    }

    // Crear elementos para cada dispositivo
    devices.forEach(device => {
        const deviceElement = document.createElement('div');
        deviceElement.className = `device-item ${device.id === selectedDeviceId ? 'selected' : ''}`;
        deviceElement.dataset.deviceId = device.id;

        // Determinar el estado del dispositivo
        const isActive = device.lastHeartbeat &&
            (new Date() - new Date(device.lastHeartbeat)) < 30000; // 30 segundos

        deviceElement.innerHTML = `
      <h3>
        <span class="device-status ${isActive ? 'status-active' : 'status-inactive'}"></span>
        ${device.name}
      </h3>
      <p>ID: ${device.id}</p>
      <p>IP: ${device.ip}</p>
      <p>Estado VLC: ${device.vlcStatus?.status || 'Desconocido'}</p>
    `;

        // Agregar evento de clic
        deviceElement.addEventListener('click', () => {
            // Deseleccionar todos los dispositivos
            document.querySelectorAll('.device-item').forEach(item => {
                item.classList.remove('selected');
            });

            // Seleccionar el dispositivo actual
            deviceElement.classList.add('selected');

            // Actualizar el selector
            deviceSelect.value = device.id;

            // Actualizar detalles
            selectedDeviceId = device.id;
            updateDeviceDetails(device);
        });

        devicesList.appendChild(deviceElement);
    });
}

function updateDeviceSelect() {
    // Limpiar selector actual
    deviceSelect.innerHTML = '<option value="">-- Seleccionar --</option>';

    if (devices.length === 0) {
        deviceSelect.disabled = true;
        return;
    }

    // Habilitar selector
    deviceSelect.disabled = false;

    // Agregar opciones para cada dispositivo
    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = `${device.name} (${device.id})`;
        deviceSelect.appendChild(option);
    });

    // Restaurar selección si existe
    if (selectedDeviceId) {
        deviceSelect.value = selectedDeviceId;
    }
}

function handleDeviceSelection() {
    const deviceId = deviceSelect.value;

    if (!deviceId) {
        selectedDeviceId = null;
        updateDeviceDetails(null);
        return;
    }

    selectedDeviceId = deviceId;

    // Actualizar selección en la lista
    document.querySelectorAll('.device-item').forEach(item => {
        if (item.dataset.deviceId === deviceId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // Actualizar detalles
    const device = devices.find(d => d.id === deviceId);
    if (device) {
        updateDeviceDetails(device);
    }
}

function updateDeviceDetails(device) {
    if (!device) {
        deviceDetails.innerHTML = '<p>Selecciona un dispositivo para ver su información</p>';
        stopSnapshotInterval();
        return;
    }

    // Determinar el estado del dispositivo
    const isActive = device.lastHeartbeat &&
        (new Date() - new Date(device.lastHeartbeat)) < 30000; // 30 segundos

    deviceDetails.innerHTML = `
    <p><span class="detail-label">ID:</span> ${device.id}</p>
    <p><span class="detail-label">Nombre:</span> ${device.name}</p>
    <p><span class="detail-label">IP:</span> ${device.ip}</p>
    <p><span class="detail-label">MAC:</span> ${device.mac || 'No disponible'}</p>
    <p><span class="detail-label">Estado:</span> ${isActive ? 'Activo' : 'Inactivo'}</p>
    <p><span class="detail-label">Conectado desde:</span> ${formatDate(device.connectedAt)}</p>
    <p><span class="detail-label">Último heartbeat:</span> ${formatDate(device.lastHeartbeat)}</p>
    <p><span class="detail-label">Estado VLC:</span> ${device.vlcStatus?.status || 'Desconocido'}</p>
    <p><span class="detail-label">Archivo actual:</span> ${device.vlcStatus?.currentItem || 'Ninguno'}</p>
    <p><span class="detail-label">Playlist:</span> ${device.vlcStatus?.playlist || 'Ninguna'}</p>
  `;

    // Actualizar información del sistema
    updateDeviceInfo(device);

    // Iniciar actualización de snapshot si el dispositivo está activo
    if (isActive) {
        startSnapshotInterval(device);
    } else {
        stopSnapshotInterval();
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    lastUpdateSpan.textContent = `Última actualización: ${formatTime(now)}`;
}

async function sendCommand(action) {
    if (!selectedDeviceId) {
        alert('Por favor, selecciona un dispositivo primero');
        return;
    }

    // Deshabilitar el botón mientras se procesa el comando
    const button = document.querySelector(`[data-action="${action}"]`);
    if (button) {
        button.disabled = true;
        button.classList.add('loading');
    }

    try {
        console.log(`Enviando comando ${action} al dispositivo ${selectedDeviceId}`);

        // Obtener la IP del dispositivo seleccionado
        const device = devices.find(d => d.id === selectedDeviceId);
        if (!device) {
            throw new Error('Dispositivo no encontrado');
        }

        // Construir la URL del dispositivo
        const deviceUrl = `http://${device.ip}:3000`;

        // Mapear acciones a rutas de la API
        let endpoint = '';
        switch (action) {
            case 'PLAY':
                endpoint = '/api/vlc/play';
                break;
            case 'PAUSE':
                endpoint = '/api/vlc/pause';
                break;
            case 'STOP':
                endpoint = '/api/vlc/stop';
                break;
            case 'NEXT':
                endpoint = '/api/vlc/next';
                break;
            case 'PREVIOUS':
                endpoint = '/api/vlc/previous';
                break;
            case 'VOLUME_UP':
                endpoint = '/api/vlc/volume/up';
                break;
            case 'VOLUME_DOWN':
                endpoint = '/api/vlc/volume/down';
                break;
            case 'MUTE':
                endpoint = '/api/vlc/mute';
                break;
            case 'UNMUTE':
                endpoint = '/api/vlc/unmute';
                break;
            case 'FULLSCREEN':
                endpoint = '/api/vlc/fullscreen';
                break;
            default:
                throw new Error(`Comando no soportado: ${action}`);
        }

        // Enviar la solicitud a la API del dispositivo
        const response = await fetch(`${deviceUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log(`Comando ${action} enviado correctamente:`, data);
            // Mostrar notificación de éxito
            showNotification(`Comando ${action} enviado correctamente`, 'success');
            // Actualizar estado del dispositivo después de un breve retraso
            setTimeout(fetchDevices, 1000);
        } else {
            console.error(`Error al enviar comando ${action}:`, data.message);
            showNotification(`Error al enviar comando: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error(`Error al enviar comando ${action}:`, error);
        showNotification(`Error al enviar comando: ${error.message}`, 'error');
    } finally {
        // Rehabilitar el botón
        if (button) {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remover la notificación después de 3 segundos
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Función para actualizar la información del dispositivo
function updateDeviceInfo(device) {
    const deviceDetails = document.getElementById('device-details');
    const systemInfo = document.getElementById('system-info');
    const systemResources = document.getElementById('system-resources');
    const networkInfo = document.getElementById('network-info');
    const vlcInfo = document.getElementById('vlc-info');

    // Información básica del dispositivo
    deviceDetails.innerHTML = `
        <p><strong>ID:</strong> ${device.id}</p>
        <p><strong>Nombre:</strong> ${device.name}</p>
        <p><strong>IP:</strong> ${device.ip}</p>
        <p><strong>MAC:</strong> ${device.mac}</p>
        <p><strong>Estado:</strong> <span class="status-${device.status}">${device.status}</span></p>
        <p><strong>Último Heartbeat:</strong> ${formatDate(device.lastHeartbeat)}</p>
        <p><strong>Conectado desde:</strong> ${formatDate(device.connectedAt)}</p>
    `;

    // Información del sistema
    if (device.systemState) {
        const { system, network, vlc } = device.systemState;

        // Información del sistema
        systemInfo.innerHTML = `
            <p><strong>Plataforma:</strong> ${system.platform}</p>
            <p><strong>Arquitectura:</strong> ${system.arch}</p>
            <p><strong>Versión Node:</strong> ${system.version}</p>
            <p><strong>PID:</strong> ${system.pid}</p>
            <p><strong>Entorno:</strong> ${system.env}</p>
        `;

        // Recursos del sistema
        systemResources.innerHTML = `
            <p><strong>CPU:</strong> ${formatCPUUsage(system.cpu)}</p>
            <p><strong>Memoria:</strong> ${formatMemoryUsage(system.memory)}</p>
            <p><strong>Uptime:</strong> ${formatUptime(system.uptime)}</p>
        `;

        // Información de red
        networkInfo.innerHTML = `
            <p><strong>IP Local:</strong> ${network.localIP}</p>
            <p><strong>MAC:</strong> ${network.macAddress}</p>
        `;

        // Información de VLC
        vlcInfo.innerHTML = `
            <p><strong>Estado:</strong> ${vlc.status?.status || 'Desconocido'}</p>
            <p><strong>Reproduciendo:</strong> ${vlc.isRunning ? 'Sí' : 'No'}</p>
            <p><strong>Playlist:</strong> ${vlc.playlist?.name || 'Ninguna'}</p>
            <p><strong>Archivo actual:</strong> ${vlc.status?.currentItem || 'Ninguno'}</p>
            <p><strong>Duración:</strong> ${formatDuration(vlc.status?.length || 0)}</p>
            <p><strong>Tiempo actual:</strong> ${formatDuration(vlc.status?.time || 0)}</p>
            <p><strong>Volumen:</strong> ${vlc.status?.volume || 0}%</p>
        `;
    } else {
        systemInfo.innerHTML = '<p>No hay información del sistema disponible</p>';
        systemResources.innerHTML = '<p>No hay información de recursos disponible</p>';
        networkInfo.innerHTML = '<p>No hay información de red disponible</p>';
        vlcInfo.innerHTML = '<p>No hay información de VLC disponible</p>';
    }
}

// Funciones auxiliares para formatear datos
function formatDate(dateString) {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatCPUUsage(cpu) {
    if (!cpu) return 'N/A';
    return `${(cpu.user + cpu.system).toFixed(2)}%`;
}

function formatMemoryUsage(memory) {
    if (!memory) return 'N/A';
    const used = Math.round(memory.heapUsed / 1024 / 1024);
    const total = Math.round(memory.heapTotal / 1024 / 1024);
    return `${used}MB / ${total}MB (${Math.round(used / total * 100)}%)`;
}

function formatUptime(seconds) {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

function formatTime(date) {
    return date.toLocaleTimeString();
}

// Función para formatear la duración en segundos a formato legible
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '00:00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${padZero(hours)}:${padZero(minutes)}:${padZero(secs)}`;
}

// Función auxiliar para añadir ceros a la izquierda
function padZero(num) {
    return num.toString().padStart(2, '0');
}

function startSnapshotInterval(device) {
    // Detener el intervalo anterior si existe
    stopSnapshotInterval();

    // Función para actualizar el snapshot
    const updateSnapshot = () => {
        try {
            // Construir la URL directa al snapshot del cliente
            const snapshotUrl = `http://${device.ip}:3000/snapshots/snapshot.jpg`;

            // Agregar timestamp para evitar el caché del navegador
            const timestamp = new Date().getTime();
            deviceSnapshot.src = `${snapshotUrl}?t=${timestamp}`;
            deviceSnapshot.style.display = 'block';
            noSnapshotMessage.style.display = 'none';

            // Manejar errores de carga de imagen
            deviceSnapshot.onerror = () => {
                console.error('Error al cargar el snapshot');
                deviceSnapshot.style.display = 'none';
                noSnapshotMessage.style.display = 'block';
            };
        } catch (error) {
            console.error('Error al actualizar snapshot:', error);
            deviceSnapshot.style.display = 'none';
            noSnapshotMessage.style.display = 'block';
        }
    };

    // Actualizar inmediatamente y luego cada 5 segundos
    updateSnapshot();
    snapshotInterval = setInterval(updateSnapshot, 5000);
}

function stopSnapshotInterval() {
    if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
    }
    deviceSnapshot.style.display = 'none';
    noSnapshotMessage.style.display = 'block';
} 