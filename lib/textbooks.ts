import prisma from './prisma';

export interface TextbookMatch {
  bookTitle: string;
  pdfUrl: string;
  pageNumber: number;
  snippet: string;
}

function buildSpanishOrQuery(topic: string): string {
  const stopwords = new Set([
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'desde', 'nos', 'durante', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti'
  ]);

  const words = topic
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9ñáéíóúü]/g, " ") // Mantener caracteres básicos
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopwords.has(w));

  if (words.length === 0) {
    return '';
  }

  return words.join(' | ');
}

/**
 * Realiza una búsqueda nativa de texto completo (Full-Text Search) en español
 * en las páginas de los libros de texto cargados en la base de datos.
 * 
 * @param topic El tema de interés para realizar la búsqueda semántica/palabras clave.
 * @param limit El límite de resultados recomendados (por defecto 3).
 */
export async function findRelevantPages(topic: string, limit: number = 3): Promise<TextbookMatch[]> {
  if (!topic || topic.trim().length === 0) {
    return [];
  }

  try {
    const orQuery = buildSpanishOrQuery(topic);
    if (!orQuery) {
      return [];
    }

    // Seleccionamos "content" completo en lugar de usar la función "substring" de Postgres
    // para evitar errores de corte de bytes UTF-8 inválidos.
    const query = `
      SELECT 
        t.title as "bookTitle",
        t."pdfUrl" as "pdfUrl",
        tp."pageNumber" as "pageNumber",
        tp.content as "content",
        ts_rank(to_tsvector('spanish', tp.content), to_tsquery('spanish', $1)) as rank
      FROM "TextbookPage" tp
      JOIN "Textbook" t ON tp."textbookId" = t.id
      WHERE to_tsvector('spanish', tp.content) @@ to_tsquery('spanish', $1)
      ORDER BY rank DESC, tp."pageNumber" ASC
      LIMIT $2;
    `;

    const results = await prisma.$queryRawUnsafe<any[]>(query, orQuery, limit);
    
    if (!results || results.length === 0) {
      return [];
    }

    return results.map(r => {
      const fullContent = r.content || '';
      // Creamos el snippet de forma segura en JavaScript a nivel de caracteres (UTF-16)
      const snippet = fullContent.length > 300 
        ? fullContent.substring(0, 300).trim().replace(/\s+/g, ' ') + '...'
        : fullContent.trim().replace(/\s+/g, ' ');

      return {
        bookTitle: r.bookTitle || '',
        pdfUrl: r.pdfUrl || '',
        pageNumber: Number(r.pageNumber) || 1,
        snippet: snippet
      };
    });
  } catch (error) {
    console.error("Error en findRelevantPages:", error);
    return [];
  }
}
