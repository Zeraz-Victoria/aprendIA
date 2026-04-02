const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const jimena = await prisma.user.findFirst({
    where: { studentCode: 'LMSN5Q' },
    include: {
      assignedWorlds: true,
      classroom: {
        include: { worlds: true }
      }
    }
  });

  const allWorlds = await prisma.world.findMany();

  console.log('Jimena:', JSON.stringify(jimena, null, 2));
  console.log('Total Worlds in DB:', allWorlds.length);
  if (allWorlds.length > 0) {
    console.log('First world ID:', allWorlds[0].id);
  }
}

check()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
