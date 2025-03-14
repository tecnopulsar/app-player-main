// serverManager.js
export class ServerManager {
    constructor(port) {
      this.port = port; // Almacenar el puerto
      this.server = null; // Referencia al servidor (si es necesario)
    }
  
    // Método para obtener el puerto
    getPort() {
      return this.port;
    }
  
    // Método para verificar si el servidor está en ejecución
    isServerRunning() {
      return this.server !== null;
    }
  
    // Este método no inicia el servidor, solo devuelve true
    async startServer() {
      return true;
    }
  
    // Este método no detiene el servidor, solo limpia la referencia
    stopServer() {
      this.server = null;
    }
  }