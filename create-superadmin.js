"use strict";
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Creating Superadmin Profile...");

    let defaultSchool = await prisma.school.findFirst({
        where: { name: "Escuela Principal (Migración)" }
    });

    if (!defaultSchool) {
        console.error("Default School not found. Please run migrate-school.js first.");
        return;
    }

    // Replace the name below with whatever credentials the dev prefers
    const superAdminName = "DeveloperAdmin";

    const existingSuperadmin = await prisma.user.findFirst({
        where: { name: superAdminName, role: "SUPERADMIN" }
    });

    if (existingSuperadmin) {
        console.log(`Superadmin '${superAdminName}' already exists.`);
        return;
    }

    const superAdmin = await prisma.user.create({
        data: {
            name: superAdminName,
            role: "SUPERADMIN",
            schoolId: defaultSchool.id,
            avatar: "🛡️"
        }
    });

    console.log(`Created Superadmin Profile: ${superAdmin.name}`);
    console.log(`Log in as: '${superAdmin.name}' on the home page.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
