import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    const client = new PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
        ],
    })

    client.$on('query', (e) => {
        if (e.duration > 2000) {
            console.warn(`[PRISMA SLOW QUERY] - ${e.duration}ms`);
            console.warn(`Query: ${e.query}`);
        }
    })

    return client
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
