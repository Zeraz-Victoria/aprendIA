const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: {
      name: true,
      maxMaps: true,
      _count: {
        select: {
          worlds: true
        }
      }
    }
  });
  
  console.log("===================================");
  console.log("--- Paso 1 y 2: Límite actual de mapas ---");
  for (const s of schools) {
    console.log(`Colegio: ${s.name}, maxMaps: ${s.maxMaps}, Mapas actuales: ${s._count.worlds}`);
  }
  
  console.log("\n--- Paso 3: Subiendo el límite de mapas a 999 ---");
  await prisma.school.updateMany({
    data: {
      maxMaps: 999
    }
  });
  
  const schoolsUpdated = await prisma.school.findMany({
    select: {
      name: true,
      maxMaps: true
    }
  });
  
  for (const s of schoolsUpdated) {
    console.log(`Colegio: ${s.name}, nuevo maxMaps: ${s.maxMaps}`);
  }
  console.log("===================================");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
