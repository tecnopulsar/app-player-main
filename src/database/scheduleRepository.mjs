import prisma from './prisma.mjs';

class ScheduleRepository {
    /**
     * Crea una nueva programación
     * @param {Object} schedule - Datos de la programación
     * @returns {Promise<Object>} - Programación creada
     */
    async create(schedule) {
        return prisma.schedule.create({
            data: {
                name: schedule.name,
                description: schedule.description,
                playlist: schedule.playlist,
                startTime: new Date(schedule.startTime),
                endTime: new Date(schedule.endTime),
                daysOfWeek: schedule.daysOfWeek,
                isActive: schedule.isActive !== undefined ? schedule.isActive : true
            }
        });
    }

    /**
     * Obtiene todas las programaciones
     * @param {Object} options - Opciones de consulta
     * @returns {Promise<Array>} - Lista de programaciones
     */
    async findAll(options = {}) {
        const { limit = 100, offset = 0, isActive } = options;

        const where = {};
        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        return prisma.schedule.findMany({
            where,
            orderBy: { startTime: 'asc' },
            take: limit,
            skip: offset
        });
    }

    /**
     * Obtiene una programación por ID
     * @param {Number} id - ID de la programación
     * @returns {Promise<Object>} - Programación encontrada
     */
    async findById(id) {
        return prisma.schedule.findUnique({
            where: { id: parseInt(id) },
            include: { executions: true }
        });
    }

    /**
     * Actualiza una programación
     * @param {Number} id - ID de la programación
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} - Programación actualizada
     */
    async update(id, data) {
        const updateData = { ...data };

        // Convertir fechas si están presentes
        if (data.startTime) updateData.startTime = new Date(data.startTime);
        if (data.endTime) updateData.endTime = new Date(data.endTime);

        return prisma.schedule.update({
            where: { id: parseInt(id) },
            data: updateData
        });
    }

    /**
     * Elimina una programación
     * @param {Number} id - ID de la programación
     * @returns {Promise<Object>} - Programación eliminada
     */
    async delete(id) {
        return prisma.schedule.delete({
            where: { id: parseInt(id) }
        });
    }

    /**
     * Obtiene las programaciones activas para una fecha específica
     * @param {Date} date - Fecha para la que buscar programaciones
     * @returns {Promise<Array>} - Lista de programaciones activas
     */
    async findActiveForDate(date) {
        const dayOfWeek = date.getDay();
        const timeString = date.toTimeString().substring(0, 5); // Formato HH:MM

        return prisma.schedule.findMany({
            where: {
                isActive: true,
                daysOfWeek: {
                    has: dayOfWeek
                },
                startTime: {
                    lte: new Date(`${date.toISOString().split('T')[0]}T${timeString}:00.000Z`)
                },
                endTime: {
                    gte: new Date(`${date.toISOString().split('T')[0]}T${timeString}:00.000Z`)
                }
            }
        });
    }

    /**
     * Registra una ejecución de programación
     * @param {Object} execution - Datos de la ejecución
     * @returns {Promise<Object>} - Ejecución registrada
     */
    async createExecution(execution) {
        return prisma.execution.create({
            data: {
                scheduleId: parseInt(execution.scheduleId),
                startTime: new Date(execution.startTime || Date.now()),
                endTime: execution.endTime ? new Date(execution.endTime) : null,
                status: execution.status || 'pending',
                playlist: execution.playlist
            }
        });
    }

    /**
     * Actualiza el estado de una ejecución
     * @param {Number} id - ID de la ejecución
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} - Ejecución actualizada
     */
    async updateExecution(id, data) {
        const updateData = { ...data };

        // Convertir fechas si están presentes
        if (data.startTime) updateData.startTime = new Date(data.startTime);
        if (data.endTime) updateData.endTime = new Date(data.endTime);

        return prisma.execution.update({
            where: { id: parseInt(id) },
            data: updateData
        });
    }

    /**
     * Obtiene las ejecuciones recientes
     * @param {Number} limit - Límite de resultados
     * @returns {Promise<Array>} - Lista de ejecuciones
     */
    async getRecentExecutions(limit = 10) {
        return prisma.execution.findMany({
            orderBy: { startTime: 'desc' },
            take: limit,
            include: { schedule: true }
        });
    }
}

export default new ScheduleRepository(); 