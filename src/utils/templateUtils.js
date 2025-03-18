import fs from 'fs/promises';

/**
 * Renderiza un template reemplazando variables
 * @param {string} templatePath Ruta al archivo de template
 * @param {Object} data Datos para reemplazar en el template
 * @returns {Promise<string>} Template renderizado
 */
export async function renderTemplate(templatePath, data) {
    try {
        let template = await fs.readFile(templatePath, 'utf-8');

        // Reemplazar todas las variables en el template
        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            template = template.replace(regex, value);
        }

        return template;
    } catch (error) {
        console.error('Error al renderizar template:', error);
        throw error;
    }
} 