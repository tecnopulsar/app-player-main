// Formatear el uptime en días, horas, minutos y segundos
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Formatear bytes a unidades legibles
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Formatear segundos a formato mm:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Formatear fecha ISO a formato local
function formatDate(isoDate) {
    const date = new Date(isoDate);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

// Formatear fecha ISO a solo fecha
function formatDateOnly(isoDate) {
    const date = new Date(isoDate);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// Formatear fecha ISO a solo hora
function formatTimeOnly(isoDate) {
    const date = new Date(isoDate);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

// Función para actualizar el dashboard con nuevos datos
function updateDashboard(data) {
    if (!data.success || !data.state) return;

    const state = data.state;

    // Actualizar timestamp
    document.getElementById('lastUpdate').textContent = `Actualizado: ${formatDate(state.timestamp)}`;

    // Actualizar info del dispositivo en el header
    document.getElementById('deviceInfo').textContent = `Player: ${state.app.deviceName} (${state.app.deviceId})`;

    // Actualizar información del sistema
    document.getElementById('hostname').textContent = state.system.hostname;
    document.getElementById('platform').textContent = state.system.platform;
    document.getElementById('arch').textContent = state.system.arch;
    document.getElementById('release').textContent = state.system.release;
    document.getElementById('cpus').textContent = state.system.cpus;
    document.getElementById('uptime').textContent = formatUptime(state.system.uptime);
    document.getElementById('loadavg').textContent = state.system.loadavg.join(', ');
    document.getElementById('timezone').textContent = `${state.system.timezone.name} (${state.system.timezone.offset})`;

    // Memoria
    const memUsedPercent = 100 - (state.system.freeMem / state.system.totalMem * 100);
    document.getElementById('memUsage').textContent = `${formatBytes(state.system.freeMem)} / ${formatBytes(state.system.totalMem)} (${(state.system.freeMem / state.system.totalMem * 100).toFixed(1)}% libre)`;
    document.querySelector('.system-card .progress-fill').style.width = `${memUsedPercent}%`;

    // Actualizar información de red
    document.getElementById('eth0-ip').textContent = state.system.network.eth0.address;
    document.getElementById('eth0-mask').textContent = state.system.network.eth0.netmask;
    document.getElementById('eth0-mac').textContent = state.system.network.eth0.mac;

    document.getElementById('wlan0-ip').textContent = state.system.network.wlan0.address;
    document.getElementById('wlan0-mask').textContent = state.system.network.wlan0.netmask;
    document.getElementById('wlan0-mac').textContent = state.system.network.wlan0.mac;

    // Actualizar información de VLC
    document.getElementById('vlc-playing').textContent = state.vlc.playing ? 'Sí' : 'No';
    document.getElementById('vlc-paused').textContent = state.vlc.paused ? 'Sí' : 'No';
    document.getElementById('vlc-stopped').textContent = state.vlc.stopped ? 'Sí' : 'No';
    document.getElementById('currentItem').textContent = state.vlc.currentItem;
    document.getElementById('current-time').textContent = formatTime(state.vlc.time);
    document.getElementById('total-time').textContent = formatTime(state.vlc.length);
    document.getElementById('volume').textContent = `${state.vlc.volume}%`;
    document.getElementById('random').textContent = state.vlc.random ? 'Sí' : 'No';
    document.getElementById('repeat').textContent = state.vlc.repeat ? 'Sí' : 'No';
    document.getElementById('fullscreen').textContent = state.vlc.fullscreen ? 'Sí' : 'No';

    document.querySelector('.vlc-progress-fill').style.width = `${state.vlc.position * 100}%`;

    // Actualizar información de almacenamiento
    document.getElementById('playlistDir').textContent = state.storage.playlistDirectory;
    document.getElementById('videoStats').textContent = `${state.storage.videosStats.fileCount} archivos`;
    document.getElementById('storageTimestamp').textContent = formatTimeOnly(state.storage.timestamp);

    const diskUsedPercent = (state.storage.usedSpace / state.storage.totalSpace) * 100;
    document.getElementById('diskUsage').textContent = `${formatBytes(state.storage.usedSpace)} / ${formatBytes(state.storage.totalSpace)} (${(state.storage.freeSpace / state.storage.totalSpace * 100).toFixed(1)}% libre)`;
    document.querySelector('.storage-card .progress-fill').style.width = `${diskUsedPercent}%`;
    document.querySelector('.progress-label span:first-child').textContent = `Usado: ${formatBytes(state.storage.usedSpace)}`;
    document.querySelector('.progress-label span:last-child').textContent = `Libre: ${formatBytes(state.storage.freeSpace)}`;

    // Actualizar información de la aplicación
    document.getElementById('deviceId').textContent = state.app.deviceId;
    document.getElementById('deviceName').textContent = state.app.deviceName;
    document.getElementById('deviceType').textContent = state.app.deviceType;
    document.getElementById('deviceGroup').textContent = state.app.deviceGroup;
    document.getElementById('appVersion').textContent = state.app.version;
    document.getElementById('nodeVersion').textContent = state.app.nodeVersion;
    document.getElementById('serverConfig').textContent = `${state.app.server.host}:${state.app.server.port}`;
    document.getElementById('vlcConfig').textContent = `${state.app.vlcConfig.host}:${state.app.vlcConfig.port}`;
    document.getElementById('startTime').textContent = formatDate(state.app.startTime);

    // Actualizar información de la playlist
    document.getElementById('playlistActive').textContent = state.activePlaylist.playlistName;
    document.getElementById('playlistPath').textContent = state.activePlaylist.playlistPath.split('/').pop();
    document.getElementById('currentIndex').textContent = `${state.activePlaylist.currentIndex} / ${state.activePlaylist.fileCount}`;
    document.getElementById('lastLoaded').textContent = formatDateOnly(state.activePlaylist.lastLoaded);
    document.getElementById('defaultPlaylist').textContent = `${state.defaultPlaylist.playlistName} (${state.defaultPlaylist.playlistPath.split('/').pop()})`;

    // Actualizar snapshot
    document.getElementById('snapshot-img').src = state.snapshot.url;
    document.getElementById('snapshot-time').textContent = `Captura: ${formatDate(state.snapshot.createdAt)}`;
}

// Función para actualizar periódicamente el dashboard
async function fetchStatus() {
    try {
        const response = await fetch('/api/system/state');
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error al obtener el estado:', error);
    }
}

// Datos iniciales de ejemplo para desarrollo
const initialState = {
    "success": true,
    "state": {
        "timestamp": "2025-04-11T13:13:54.201Z",
        "system": {
            "hostname": "base",
            "platform": "linux",
            "arch": "arm64",
            "release": "6.12.18-v8+",
            "cpus": 4,
            "totalMem": 3923357696,
            "freeMem": 1773985792,
            "uptime": 346128.55,
            "loadavg": [1.81, 1.63, 1.62],
            "network": {
                "lo": {
                    "address": "127.0.0.1",
                    "netmask": "255.0.0.0",
                    "mac": "00:00:00:00:00:00",
                    "internal": true
                },
                "eth0": {
                    "address": "192.168.1.200",
                    "netmask": "255.255.255.0",
                    "mac": "d8:3a:dd:0b:20:e8",
                    "internal": false
                },
                "wlan0": {
                    "address": "192.168.1.84",
                    "netmask": "255.255.255.0",
                    "mac": "d8:3a:dd:0b:20:e9",
                    "internal": false
                }
            },
            "timezone": {
                "name": "UTC",
                "offset": "+0000",
                "abbr": "UTC"
            },
            "timestamp": "2025-04-11T13:13:54.122Z"
        },
        "storage": {
            "playlistDirectory": "./public/videos",
            "videosStats": {
                "exists": true,
                "isDirectory": true,
                "size": 0,
                "fileCount": 0
            },
            "totalSpace": 61641601024,
            "freeSpace": 40081494016,
            "usedSpace": 21560107008,
            "timestamp": "2025-04-11T13:13:54.168Z"
        },
        "vlc": {
            "connected": true,
            "playing": true,
            "paused": false,
            "stopped": false,
            "currentItem": "ForBiggerEscapes.mp4",
            "position": 0.14300139248371,
            "time": 2,
            "length": 15,
            "volume": 0,
            "random": false,
            "repeat": false,
            "fullscreen": false
        },
        "app": {
            "deviceId": "9c30157f",
            "deviceName": "base",
            "deviceType": "player",
            "deviceGroup": "default",
            "server": {
                "port": 3000,
                "host": "0.0.0.0"
            },
            "vlcConfig": {
                "host": "localhost",
                "port": 8080
            },
            "version": "1.0.0",
            "startTime": "2025-04-11T13:13:54.199Z",
            "nodeVersion": "v22.14.0"
        },
        "activePlaylist": {
            "playlistName": "VideosCortos",
            "playlistPath": "public/videos/VideosCortos/VideosCortos.m3u",
            "lastLoaded": "2025-04-10T14:57:29.030Z",
            "isActive": true,
            "currentIndex": 1,
            "fileCount": 3,
            "isDefault": false
        },
        "defaultPlaylist": {
            "playlistName": "wetechar",
            "playlistPath": "public/videos/wetechar/wetechar.m3u"
        },
        "snapshot": {
            "url": "public/snapshots/snapshot.jpg",
            "createdAt": "2025-04-11T00:21:01.037Z"
        }
    }
};

// Inicializar el dashboard con datos de ejemplo
document.addEventListener('DOMContentLoaded', function () {
    // Iniciar con datos de ejemplo
    updateDashboard(initialState);

    // Actualizar cada 5 segundos
    setInterval(fetchStatus, 5000);
}); 