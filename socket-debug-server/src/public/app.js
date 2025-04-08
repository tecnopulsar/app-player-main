// Elementos del DOM
const devicesList = document.getElementById('devices-list');
const deviceSelect = document.getElementById('device-select');
const refreshButton = document.getElementById('refresh-devices');
const lastUpdateSpan = document.getElementById('last-update');
const deviceDetails = document.getElementById('device-details');
const commandButtons = document.querySelectorAll('.command-btn');

// Estado de la aplicación
let devices = [];
let selectedDeviceId = null;

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
                }
            }
        } else {
            console.error('Error al obtener dispositivos:', data.message);
        }
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
    }
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
        const response = await fetch(`/api/devices/${selectedDeviceId}/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
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

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return 'No disponible';

    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function formatTime(date) {
    return date.toLocaleTimeString();
} 