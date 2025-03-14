import { exec } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para ejecutar un script Python
export const runPythonScript = (scriptName) => new Promise((resolve, reject) => {
  const scriptPath = join(__dirname, scriptName);
  exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      reject(`Error ejecutando el script: ${error.message}`);
      return;
    }
    if (stderr) {
      reject(`stderr: ${stderr}`);
      return;
    }
    resolve(stdout);
  });
});