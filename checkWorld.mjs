import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const world = await prisma.world.findFirst({ orderBy: { createdAt: 'desc' } });
  if (world) {
    console.log(JSON.stringify(JSON.parse(world.daysJson)[0], null, 2));
  } else {
    console.log("No world found");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
