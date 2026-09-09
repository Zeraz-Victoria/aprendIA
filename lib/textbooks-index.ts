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
    if (catalog.length === 0 || !topic) return [];

    const cleanTopic = topic.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywords = cleanTopic.split(/\s+/).filter(w => w.length > 3);

    const matches: { entry: TextbookEntry; score: number }[] = [];

    for (const entry of catalog) {
        let score = 0;

        // Coincidencia de grado
        if (grade) {
            const cleanGrade = grade.toLowerCase();
            if (cleanGrade.includes("2") && entry.grade.includes("2")) score += 3;
            if (cleanGrade.includes("3") && entry.grade.includes("3")) score += 3;
            if (entry.grade.includes("Multigrado")) score += 1;
        }

        const snippetLower = entry.snippet.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const bookLower = entry.bookTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        for (const kw of keywords) {
            if (snippetLower.includes(kw)) score += 2;
            if (bookLower.includes(kw)) score += 1;
        }

        if (score > 2) {
            matches.push({ entry, score });
        }
    }

    // Ordenar por relevancia
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit).map(m => m.entry);
}
