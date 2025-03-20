// Configuración general de la aplicación
const appConfig = {
    // Configuración del servidor
    server: {
        port: 3000,
        host: 'localhost'
    },

    // Configuración de rutas
    paths: {
        uploads: './public/uploads',
        public: './public',
        videos: './public/videos',
        playlists: './public/videos/playlists',
        screenshots: './public/screenshots',
        snapshots: './public/snapshots',
        images: './public/images',
        temp: './public/temp'
    },

    // Configuración de la aplicación
    app: {
        name: 'App Player',
        version: '1.0.0',
        debug: process.env.NODE_ENV === 'development',
        defaultPlaylist: 'default'
    },

    // Configuración del controlador
    controller: {
        url: 'http://192.168.1.3:3001',
        heartbeatInterval: 25000
    },

    // Configuración de seguridad
    security: {
        allowedOrigins: ['http://localhost:3000'],
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedFileTypes: ['video/*', 'image/*', 'audio/*']
    }
};

// Exportar las configuraciones
export { appConfig };
