// src/ipc/ipcHandlers.js
import { exec } from 'child_process';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manejar el evento 'start-timer'
export const setupIpcHandlers = (ipcMain) => {
    ipcMain.on('start-timer', (event) => {
        // Ruta actualizada al script Python
        const pythonScriptPath = join(__dirname, '../scripts/contador.py');
        exec(`python3 ${pythonScriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error ejecutando el script: ${error.message}`);
                event.reply('timer-completed', 'Error al iniciar el contador');
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                event.reply('timer-completed', 'Error en el script');
                return;
            }
            console.log(`stdout: ${stdout}`);
            event.reply('timer-completed', '¡Tiempo cumplido!');
        });
    });
};