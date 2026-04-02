import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: { contains: 'Adrian', mode: 'insensitive' }
    },
    include: {
      school: true,
    }
  });

  console.log(`Found ${users.length} users with "Adrian" in total:`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Name: "${u.name}", Role: ${u.role}, SchoolId: ${u.schoolId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
