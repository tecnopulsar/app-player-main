/**
 * @file redisClient.mjs
 * @description Cliente Redis para la gestión eficiente del estado del sistema
 * @module utils/redisClient
 * 
 * @requires ioredis - Cliente Redis para Node.js
 * @requires ../config/appConfig.mjs - Configuración de la aplicación
 * 
 * @version 1.0.0
 * @license MIT
 */

import Redis from 'ioredis';
import { getConfig } from '../config/appConfig.mjs';

// Clave para almacenar el estado del sistema en Redis
const SYSTEM_STATE_KEY = 'system:state';

// Tiempo de expiración del estado en caché (24 horas)
const STATE_CACHE_TTL = 60 * 60 * 24;

let redisClient = null;

/**
 * Inicializa la conexión a Redis
 * @returns {Redis} Cliente Redis
 */
export function initRedisClient() {
    if (redisClient) return redisClient;

    const config = getConfig();
    const redisConfig = config.redis || {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        keyPrefix: 'player:'
    };

    try {
        redisClient = new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            db: redisConfig.db,
            keyPrefix: redisConfig.keyPrefix,
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 3000);
                console.log(`Intento de reconexión a Redis #${times}, esperando ${delay}ms...`);
                return delay;
            },
            showFriendlyErrorStack: true
        });

        redisClient.on('connect', () => {
            console.log('✅ Conectado a Redis correctamente');
        });

        redisClient.on('error', (err) => {
            console.error(`❌ Error en la conexión a Redis: ${err.message}`);
        });

        return redisClient;
    } catch (error) {
        console.error(`❌ Error al inicializar la conexión a Redis: ${error.message}`);
        return null;
    }
}

/**
 * Obtiene el cliente Redis o lo inicializa si no existe
 * @returns {Redis|null} Cliente Redis o null si no se pudo inicializar
 */
export function getRedisClient() {
    if (!redisClient) {
        return initRedisClient();
    }
    return redisClient;
}

/**
 * Guarda el estado del sistema en Redis
 * @param {Object} state - Estado del sistema a guardar
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export async function saveStateToRedis(state) {
    try {
        const redis = getRedisClient();
        if (!redis) {
            console.warn('⚠️ No hay conexión a Redis, no se puede guardar el estado');
            return false;
        }

        const stateString = JSON.stringify(state);

        // Guardar en Redis con tiempo de expiración
        await redis.set(SYSTEM_STATE_KEY, stateString, 'EX', STATE_CACHE_TTL);

        console.log('✅ Estado del sistema guardado en Redis');
        return true;
    } catch (error) {
        console.error(`❌ Error al guardar el estado en Redis: ${error.message}`);
        return false;
    }
}

/**
 * Carga el estado del sistema desde Redis
 * @returns {Promise<Object|null>} Estado del sistema o null si no se encontró
 */
export async function loadStateFromRedis() {
    try {
        const redis = getRedisClient();
        if (!redis) {
            console.warn('⚠️ No hay conexión a Redis, no se puede cargar el estado');
            return null;
        }

        const stateString = await redis.get(SYSTEM_STATE_KEY);
        if (!stateString) {
            console.log('ℹ️ No se encontró estado en Redis');
            return null;
        }

        const state = JSON.parse(stateString);
        console.log('✅ Estado del sistema cargado desde Redis');
        return state;
    } catch (error) {
        console.error(`❌ Error al cargar el estado desde Redis: ${error.message}`);
        return null;
    }
}

/**
 * Elimina el estado del sistema de Redis
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export async function deleteStateFromRedis() {
    try {
        const redis = getRedisClient();
        if (!redis) {
            console.warn('⚠️ No hay conexión a Redis, no se puede eliminar el estado');
            return false;
        }

        await redis.del(SYSTEM_STATE_KEY);
        console.log('✅ Estado del sistema eliminado de Redis');
        return true;
    } catch (error) {
        console.error(`❌ Error al eliminar el estado de Redis: ${error.message}`);
        return false;
    }
}

// Inicializar cliente Redis al importar el módulo
initRedisClient();

export default {
    getRedisClient,
    saveStateToRedis,
    loadStateFromRedis,
    deleteStateFromRedis
}; 