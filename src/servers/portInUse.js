import net from 'net';

function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer()
            .once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(true); // El puerto está en uso
                } else {
                    resolve(false); // Otro error
                }
            })
            .once('listening', () => {
                server.close(() => resolve(false)); // El puerto está libre
            })
            .listen(port);
    });
}

// Uso del método
const port = 3002;
isPortInUse(port).then((inUse) => {
    if (inUse) {
        console.log(`El puerto ${port} está en uso.`);
    } else {
        console.log(`El puerto ${port} está libre.`);
    }
});