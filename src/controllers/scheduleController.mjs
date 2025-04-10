import scheduleService from '../services/scheduleService.mjs';

/**
 * Controlador para manejar las operaciones relacionadas con la agenda
 */
class ScheduleController {
    /**
     * Crea una nueva programación
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async createSchedule(req, res) {
        try {
            const schedule = await scheduleService.createSchedule(req.body);
            res.status(201).json(schedule);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Obtiene todas las programaciones
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async getAllSchedules(req, res) {
        try {
            const schedules = await scheduleService.getAllSchedules(req.query);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Obtiene una programación por ID
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async getScheduleById(req, res) {
        try {
            const schedule = await scheduleService.getScheduleById(req.params.id);
            if (!schedule) {
                return res.status(404).json({ error: 'Programación no encontrada' });
            }
            res.json(schedule);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Actualiza una programación
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async updateSchedule(req, res) {
        try {
            const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
            res.json(schedule);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Elimina una programación
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async deleteSchedule(req, res) {
        try {
            await scheduleService.deleteSchedule(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Obtiene las programaciones activas para la fecha actual
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async getActiveSchedules(req, res) {
        try {
            const schedules = await scheduleService.getActiveSchedules();
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Ejecuta una programación
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async executeSchedule(req, res) {
        try {
            const schedule = await scheduleService.getScheduleById(req.params.id);
            if (!schedule) {
                return res.status(404).json({ error: 'Programación no encontrada' });
            }

            const execution = await scheduleService.executeSchedule(schedule);
            res.json(execution);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Obtiene las ejecuciones recientes
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async getRecentExecutions(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const executions = await scheduleService.getRecentExecutions(limit);
            res.json(executions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default new ScheduleController(); 