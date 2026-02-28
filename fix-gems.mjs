import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
    await prisma.user.updateMany({
        where: { role: 'STUDENT' },
        data: { gems: 100 }
    });
    console.log("Gems updated");
}
fix().then(() => prisma.$disconnect());
