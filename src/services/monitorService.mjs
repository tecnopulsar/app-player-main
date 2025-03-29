/**
 * @file monitorService.mjs
 * @description Servicio para monitoreo en tiempo real del estado del sistema
 * @module services/monitorService
 * 
 * @requires ../clients/socketClient.mjs - Cliente Socket.IO
 * @requires ../utils/systemState.mjs - Funciones de estado del sistema
 */

import { sendEvent, sendPlayerState } from '../clients/socketClient.mjs';
import {
    getSystemState,
} from '../utils/systemState.mjs';

// Intervalo de monitoreo en milisegundos
const DEFAULT_MONITOR_INTERVAL = 30000; // 30 segundos

// Variables para el servicio de monitoreo
let monitorInterval = null;
let isMonitoring = false;
let previousState = null;
let monitorOptions = {
    emitOnlyChanges: true, // Solo emitir cuando hay cambios
    intervalMs: DEFAULT_MONITOR_INTERVAL,
    includeDetailedSystemInfo: false
};

/**
 * Inicia el servicio de monitoreo
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Estado del servicio
 */
export function startMonitoring(options = {}) {
    // Combinar opciones con valores predeterminados
    monitorOptions = {
        ...monitorOptions,
        ...options
    };

    if (isMonitoring) {
        console.log('El servicio de monitoreo ya está en ejecución');
        return { status: 'running', options: monitorOptions };
    }

    try {
        console.log(`🔄 Iniciando servicio de monitoreo (intervalo: ${monitorOptions.intervalMs}ms)`);

        // Obtener estado inicial
        previousState = getSystemState();

        // Enviar estado inicial
        emitState(previousState);

        // Establecer intervalo de monitoreo
        monitorInterval = setInterval(async () => {
            try {
                // Obtener estado actual
                const currentState = await getSystemState();

                // Enviar estado si hay cambios o si se configura para enviar siempre
                if (!monitorOptions.emitOnlyChanges || hasStateChanged(previousState, currentState)) {
                    emitState(currentState);
                }

                // Actualizar estado anterior
                previousState = currentState;
            } catch (error) {
                console.error('Error en el ciclo de monitoreo:', error);
                sendEvent('monitor:error', { error: error.message });
            }
        }, monitorOptions.intervalMs);

        isMonitoring = true;
        return { status: 'started', options: monitorOptions };
    } catch (error) {
        console.error('Error al iniciar el servicio de monitoreo:', error);
        throw error;
    }
}

/**
 * Detiene el servicio de monitoreo
 * @returns {Object} - Estado del servicio
 */
export function stopMonitoring() {
    if (!isMonitoring) {
        console.log('El servicio de monitoreo no está en ejecución');
        return { status: 'not_running' };
    }

    console.log('🛑 Deteniendo servicio de monitoreo');
    clearInterval(monitorInterval);
    monitorInterval = null;
    isMonitoring = false;

    return { status: 'stopped' };
}

/**
 * Emite el estado actual por Socket.IO
 * @param {Object} state - Estado completo del sistema
 */
function emitState(state) {
    // Enviar estado completo al servidor de administración
    sendPlayerState(state);

    // Emitir eventos específicos para cada componente
    if (state.player) {
        sendEvent('player:status', state.player);
    }

    if (state.system) {
        sendEvent('system:status', state.system);
    }

    if (state.network) {
        sendEvent('network:status', state.network);
    }

    if (state.playlist) {
        sendEvent('playlist:status', state.playlist);
    }
}

/**
 * Compara dos estados para determinar si hay cambios
 * @param {Object} prevState - Estado anterior
 * @param {Object} currState - Estado actual
 * @returns {boolean} - True si hay cambios, false en caso contrario
 */
function hasStateChanged(prevState, currState) {
    if (!prevState || !currState) return true;

    // Verificar cambios en el reproductor
    if (JSON.stringify(prevState.player) !== JSON.stringify(currState.player)) {
        return true;
    }

    // Verificar cambios en la playlist
    if (JSON.stringify(prevState.playlist) !== JSON.stringify(currState.playlist)) {
        return true;
    }

    // Verificar cambios significativos en el sistema (ignorando valores que cambian constantemente)
    const prevSystem = { ...prevState.system };
    const currSystem = { ...currState.system };

    // Eliminar propiedades que cambian constantemente como uptime, freeMem, etc.
    delete prevSystem.uptime;
    delete prevSystem.freeMem;
    delete prevSystem.loadavg;
    delete currSystem.uptime;
    delete currSystem.freeMem;
    delete currSystem.loadavg;

    if (JSON.stringify(prevSystem) !== JSON.stringify(currSystem)) {
        return true;
    }

    // Verificar cambios en la red (solo verificar dirección IP, no todos los detalles)
    const prevNetIPs = extractIPs(prevState.network);
    const currNetIPs = extractIPs(currState.network);

    if (JSON.stringify(prevNetIPs) !== JSON.stringify(currNetIPs)) {
        return true;
    }

    return false;
}

/**
 * Extrae las IPs de las interfaces de red
 * @param {Object} network - Información de red
 * @returns {Object} - Objeto con IPs por interfaz
 */
function extractIPs(network) {
    if (!network) return {};

    const ips = {};
    for (const [iface, info] of Object.entries(network)) {
        if (info && info.address) {
            ips[iface] = info.address;
        }
    }

    return ips;
}

/**
 * Forza una emisión del estado actual
 * @returns {Object} - Estado actual
 */
export async function forceStateUpdate() {
    try {
        const currentState = await getSystemState();
        emitState(currentState);
        return currentState;
    } catch (error) {
        console.error('Error al forzar actualización de estado:', error);
        throw error;
    }
}

/**
 * Verifica si el servicio está activo
 * @returns {boolean} - True si está activo, false en caso contrario
 */
export function isActive() {
    return isMonitoring;
}

/**
 * Obtiene las opciones actuales del monitor
 * @returns {Object} - Opciones de configuración
 */
export function getOptions() {
    return { ...monitorOptions };
}

export default {
    startMonitoring,
    stopMonitoring,
    forceStateUpdate,
    isActive,
    getOptions
}; 