import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Usar una sola instancia para evitar saturación de conexiones
const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando consulta de Profesores ---');
    try {
        const users = await prisma.user.findMany({
            where: { role: 'TEACHER' },
            // SOLO traemos los campos que necesitamos ver
            select: {
                id: true,
                name: true,
                email: true,
                role: true
                // No traemos passwords, avatars o relaciones pesadas aquí
            }
        });

        if (users.length === 0) {
            console.log('⚠️ No se encontraron profesores en la base de datos.');
        } else {
            console.log(`✅ Se encontraron ${users.length} profesores:`);
            console.table(users); // console.table es más limpio para ver datos en terminal
        }

    } catch (e) {
        console.error('❌ Error fatal en Prisma:', e);
    } finally {
        // MUY IMPORTANTE: Asegurar la desconexión para liberar la RAM de la Mac
        await prisma.$disconnect();
        console.log('--- Conexión cerrada correctamente ---');
    }
}

main().catch((err) => {
    console.error("Error en el proceso principal:", err);
    process.exit(1);
});
