"use strict";
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── CONFIGURA AQUÍ TUS CREDENCIALES ───────────────────────────────────────
const SUPERADMIN_NAME     = "DeveloperAdmin";           // Nombre con el que inicias sesión
const SUPERADMIN_PASSWORD = "Zeraz193";  // ← CAMBIA ESTA CONTRASEÑA
const SUPERADMIN_SCHOOL   = "Administración General";
// ───────────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🔧 Creando cuenta Superadmin...\n");

    // 1. Verificar que no exista ya
    const existing = await prisma.user.findFirst({
        where: { name: { equals: SUPERADMIN_NAME, mode: 'insensitive' }, role: "SUPERADMIN" }
    });

    if (existing) {
        console.log(`ℹ️  Ya existe el Superadmin "${SUPERADMIN_NAME}". Actualizando contraseña...`);
        const hashed = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
        await prisma.user.update({
            where: { id: existing.id },
            data: { password: hashed }
        });
        console.log(`✅ Contraseña de "${SUPERADMIN_NAME}" actualizada a: ${SUPERADMIN_PASSWORD}`);
        return;
    }

    // 2. Buscar o crear una escuela para el superadmin
    let school = await prisma.school.findFirst({
        where: { name: SUPERADMIN_SCHOOL }
    });

    if (!school) {
        school = await prisma.school.create({
            data: {
                name: SUPERADMIN_SCHOOL,
                subscriptionPlan: "PREMIUM",
                subscriptionStatus: "ACTIVE",
                maxMaps: 9999,
                maxStudents: 9999
            }
        });
        console.log(`✅ Escuela creada: "${school.name}"`);
    } else {
        console.log(`ℹ️  Usando escuela existente: "${school.name}"`);
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    // 4. Crear el superadmin
    const superAdmin = await prisma.user.create({
        data: {
            name: SUPERADMIN_NAME,
            password: hashedPassword,
            role: "SUPERADMIN",
            schoolId: school.id,
            avatar: "🛡️"
        }
    });

    console.log(`\n✅ Superadmin creado exitosamente:\n`);
    console.log(`   Nombre:     ${superAdmin.name}`);
    console.log(`   Contraseña: ${SUPERADMIN_PASSWORD}`);
    console.log(`   Rol:        ${superAdmin.role}`);
    console.log(`\n🔐 IMPORTANTE: Guarda estas credenciales en un lugar seguro.`);
    console.log(`   En la app, selecciona "Soy Maestro" e ingresa con estos datos.\n`);
}

main()
    .catch((e) => {
        console.error("❌ Error:", e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
