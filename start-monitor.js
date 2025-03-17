import MonitorServer from './src/servers/monitorServer.mjs';

console.log('\n=== Iniciando Servidor de Monitoreo Manualmente ===');
const monitorServer = new MonitorServer(3001);

// Manejar el cierre del servidor
process.on('SIGINT', () => {
    console.log('\nDeteniendo servidor de monitoreo...');
    monitorServer.stop();
    process.exit(0);
});

// Iniciar el servidor
monitorServer.start().catch(error => {
    console.error('Error al iniciar el servidor de monitoreo:', error);
    process.exit(1);
}); 