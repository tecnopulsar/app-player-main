import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SnapshotManager {
    constructor() {
        this.snapshotsDir = path.join(__dirname, '..', 'snapshots');
        this.retentionDays = 7; // Mantener snapshots por 7 días
        this.maxSnapshots = 1000; // Máximo número de snapshots a mantener
    }

    async purgeOldSnapshots() {
        try {
            // Leer todos los archivos en el directorio de snapshots
            const files = await fs.promises.readdir(this.snapshotsDir);

            // Filtrar solo archivos .jpg
            const snapshotFiles = files.filter(file => file.endsWith('.jpg'));

            // Obtener información de cada archivo
            const fileInfos = await Promise.all(
                snapshotFiles.map(async file => {
                    const filePath = path.join(this.snapshotsDir, file);
                    const stats = await fs.promises.stat(filePath);
                    return {
                        name: file,
                        path: filePath,
                        mtime: stats.mtime
                    };
                })
            );

            // Ordenar por fecha de modificación (más antiguos primero)
            fileInfos.sort((a, b) => a.mtime - b.mtime);

            const now = new Date();
            const retentionDate = new Date(now - (this.retentionDays * 24 * 60 * 60 * 1000));

            let deletedCount = 0;

            // Eliminar archivos más antiguos que el período de retención
            for (const fileInfo of fileInfos) {
                if (fileInfo.mtime < retentionDate) {
                    await fs.promises.unlink(fileInfo.path);
                    deletedCount++;
                }
            }

            // Si aún hay más archivos que el máximo permitido, eliminar los más antiguos
            if (fileInfos.length - deletedCount > this.maxSnapshots) {
                const filesToDelete = fileInfos.length - deletedCount - this.maxSnapshots;
                for (let i = 0; i < filesToDelete; i++) {
                    await fs.promises.unlink(fileInfos[i].path);
                    deletedCount++;
                }
            }

            console.log(`Se eliminaron ${deletedCount} snapshots antiguos`);
        } catch (error) {
            console.error('Error al purgar snapshots antiguos:', error);
        }
    }

    startPeriodicPurge(intervalHours = 24) {
        // Ejecutar la purga inmediatamente
        this.purgeOldSnapshots();

        // Programar la purga periódica
        setInterval(() => {
            this.purgeOldSnapshots();
        }, intervalHours * 60 * 60 * 1000);
    }
}

// Exportar una instancia única del SnapshotManager
export const snapshotManager = new SnapshotManager(); 