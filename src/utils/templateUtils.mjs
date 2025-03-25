import fs from 'fs/promises';

/**
 * Renderiza un template reemplazando variables
 * @param {string} templatePath Ruta al archivo de template
 * @param {Object} data Datos para reemplazar en el template
 * @returns {Promise<string>} Template renderizado
 */
// Función para renderizar templates
// Podrían optimizarse aún más precompilando los regex
const regexCache = new Map();

export async function renderTemplate(templatePath, data) {
    try {
        let template = await fs.readFile(templatePath, 'utf-8');

        for (const [key, value] of Object.entries(data)) {
            if (!regexCache.has(key)) {
                regexCache.set(key, new RegExp(`{{${key}}}`, 'g'));
            }
            template = template.replace(regexCache.get(key), value);
        }

        return template;
    } catch (error) {
        console.error('Error al renderizar template:', error);
        throw error;
    }
}