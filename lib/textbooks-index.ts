import fs from 'fs';
import path from 'path';

export interface TextbookEntry {
    bookTitle: string;
    grade: string;
    field: string;
    page: number;
    snippet: string;
    file: string;
}

let catalogCache: TextbookEntry[] | null = null;

function loadCatalog(): TextbookEntry[] {
    if (catalogCache) return catalogCache;

    try {
        const filePath = path.join(process.cwd(), 'data', 'books_index', 'catalog.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            catalogCache = JSON.parse(raw);
            return catalogCache || [];
        }
    } catch (e) {
        console.error("Error cargando catálogo de libros de texto:", e);
    }
    return [];
}

/**
 * Busca recomendaciones de libros de texto basadas en el tema y el grado escolar.
 */
export function findRelevantTextbookPages(topic: string, grade?: string, limit = 4): TextbookEntry[] {
    const catalog = loadCatalog();
    if (catalog.length === 0) return [];

    const cleanTopic = (topic || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywords = cleanTopic.split(/\s+/).filter(w => w.length > 3);

    const matches: { entry: TextbookEntry; score: number }[] = [];

    for (const entry of catalog) {
        // Filtro estricto por grado si se especifica
        if (grade) {
            const cleanGrade = grade.toLowerCase();
            let matchesGrade = false;
            if (cleanGrade.includes("1") && entry.grade.includes("1")) matchesGrade = true;
            if (cleanGrade.includes("2") && entry.grade.includes("2")) matchesGrade = true;
            if (cleanGrade.includes("3") && entry.grade.includes("3")) matchesGrade = true;
            if (entry.grade.includes("Multigrado")) matchesGrade = true;

            if (!matchesGrade) continue;
        }

        let score = 0;
        const snippetLower = entry.snippet.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const bookLower = entry.bookTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        for (const kw of keywords) {
            if (snippetLower.includes(kw)) score += 3;
            if (bookLower.includes(kw)) score += 2;
        }

        if (score >= 3) {
            matches.push({ entry, score });
        }
    }

    // Ordenar por relevancia de score
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
        return matches.slice(0, limit).map(m => m.entry);
    }

    // Fallback: si no hubo coincidencias exactas por palabra clave, retornar las primeras 4 páginas útiles del grado
    if (grade) {
        const cleanGrade = grade.toLowerCase();
        const gradeFallback = catalog.filter(e => {
            if (cleanGrade.includes("1") && e.grade.includes("1")) return true;
            if (cleanGrade.includes("2") && e.grade.includes("2")) return true;
            if (cleanGrade.includes("3") && e.grade.includes("3")) return true;
            return e.grade.includes("Multigrado");
        });
        if (gradeFallback.length > 0) {
            return gradeFallback.slice(0, limit);
        }
    }

    return catalog.slice(0, limit);
}
