import express from 'express';
import path from 'path';
import { appConfig } from '../config/appConfig.mjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { networkInfo } from '../servers/serverClient.mjs';
import { exec } from 'child_process';
import fileHandler from './fileHandler.mjs'; // Importar el nuevo router

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const viewsDir = path.join(__dirname, '..', '..', 'views');

// Función para renderizar templates
async function renderTemplate(templatePath, data) {
    try {
        const fs = await import('fs/promises');
        let template = await fs.readFile(templatePath, 'utf8');

        // Reemplazar variables en el template
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            template = template.replace(regex, data[key]);
        });

        return template;
    } catch (error) {
        console.error('Error al renderizar el template:', error);
        throw error;
    }
}

// Middleware para logging
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Ruta principal
router.get('/', async (req, res) => {
    console.log('Accediendo a la ruta principal');
    try {
        const templateData = {
            port: appConfig.server.port,
            directorioVideos: appConfig.paths.playlists,
            networkInfo: JSON.stringify(networkInfo || {}),
            year: new Date().getFullYear()
        };

        console.log('Datos para el template:', templateData);

        const html = await renderTemplate(path.join(viewsDir, 'index.html'), templateData);
        res.send(html);
    } catch (error) {
        console.error('Error al servir la página principal:', error);
        res.status(500).json({
            error: 'Error al cargar la página',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Ruta de estado general
router.get('/status', async (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Nuevo endpoint para ejecutar comandos
router.post('/executeCommand', (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'No se proporcionó un comando.' });
    }
    try {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`Error ejecutando el comando: ${error.message}`);
                return res.status(500).json({ error: 'Error al ejecutar el comando' });
            }
            if (stderr) {
                console.log(`Salida estándar con error: ${stderr}`);
                return res.status(500).json({ error: 'Error en la salida del comando', details: stderr });
            }
            console.log(`Salida estándar: ${stdout}`);
            res.json({ success: true, output: stdout });
        });
    } catch (error) {
        console.error(`Error general: ${error.message}`);
        res.status(500).json({ error: 'Error en la ejecución de comandos' });
    }
});

export default router;