/** ✅
 * @file setupDirectories.js
 * @description Configura y verifica la estructura de directorios requeridos por la aplicación
 * @module utils/setupDirectories
 * 
 * @requires fs/promises - Para operaciones asíncronas del sistema de archivos
 * @requires path - Para manejo de rutas de directorios
 * @requires ../config/appConfig.mjs - Configuración de la aplicación con las rutas definidas
 * 
 * @function setupDirectories
 * @async
 * @description Crea los directorios especificados en la configuración de manera recursiva.
 * Los directorios se definen en appConfig.paths y incluyen:
 *   - uploads, playlists, screenshots, snapshots, images, temp
 * 
 * @throws {Error} Captura y registra errores individuales por directorio sin detener el proceso
 * 
 * @example
 * await setupDirectories();
 * 
 */

import fs from 'fs/promises';
import path from 'path';
import { appConfig } from '../config/appConfig.mjs';

async function setupDirectories() {
    const directories = [
        appConfig.paths.uploads,
        appConfig.paths.playlists,
        appConfig.paths.screenshots,
        appConfig.paths.snapshots,
        appConfig.paths.images,
        appConfig.paths.temp
    ];

    for (const dir of directories) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`✅ Directorio creado/verificado: ${dir}`);
        } catch (error) {
            console.error(`❌ Error al crear directorio ${dir}:`, error);
        }
    }
}

export { setupDirectories }; 