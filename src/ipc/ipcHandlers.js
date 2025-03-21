// src/ipc/ipcHandlers.js
import { exec } from 'child_process';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manejar el evento 'start-timer'
export const setupIpcHandlers = (ipcMain) => {
    ipcMain.on('start-timer', (event) => {
        console.log('Solicitud de temporizador recibida');
        // El script contador.py ya no es necesario
        console.log('Funcionalidad de temporizador implementada directamente en JavaScript');

        // Simulamos completar el temporizador después de 3 segundos
        setTimeout(() => {
            console.log('Temporizador completado');
            event.reply('timer-completed', '¡Tiempo cumplido!');
        }, 3000);
    });
};