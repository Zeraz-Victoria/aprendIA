"use strict";
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Starting data migration to Default School...");

    // 1. Create or Find the Default School
    let defaultSchool = await prisma.school.findFirst({
        where: { name: "Escuela Principal (Migración)" }
    });

    if (!defaultSchool) {
        defaultSchool = await prisma.school.create({
            data: {
                name: "Escuela Principal (Migración)"
            }
        });
        console.log(`Created Default School: ${defaultSchool.name} (${defaultSchool.id})`);
    } else {
        console.log(`Found Default School: ${defaultSchool.name} (${defaultSchool.id})`);
    }

    // 2. Assign all Users (Teachers and Students)
    const updatedUsers = await prisma.user.updateMany({
        where: { schoolId: null },
        data: { schoolId: defaultSchool.id }
    });
    console.log(`Migrated ${updatedUsers.count} Users to Default School.`);

    // 3. Assign all Worlds
    const updatedWorlds = await prisma.world.updateMany({
        where: { schoolId: null },
        data: { schoolId: defaultSchool.id }
    });
    console.log(`Migrated ${updatedWorlds.count} Worlds.`);

    // 4. Assign all Grades
    const updatedGrades = await prisma.grade.updateMany({
        where: { schoolId: null },
        data: { schoolId: defaultSchool.id }
    });
    console.log(`Migrated ${updatedGrades.count} Grades.`);

    // 5. Assign all Classrooms
    const updatedClassrooms = await prisma.classroom.updateMany({
        where: { schoolId: null },
        data: { schoolId: defaultSchool.id }
    });
    console.log(`Migrated ${updatedClassrooms.count} Classrooms.`);

    console.log("Migration Complete! 🎉");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
