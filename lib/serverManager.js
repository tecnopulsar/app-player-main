import net from 'net';
import killPort from 'kill-port';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ServerManager {
    constructor(port = 3000) {
        this.port = port;
        this.serverProcess = null;
    }
    
    // Iniciar el servidor Express
    async startServer() {
        const portAvailable = await this.killPortIfInUse();
        if (!portAvailable) {
            return false;
        }

        this.serverProcess = spawn('node', [join(__dirname, '../serverClient.mjs')], {
            detached: true,
            stdio: 'pipe',
        });

        this.serverProcess.unref();

        this.serverProcess.stdout.on('data', (data) => {
            console.log(`Servidor (stdout): ${data}`);
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.error(`Servidor (stderr): ${data}`);
        });

        this.serverProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`El servidor se cerró con código ${code}`);
            } else {
                console.log('Servidor cerrado correctamente');
            }
        });

        return true;
    }
    
    // Verificar si el puerto está en uso
    async checkPortInUse() {
        return new Promise((resolve, reject) => {
            const server = net.createServer()
                .once('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        resolve(true);
                    } else {
                        reject(err);
                    }
                })
                .once('listening', () => {
                    server.close();
                    resolve(false);
                })
                .listen(this.port);
        });
    }

    // Cerrar el puerto si está en uso
    async killPortIfInUse() {
        const isPortInUse = await this.checkPortInUse();
        if (isPortInUse) {
            console.log(`El puerto ${this.port} está en uso. Intentando cerrarlo...`);
            try {
                await killPort(this.port);
                console.log(`Puerto ${this.port} cerrado correctamente.`);
                return true;
            } catch (err) {
                console.error(`Error al cerrar el puerto ${this.port}:`, err.message);
                return false;
            }
        }
        return true;
    }


    // Detener el servidor
    stopServer() {
        if (this.serverProcess) {
            try {
                this.serverProcess.kill();
                console.log('Servidor detenido correctamente');
                return true;
            } catch (err) {
                console.error('Error al detener el servidor:', err.message);
                return false;
            }
        }
        return true;
    }
} 