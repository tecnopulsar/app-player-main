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
        videosDefecto: './public/videosDefecto',
        playlist: './public/videos/playlist',
        playlistDefecto: './public/videosDefecto/playlistDefecto',
        screenshots: './public/screenshots',
        images: './public/images',
        temp: './public/temp'
    },

    // Configuración de la aplicación
    app: {
        name: 'App Player',
        version: '1.0.0',
        debug: process.env.NODE_ENV === 'development'
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
