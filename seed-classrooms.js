"use strict";
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

async function main() {
    console.log("Seeding existing classrooms with access codes...");

    const classrooms = await prisma.classroom.findMany({
        where: { accessCode: null }
    });

    console.log(`Found ${classrooms.length} classrooms without an access code.`);

    for (const c of classrooms) {
        let code = generateCode();
        let isUnique = false;

        while (!isUnique) {
            const exists = await prisma.classroom.findUnique({ where: { accessCode: code } });
            if (!exists) {
                isUnique = true;
            } else {
                code = generateCode();
            }
        }

        await prisma.classroom.update({
            where: { id: c.id },
            data: { accessCode: code }
        });
        console.log(`Assigned code ${code} to classroom: ${c.name}`);
    }

    console.log("Seeding Complete! 🎉");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
