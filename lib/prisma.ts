import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    const isProd = process.env.NODE_ENV === 'production';

    const client = new PrismaClient({
        log: isProd
            ? [{ emit: 'stdout', level: 'error' }]
            : [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ],
    })

    if (!isProd) {
        client.$on('query', (e) => {
            if (e.duration > 2000) {
                console.warn(`[PRISMA SLOW QUERY] - ${e.duration}ms`);
                console.warn(`Query: ${e.query}`);
            }
        })
    }

    return client
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

globalThis.prismaGlobal = prisma
