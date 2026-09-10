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

const SPANISH_STOPWORDS = new Set([
    "para", "como", "sobre", "entre", "hasta", "desde", "hacia", "este", "esta", "estos", "estas",
    "cual", "cuales", "donde", "quien", "quienes", "pero", "sino", "porque", "cada", "todo", "toda",
    "todos", "todas", "otro", "otra", "otros", "otras", "mismo", "misma", "alguno", "alguna",
    "algunos", "algunas", "ante", "bajo", "cabe", "con", "contra", "desde", "hacia", "hasta",
    "para", "por", "segun", "sin", "so", "sobre", "tras", "durante", "mediante", "este", "esta",
    "estos", "estas", "del", "las", "los", "una", "uno", "unos", "unas", "pero", "muy", "que",
    "mucha", "mucho", "existe", "podria", "tiempo", "tiempos", "sufrimos", "tiene", "tienen",
    "tenemos", "hacer", "hace", "hacen", "donde", "dondequiera"
]);

function normalizeText(text: string): string {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ");
}

/**
 * Busca recomendaciones de libros de texto basadas en el tema y el grado escolar.
 */
export function findRelevantTextbookPages(topic: string, grade?: string, limit = 4): TextbookEntry[] {
    const catalog = loadCatalog();
    if (!catalog || catalog.length === 0) return [];

    const cleanGrade = grade ? grade.toLowerCase() : "";

    // Filtrar estrictamente el catálogo para incluir ÚNICAMENTE libros del grado seleccionado (o Multigrado)
    const gradeCatalog = catalog.filter(entry => {
        if (!cleanGrade) return true;
        const entryGrade = entry.grade.toLowerCase();
        if (cleanGrade.includes("1") && entryGrade.includes("1")) return true;
        if (cleanGrade.includes("2") && entryGrade.includes("2")) return true;
        if (cleanGrade.includes("3") && entryGrade.includes("3")) return true;
        if (entryGrade.includes("multigrado")) return true;
        return false;
    });

    if (gradeCatalog.length === 0) return [];

    const normTopic = normalizeText(topic);
    const keywords = normTopic
        .split(/\s+/)
        .filter(w => w.length > 2 && !SPANISH_STOPWORDS.has(w));

    if (keywords.length === 0) {
        return gradeCatalog.filter(e => e.snippet.length > 100).slice(0, limit);
    }

    const matches: { entry: TextbookEntry; score: number }[] = [];

    for (const entry of gradeCatalog) {
        const normSnippet = normalizeText(entry.snippet);
        const normBook = normalizeText(entry.bookTitle);
        const normField = normalizeText(entry.field);

        let score = 0;
        let matchedCount = 0;

        for (const kw of keywords) {
            let kwMatched = false;

            if (normSnippet.includes(kw)) {
                score += 5;
                kwMatched = true;
            }
            if (normBook.includes(kw)) {
                score += 3;
                kwMatched = true;
            }
            if (normField.includes(kw)) {
                score += 2;
                kwMatched = true;
            }

            if (kwMatched) matchedCount++;
        }

        // Bonificación por coincidencia múltiple de palabras clave en el mismo fragmento
        if (matchedCount >= 2) {
            score += matchedCount * 5;
        }

        // Debe haber al menos 1 palabra clave relevante con score >= 5
        if (score >= 5 && matchedCount >= 1) {
            matches.push({ entry, score });
        }
    }

    // Ordenar por relevancia de score
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
        return matches.slice(0, limit).map(m => m.entry);
    }

    // Si no hubo coincidencias por palabras clave específicas en el grado, retornar páginas con contenido del grado seleccionado
    return gradeCatalog.filter(e => e.snippet.length > 100).slice(0, limit);
}

