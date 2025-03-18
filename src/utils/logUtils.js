/**
 * Utilidades para el manejo de logs en la aplicación
 */

// Almacenar referencia a la ventana principal
let mainWindow = null;

// Referencia a las funciones originales de console
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

/**
 * Inicializa el sistema de logs
 * @param {BrowserWindow} window Referencia a la ventana principal
 */
export function initLogs(window) {
    mainWindow = window;

    // Sobrescribir funciones de consola
    console.log = (...args) => {
        originalConsole.log(...args);
        sendLog(args.join(' '), 'info');
    };

    console.error = (...args) => {
        originalConsole.error(...args);
        sendLog(args.join(' '), 'error');
    };

    console.warn = (...args) => {
        originalConsole.warn(...args);
        sendLog(args.join(' '), 'warning');
    };

    console.info = (...args) => {
        originalConsole.info(...args);
        sendLog(args.join(' '), 'info');
    };
}

/**
 * Envía un mensaje de log a la ventana de renderizado
 * @param {string} message Mensaje a enviar
 * @param {string} type Tipo de mensaje (info, error, warning, success)
 */
export function sendLog(message, type = 'info') {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log', { message, type });
    }
}

/**
 * Restaura las funciones originales de console
 */
export function restoreLogs() {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
} 