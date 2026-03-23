require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Teachers ---');
    const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        include: { school: true }
    });
    console.log(`Found ${teachers.length} teachers:`);
    teachers.forEach(t => {
        console.log(`- ID: ${t.id}, Name: ${t.name}, School: ${t.school?.name || 'NONE'}`);
    });

    console.log('\n--- Checking Schools ---');
    const schools = await prisma.school.findMany();
    console.log(`Found ${schools.length} schools:`);
    schools.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.name}`);
    });

    console.log('\n--- Checking All Users ---');
    const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, role: true }
    });
    console.log(`Total users: ${allUsers.length}`);
    const roles = allUsers.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {});
    console.log('Roles distribution:', roles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
