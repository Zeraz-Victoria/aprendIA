"use strict";
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Characters excluding confusing ones (I, O, 0, 1)
const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    }
    return code;
}

async function main() {
    console.log("🔑 Starting Student Code Migration...\n");

    // Find all students without a code
    const studentsWithoutCode = await prisma.user.findMany({
        where: {
            role: 'STUDENT',
            studentCode: null
        },
        select: { id: true, name: true }
    });

    console.log(`Found ${studentsWithoutCode.length} student(s) without a code.\n`);

    if (studentsWithoutCode.length === 0) {
        console.log("✅ All students already have codes. Nothing to do!");
        return;
    }

    // Fetch all existing codes to avoid collisions
    const existingCodes = new Set(
        (await prisma.user.findMany({
            where: { studentCode: { not: null } },
            select: { studentCode: true }
        })).map(u => u.studentCode)
    );

    let assigned = 0;

    for (const student of studentsWithoutCode) {
        let newCode = generateCode();
        // Ensure uniqueness
        while (existingCodes.has(newCode)) {
            newCode = generateCode();
        }

        await prisma.user.update({
            where: { id: student.id },
            data: { studentCode: newCode }
        });

        existingCodes.add(newCode);
        assigned++;
        console.log(`  ✅ ${student.name} → ${newCode}`);
    }

    console.log(`\n🎉 Migration Complete! Assigned codes to ${assigned} student(s).`);
}

main()
    .catch((e) => {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
