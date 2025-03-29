import { io } from 'socket.io-client';
import readline from 'readline';

// Configuración
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const DEVICE_ID = process.env.DEVICE_ID || `player-${Math.floor(Math.random() * 1000)}`;
const DEVICE_NAME = process.env.DEVICE_NAME || `Test Player ${DEVICE_ID}`;

// Crear interfaz de línea de comandos
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`Connecting to ${SERVER_URL} as ${DEVICE_NAME} (${DEVICE_ID})...`);
const socket = io(SERVER_URL);

// Estado simulado del dispositivo
let deviceState = {
    player: {
        status: 'stopped',
        currentItem: null,
        position: 0,
        time: 0,
        length: 0,
        volume: 80,
        fullscreen: false
    },
    playlist: {
        name: null,
        path: null,
        items: []
    },
    system: {
        hostname: DEVICE_ID,
        platform: process.platform,
        arch: process.arch,
        cpus: 4,
        totalMem: 8589934592,
        freeMem: 4294967296,
        uptime: 3600
    },
    network: {
        eth0: {
            address: '192.168.1.100',
            mac: '00:11:22:33:44:55',
            netmask: '255.255.255.0'
        }
    },
    _meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    }
};

// Enviar información del dispositivo al conectar
socket.on('connect', () => {
    console.log('Connected to debug server!');

    // Enviar información del dispositivo
    socket.emit('device:info', {
        id: DEVICE_ID,
        name: DEVICE_NAME,
        type: 'player',
        group: 'default',
        version: '1.0.0'
    });

    // Enviar estado inicial después de 1 segundo
    setTimeout(() => {
        socket.emit('state:update', deviceState);
        console.log('Initial state sent');
    }, 1000);
});

// Manejar mensaje de bienvenida
socket.on('welcome', (data) => {
    console.log('Server welcome message:', data.message);
});

// Manejar solicitudes de estado
socket.on('request:state', () => {
    console.log('Received request for state');
    socket.emit('state:update', deviceState);
    console.log('State sent in response to request');
});

// Manejar comandos
socket.on('command', (command) => {
    console.log('Received command:', command);

    // Procesar comando
    let response = {
        commandId: command.id,
        status: 'success',
        message: `Command ${command.action} executed successfully`
    };

    try {
        switch (command.action) {
            case 'play':
                deviceState.player.status = 'playing';
                deviceState.player.currentItem = 'test_video.mp4';
                deviceState.player.length = 300;
                break;

            case 'pause':
                deviceState.player.status = 'paused';
                break;

            case 'stop':
                deviceState.player.status = 'stopped';
                deviceState.player.currentItem = null;
                deviceState.player.position = 0;
                deviceState.player.time = 0;
                break;

            case 'volume':
                if (command.params && command.params.volume !== undefined) {
                    deviceState.player.volume = command.params.volume;
                } else {
                    throw new Error('Volume parameter is required');
                }
                break;

            case 'playlist':
                if (command.params && command.params.playlist) {
                    deviceState.playlist.name = command.params.playlist;
                    deviceState.playlist.path = `/playlists/${command.params.playlist}.m3u`;
                    deviceState.playlist.items = [
                        { fileName: 'video1.mp4', filePath: `/videos/${command.params.playlist}/video1.mp4` },
                        { fileName: 'video2.mp4', filePath: `/videos/${command.params.playlist}/video2.mp4` }
                    ];
                } else {
                    throw new Error('Playlist name is required');
                }
                break;

            case 'reboot':
                deviceState.system.uptime = 0;
                break;

            default:
                throw new Error(`Unknown command: ${command.action}`);
        }

        // Actualizar timestamp
        deviceState._meta.timestamp = new Date().toISOString();

        // Enviar respuesta exitosa
        socket.emit('command:response', response);

        // Enviar estado actualizado
        socket.emit('state:update', deviceState);

        // También enviar actualizaciones específicas
        socket.emit('player:status', deviceState.player);

        if (command.action === 'playlist') {
            socket.emit('playlist:status', deviceState.playlist);
        }

    } catch (error) {
        console.error('Error processing command:', error);

        // Enviar respuesta de error
        socket.emit('command:error', {
            commandId: command.id,
            error: error.message
        });
    }
});

// Manejar desconexión
socket.on('disconnect', (reason) => {
    console.log(`Disconnected: ${reason}`);
});

// Menú de comandos para el usuario
console.log('\nTest Client Commands:');
console.log('  play - Simulate play state');
console.log('  pause - Simulate pause state');
console.log('  stop - Simulate stop state');
console.log('  update - Send updated state');
console.log('  event <type> - Send specific event (player, system, network, playlist)');
console.log('  error - Simulate an error');
console.log('  exit - Disconnect and exit');
console.log('');

// Procesar comandos de usuario
rl.on('line', (input) => {
    const args = input.trim().split(' ');
    const command = args[0].toLowerCase();

    switch (command) {
        case 'play':
            deviceState.player.status = 'playing';
            deviceState.player.currentItem = 'test_video.mp4';
            deviceState.player.length = 300;
            console.log('Player state changed to: playing');
            break;

        case 'pause':
            deviceState.player.status = 'paused';
            console.log('Player state changed to: paused');
            break;

        case 'stop':
            deviceState.player.status = 'stopped';
            deviceState.player.currentItem = null;
            deviceState.player.position = 0;
            deviceState.player.time = 0;
            console.log('Player state changed to: stopped');
            break;

        case 'update':
            // Actualizar valores aleatorios para simular cambios
            deviceState.system.uptime += 60;
            deviceState.system.freeMem = Math.floor(Math.random() * 8589934592);

            if (deviceState.player.status === 'playing') {
                deviceState.player.time += 10;
                deviceState.player.position = Math.min(1, deviceState.player.time / deviceState.player.length);
            }

            console.log('State values updated');
            break;

        case 'event':
            const eventType = args[1] ? args[1].toLowerCase() : null;

            if (!eventType) {
                console.log('Error: Please specify event type (player, system, network, playlist)');
                return;
            }

            switch (eventType) {
                case 'player':
                    socket.emit('player:status', deviceState.player);
                    console.log('Player status event sent');
                    break;

                case 'system':
                    socket.emit('system:status', deviceState.system);
                    console.log('System status event sent');
                    break;

                case 'network':
                    socket.emit('network:status', deviceState.network);
                    console.log('Network status event sent');
                    break;

                case 'playlist':
                    socket.emit('playlist:status', deviceState.playlist);
                    console.log('Playlist status event sent');
                    break;

                default:
                    console.log(`Error: Unknown event type: ${eventType}`);
                    return;
            }
            break;

        case 'error':
            socket.emit('monitor:error', {
                error: 'Test error message',
                code: 'TEST_ERROR',
                timestamp: new Date().toISOString()
            });
            console.log('Error event sent');
            break;

        case 'exit':
            console.log('Disconnecting...');
            socket.disconnect();
            rl.close();
            process.exit(0);
            break;

        default:
            console.log(`Unknown command: ${command}`);
            return;
    }

    // Actualizar timestamp
    deviceState._meta.timestamp = new Date().toISOString();

    // Enviar estado actualizado
    socket.emit('state:update', deviceState);
    console.log('Updated state sent to server');
});