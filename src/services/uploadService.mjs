import UploadHandler from '../routes/uploadHandler.mjs';

class UploadService {
    constructor() {
        this.uploadHandler = new UploadHandler();
        this.upload = this.uploadHandler.configureMulter();
    }

    async initialize() {
        await this.uploadHandler.initializeDirectories();
    }
}

const uploadService = new UploadService();
await uploadService.initialize();

export const upload = uploadService.upload;
export const uploadHandler = uploadService.uploadHandler;