import express from 'express';
import scheduleController from '../controllers/scheduleController.mjs';

const router = express.Router();

// Rutas para la gestión de programaciones
router.post('/schedules', scheduleController.createSchedule);
router.get('/schedules', scheduleController.getAllSchedules);
router.get('/schedules/:id', scheduleController.getScheduleById);
router.put('/schedules/:id', scheduleController.updateSchedule);
router.delete('/schedules/:id', scheduleController.deleteSchedule);

// Rutas para la ejecución de programaciones
router.get('/schedules/active', scheduleController.getActiveSchedules);
router.post('/schedules/:id/execute', scheduleController.executeSchedule);
router.get('/schedules/executions/recent', scheduleController.getRecentExecutions);

export default router; 