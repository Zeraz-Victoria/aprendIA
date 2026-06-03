const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('=== CREADOR DE CUENTAS DE FAMILIAR / TUTOR ===\n');

    try {
        const name = await askQuestion('Ingresa el nombre del familiar/tutor (ej. Maria Perez): ');
        if (!name.trim()) {
            console.log('El nombre no puede estar vacío.');
            process.exit(1);
        }

        const password = await askQuestion('Ingresa la contraseña para la cuenta: ');
        if (!password.trim()) {
            console.log('La contraseña no puede estar vacía.');
            process.exit(1);
        }

        console.log('\nHasheando contraseña...');
        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        console.log('Creando usuario en la base de datos...');
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                password: hashedPassword,
                role: 'PARENT',
                status: 'active',
                avatar: '🧑‍👩‍👧‍👦',
                lives: 0,
                gems: 0,
                streak: 0,
                xp: 0
            }
        });

        console.log(`\n✅ ¡Familiar creado con éxito!`);
        console.log(`-----------------------------------`);
        console.log(`Nombre de usuario: ${user.name}`);
        console.log(`Rol de cuenta:     ${user.role}`);
        console.log(`ID en base de datos: ${user.id}`);
        console.log(`-----------------------------------`);
        console.log(`Ahora puedes iniciar sesión en el portal desde la pestaña "Familiar" usando este nombre y contraseña.`);

    } catch (e) {
        console.error('❌ Error creando el familiar:', e);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main();
