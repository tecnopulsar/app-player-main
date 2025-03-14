import express from 'express';
import { appConfig } from '../config/appConfig.mjs';
import process from 'node:process';
const router = express.Router();

// Endpoint para obtener información general de la aplicación
router.get('/info', (req, res) => {
    res.json({
        version: appConfig.app.version,
        name: appConfig.app.name,
        uptime: process.uptime()
    });
});

// Puedes agregar más endpoints relacionados con la aplicación aquí

export default router; 