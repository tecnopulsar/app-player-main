import scheduleRepository from '../database/scheduleRepository.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { appConfig } from '../config/appConfig.mjs';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class ScheduleService {
    /**
     * Crea una nueva programación
     * @param {Object} scheduleData - Datos de la programación
     * @returns {Promise<Object>} - Programación creada
     */
    async createSchedule(scheduleData) {
        // Validar que la playlist existe
        await this.validatePlaylist(scheduleData.playlist);

        // Crear la programación
        return scheduleRepository.create(scheduleData);
    }

    /**
     * Obtiene todas las programaciones
     * @param {Object} options - Opciones de consulta
     * @returns {Promise<Array>} - Lista de programaciones
     */
    async getAllSchedules(options = {}) {
        return scheduleRepository.findAll(options);
    }

    /**
     * Obtiene una programación por ID
     * @param {Number} id - ID de la programación
     * @returns {Promise<Object>} - Programación encontrada
     */
    async getScheduleById(id) {
        return scheduleRepository.findById(id);
    }

    /**
     * Actualiza una programación
     * @param {Number} id - ID de la programación
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} - Programación actualizada
     */
    async updateSchedule(id, data) {
        // Si se actualiza la playlist, validar que existe
        if (data.playlist) {
            await this.validatePlaylist(data.playlist);
        }

        return scheduleRepository.update(id, data);
    }

    /**
     * Elimina una programación
     * @param {Number} id - ID de la programación
     * @returns {Promise<Object>} - Programación eliminada
     */
    async deleteSchedule(id) {
        return scheduleRepository.delete(id);
    }

    /**
     * Valida que una playlist existe
     * @param {String} playlistName - Nombre de la playlist
     * @returns {Promise<Boolean>} - True si la playlist existe
     * @throws {Error} - Error si la playlist no existe
     */
    async validatePlaylist(playlistName) {
        const playlistPath = path.join(appConfig.paths.playlists, playlistName);

        try {
            await fs.access(playlistPath);
            return true;
        } catch (error) {
            throw new Error(`La playlist "${playlistName}" no existe`);
        }
    }

    /**
     * Obtiene las programaciones activas para la fecha actual
     * @returns {Promise<Array>} - Lista de programaciones activas
     */
    async getActiveSchedules() {
        const now = new Date();
        return scheduleRepository.findActiveForDate(now);
    }

    /**
     * Ejecuta una programación
     * @param {Object} schedule - Programación a ejecutar
     * @returns {Promise<Object>} - Ejecución registrada
     */
    async executeSchedule(schedule) {
        // Registrar la ejecución
        const execution = await scheduleRepository.createExecution({
            scheduleId: schedule.id,
            playlist: schedule.playlist,
            status: 'running'
        });

        // Iniciar la reproducción de la playlist
        try {
            // Aquí se implementaría la lógica para iniciar la reproducción
            // Por ejemplo, enviar un comando a VLC para reproducir la playlist
            console.log(`Reproduciendo playlist: ${schedule.playlist}`);

            // Simular reproducción (en un caso real, se implementaría la lógica real)
            setTimeout(async () => {
                // Actualizar el estado de la ejecución a completada
                await scheduleRepository.updateExecution(execution.id, {
                    status: 'completed',
                    endTime: new Date()
                });
            }, 5000);

            return execution;
        } catch (error) {
            // Actualizar el estado de la ejecución a fallida
            await scheduleRepository.updateExecution(execution.id, {
                status: 'failed',
                endTime: new Date()
            });

            throw error;
        }
    }

    /**
     * Obtiene las ejecuciones recientes
     * @param {Number} limit - Límite de resultados
     * @returns {Promise<Array>} - Lista de ejecuciones
     */
    async getRecentExecutions(limit = 10) {
        return scheduleRepository.getRecentExecutions(limit);
    }
}

export default new ScheduleService(); 