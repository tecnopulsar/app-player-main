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