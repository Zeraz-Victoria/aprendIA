import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkDb() {
    const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    const world = await prisma.world.findFirst();

    console.log("Student:", student?.id, student?.name);
    console.log("World:", world?.id);
}

checkDb();
