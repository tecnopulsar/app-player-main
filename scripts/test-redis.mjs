#!/usr/bin/env node

/**
 * Script para probar la conexión a Redis desde la aplicación
 */

import { getRedisClient, saveStateToRedis, loadStateFromRedis } from '../src/utils/redisClient.mjs';

async function testRedisConnection() {
    console.log('🔍 Probando conexión a Redis...');

    // Obtener cliente Redis
    const redis = getRedisClient();

    if (!redis) {
        console.error('❌ No se pudo obtener el cliente Redis');
        process.exit(1);
    }

    try {
        // Probar ping
        const pingResult = await redis.ping();
        console.log(`✅ Ping a Redis: ${pingResult}`);

        // Probar guardar y cargar datos
        const testData = {
            timestamp: new Date().toISOString(),
            test: true,
            message: 'Prueba de Redis exitosa'
        };

        console.log('📝 Guardando datos de prueba en Redis...');
        await saveStateToRedis(testData);

        console.log('🔍 Cargando datos desde Redis...');
        const loadedData = await loadStateFromRedis();

        if (loadedData) {
            console.log('✅ Datos cargados correctamente:');
            console.log(JSON.stringify(loadedData, null, 2));
        } else {
            console.error('❌ No se pudieron cargar los datos');
        }

        // Cerrar conexión
        console.log('👋 Cerrando conexión...');
        redis.disconnect();

        console.log('✅ Prueba completada exitosamente');
    } catch (error) {
        console.error(`❌ Error en la prueba: ${error.message}`);
        process.exit(1);
    }
}

// Ejecutar la prueba
testRedisConnection(); 