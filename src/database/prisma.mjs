import { PrismaClient } from '@prisma/client';

// Evitar múltiples instancias de PrismaClient en desarrollo
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
    global.prisma = prisma;
}

export default prisma; 