const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BOOKS_DIR = path.join(__dirname, 'books_markdown', 'libros de texto', 'libros primero');

const BOOKS_METADATA = [
  {
    filename: '1_TS_SPC-BAJA.md',
    title: 'Saberes y Pensamiento Científico - Primer Grado Telesecundaria',
    code: '1_TS_SPC',
    pdfUrl: '/libros de texto/libros primero/1_TS_SPC-BAJA.pdf'
  },
  {
    filename: '1_TS-ENS-BAJA.md',
    title: 'Ética, Naturaleza y Sociedades - Primer Grado Telesecundaria',
    code: '1_TS_ENS',
    pdfUrl: '/libros de texto/libros primero/1_TS-ENS-BAJA.pdf'
  },
  {
    filename: '1_TS-INGLES-BAJA.md',
    title: 'Lengua Extranjera Inglés - Primer Grado Telesecundaria',
    code: '1_TS_INGLES',
    pdfUrl: '/libros de texto/libros primero/1_TS-INGLES-BAJA.pdf'
  },
  {
    filename: '1_TS-HC-BAJA.md',
    title: 'De lo Humano y lo Comunitario - Primer Grado Telesecundaria',
    code: '1_TS_HC',
    pdfUrl: '/libros de texto/libros primero/1_TS-HC-BAJA.pdf'
  },
  {
    filename: '1_TS-NLP-T1-BAJA.md',
    title: 'Nuestros Saberes: Libro para Alumnos y Maestros Tomo 1 - Primer Grado Telesecundaria',
    code: '1_TS_NLP_T1',
    pdfUrl: '/libros de texto/libros primero/1_TS-NLP-T1-BAJA.pdf'
  },
  {
    filename: '1_TS-NLP-T2-BAJA.md',
    title: 'Nuestros Saberes: Libro para Alumnos y Maestros Tomo 2 - Primer Grado Telesecundaria',
    code: '1_TS_NLP_T2',
    pdfUrl: '/libros de texto/libros primero/1_TS-NLP-T2-BAJA.pdf'
  },
  {
    filename: '1_TS-NLP-T3-BAJA.md',
    title: 'Nuestros Saberes: Libro para Alumnos y Maestros Tomo 3 - Primer Grado Telesecundaria',
    code: '1_TS_NLP_T3',
    pdfUrl: '/libros de texto/libros primero/1_TS-NLP-T3-BAJA.pdf'
  },
  {
    filename: '1_TS-ML-BAJA.md',
    title: 'Múltiples Lenguajes - Primer Grado Telesecundaria',
    code: '1_TS_ML',
    pdfUrl: '/libros de texto/libros primero/1_TS-ML-BAJA.pdf'
  },
  {
    filename: '1_TS-LENGUAJES-BAJA.md',
    title: 'Lenguajes - Primer Grado Telesecundaria',
    code: '1_TS_LENGUAJES',
    pdfUrl: '/libros de texto/libros primero/1_TS-LENGUAJES-BAJA.pdf'
  },
  {
    filename: 'MULTI-TS-HIST-PUEBLO-MEX-BAJA.md',
    title: 'Historia del Pueblo Mexicano - Multigrado Telesecundaria',
    code: 'MULTI_TS_HIST_PUEBLO_MEX',
    pdfUrl: '/libros de texto/libros primero/MULTI-TS-HIST-PUEBLO-MEX-BAJA.pdf'
  }
];

async function seed() {
  console.log("=== INICIANDO SIEMBRA DE LIBROS DE TEXTO ===");

  for (const meta of BOOKS_METADATA) {
    const mdPath = path.join(BOOKS_DIR, meta.filename);
    console.log(`\nProcesando archivo: ${meta.filename}...`);

    if (!fs.existsSync(mdPath)) {
      console.log(`⚠️ Archivo no encontrado en ${mdPath}. Saltando...`);
      continue;
    }

    const content = fs.readFileSync(mdPath, 'utf8');

    // 1. Crear o actualizar el libro
    const textbook = await prisma.textbook.upsert({
      where: { code: meta.code },
      update: {
        title: meta.title,
        pdfUrl: meta.pdfUrl,
        grade: 'Secundaria 1',
        modality: 'Telesecundaria'
      },
      create: {
        title: meta.title,
        code: meta.code,
        pdfUrl: meta.pdfUrl,
        grade: 'Secundaria 1',
        modality: 'Telesecundaria'
      }
    });

    console.log(`✓ Libro registrado/actualizado: "${textbook.title}" (ID: ${textbook.id})`);

    // 2. Parsear el archivo Markdown para extraer páginas
    // Separamos por el patrón "## Página "
    const pageSplits = content.split(/(?=^## Página \d+)/m);
    const pagesToInsert = [];

    for (const split of pageSplits) {
      const match = split.match(/^## Página (\d+)\s*\n([\s\S]*)/);
      if (match) {
        const pageNumber = parseInt(match[1], 10);
        let pageContent = match[2].trim();

        // Omitir separadores finales de página si los hay (ej. "---")
        pageContent = pageContent.replace(/---+\s*$/, '').trim();

        // Evitar guardar contenido inútil si la página estaba vacía
        if (pageContent && !pageContent.includes("*[Página vacía o contiene solo imágenes]*")) {
          pagesToInsert.push({
            pageNumber,
            content: pageContent,
            textbookId: textbook.id
          });
        }
      }
    }

    console.log(`   Páginas válidas con texto encontradas: ${pagesToInsert.length}`);

    if (pagesToInsert.length > 0) {
      // Borrar páginas viejas para evitar duplicados en la recarga
      await prisma.textbookPage.deleteMany({
        where: { textbookId: textbook.id }
      });

      // Insertar las nuevas páginas en lotes para mayor eficiencia
      const chunkSize = 100;
      for (let i = 0; i < pagesToInsert.length; i += chunkSize) {
        const chunk = pagesToInsert.slice(i, i + chunkSize);
        await prisma.textbookPage.createMany({
          data: chunk
        });
      }
      console.log(`   ✓ ${pagesToInsert.length} páginas insertadas con éxito.`);
    }
  }

  console.log("\n=== SIEMBRA DE LIBROS COMPLETADA CON ÉXITO ===");
}

seed()
  .catch((e) => {
    console.error("❌ Error en la siembra:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
