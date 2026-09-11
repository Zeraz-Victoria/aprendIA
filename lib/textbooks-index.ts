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
    "por", "segun", "sin", "so", "tras", "durante", "mediante", "del", "las", "los", "una", "uno", "unos", "unas",
    "muy", "que", "mucha", "mucho", "existe", "podria", "tiempo", "tiempos", "sufrimos", "tiene", "tienen",
    "tenemos", "hacer", "hace", "hacen", "donde", "dondequiera", "nivel", "secundaria", "grado", "fase", "alumnos",
    "escuela", "docente", "trabajo", "aula", "proyecto", "proyectos", "aprender", "aprendizaje", "tema", "temas",
    "desarrollo", "actividad", "actividades", "evaluacion", "estudiantes", "maestro", "maestra",
    "algo", "algun", "tambien", "puede", "pueden", "general", "manera", "forma", "parte", "totalmente", "bien", "caso", "casos"
]);

const FIELD_KEYWORDS: Record<string, string[]> = {
    'Saberes y Pensamiento Científico': [
        'matematicas', 'fracciones', 'fraccion', 'decimales', 'ecuaciones', 'ecuacion', 'algebra', 'algebraico',
        'geometria', 'geometrico', 'fisica', 'quimica', 'biologia', 'celula', 'celulas', 'fuerza', 'fuerzas',
        'energia', 'velocidad', 'densidad', 'atomo', 'atomos', 'protones', 'tabla periodica', 'ecosistema',
        'ecosistemas', 'biodiversidad', 'gravedad', 'planetas', 'sol', 'organos', 'cuerpo', 'genetica', 'adn',
        'calculo', 'volumen', 'area', 'perimetro', 'proporcionalidad', 'porcentaje', 'pitagoras', 'poligonos',
        'angulos', 'probabilidad', 'estadistica', 'graficas', 'numeros', 'operaciones', 'suma', 'resta', 'multiplicacion', 'division'
    ],
    'Ética, Naturaleza y Sociedades': [
        'historia', 'revolucion', 'independencia', 'mexico', 'sociedad', 'sociedades', 'derechos', 'humanos',
        'constitucion', 'leyes', 'gobierno', 'democracia', 'democrata', 'cultura', 'paz', 'conflictos', 'conflicto',
        'violencia', 'discriminacion', 'genero', 'igualdad', 'territorio', 'geografia', 'clima', 'migracion',
        'pueblos', 'indigenas', 'colonial', 'mesoamerica', 'tlaxcala', 'aztecas', 'mayas', 'ciudadania', 'etica', 'valores'
    ],
    'Lenguajes': [
        'lengua', 'lenguas', 'lenguaje', 'lenguajes', 'espanol', 'ingles', 'lectura', 'redaccion', 'poesia', 'poema',
        'poemas', 'cuento', 'cuentos', 'novela', 'teatro', 'ensayo', 'argumentacion', 'argumentar', 'debate',
        'comunicacion', 'dialogo', 'texto', 'textos', 'literario', 'narrativo', 'discurso', 'noticia', 'periodico',
        'metafora', 'metaforas', 'rima', 'rimas', 'ortografia', 'gramatica', 'entrevista', 'resena'
    ],
    'De lo Humano y lo Comunitario': [
        'salud', 'emociones', 'emocion', 'autoestima', 'adicciones', 'adiccion', 'drogas', 'droga', 'fentanilo',
        'alcohol', 'tabaco', 'alimentacion', 'nutricion', 'ejercicio', 'deporte', 'educacion fisica',
        'proyecto de vida', 'convivencia', 'comunidad', 'familia', 'sexualidad', 'prevencion', 'higiene', 'bienestar', 'asertividad'
    ]
};

function normalizeText(text: string): string {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ");
}

function isFrontMatter(entry: TextbookEntry): boolean {
    if (entry.page <= 5) return true;
    const norm = normalizeText(entry.snippet);
    if (
        norm.includes("estimadas maestras") ||
        norm.includes("direccion general de materiales") ||
        norm.includes("secretaria de educacion publica") ||
        norm.includes("indice general") ||
        norm.includes("directorio") ||
        norm.includes("comision nacional de libros de texto gratuito")
    ) {
        return true;
    }
    return false;
}

/**
 * Busca recomendaciones de libros de texto basadas en el tema y el grado escolar.
 */
export function findRelevantTextbookPages(topic: string, grade?: string, limit = 4): TextbookEntry[] {
    const catalog = loadCatalog();
    if (!catalog || catalog.length === 0) return [];

    const normTopic = normalizeText(topic);
    const rawTokens = normTopic
        .split(/\s+/)
        .filter(w => w.length > 2 && !SPANISH_STOPWORDS.has(w));

    // Expandir lemas básicos de plurales en español
    const keywords: string[] = [];
    rawTokens.forEach(kw => {
        keywords.push(kw);
        if (kw.endsWith('es') && kw.length > 4) keywords.push(kw.slice(0, -2));
        else if (kw.endsWith('s') && kw.length > 3) keywords.push(kw.slice(0, -1));
    });

    // Detectar campos formativos prioritarios según las palabras del tema
    const boostedFields = new Set<string>();
    for (const [field, kws] of Object.entries(FIELD_KEYWORDS)) {
        for (const kw of kws) {
            if (normTopic.includes(kw)) {
                boostedFields.add(field);
            }
        }
    }

    const cleanGrade = grade ? grade.toLowerCase() : "";

    // Filtrar por grado si existen libros de ese grado
    const gradeCatalog = catalog.filter(entry => {
        if (!cleanGrade) return true;
        const entryGrade = entry.grade.toLowerCase();
        if (cleanGrade.includes("1") && entryGrade.includes("1")) return true;
        if (cleanGrade.includes("2") && entryGrade.includes("2")) return true;
        if (cleanGrade.includes("3") && entryGrade.includes("3")) return true;
        return false;
    });

    // Si el grado no tiene libros propios indexados (ej. 1° de Telesecundaria), buscamos en todo el catálogo de Fase 6
    const searchPool = (gradeCatalog.length > 0) ? gradeCatalog : catalog;

    const matches: { entry: TextbookEntry; score: number }[] = [];

    for (const entry of searchPool) {
        if (isFrontMatter(entry)) continue;

        const snippetNorm = normalizeText(entry.snippet);
        const bookNorm = normalizeText(entry.bookTitle);
        const fieldNorm = normalizeText(entry.field);

        const snippetWords = new Set(snippetNorm.split(/\s+/));
        const bookWords = new Set(bookNorm.split(/\s+/));
        const fieldWords = new Set(fieldNorm.split(/\s+/));

        let score = 0;
        let matchedKeywordsCount = 0;

        for (const kw of keywords) {
            let kwMatched = false;

            if (snippetWords.has(kw)) {
                score += 15;
                kwMatched = true;
            } else if (kw.length >= 5 && snippetNorm.includes(kw)) {
                score += 6;
                kwMatched = true;
            }

            if (bookWords.has(kw)) {
                score += 10;
                kwMatched = true;
            }
            if (fieldWords.has(kw)) {
                score += 6;
                kwMatched = true;
            }

            if (kwMatched) matchedKeywordsCount++;
        }

        // Boost si coincide con el campo formativo temático detectado
        if (boostedFields.has(entry.field)) {
            score += 18;
        }

        // Bonificación por coincidencia múltiple de palabras clave
        if (matchedKeywordsCount >= 2) {
            score += matchedKeywordsCount * 12;
        }

        if (score >= 15 && matchedKeywordsCount >= 1) {
            matches.push({ entry, score });
        }
    }

    // Ordenar por relevancia de score
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
        return matches.slice(0, limit).map(m => m.entry);
    }

    // Si no hubo coincidencias exactas en el grado, buscar en el acervo Multigrado oficial
    const multigradoCatalog = catalog.filter(entry => entry.grade.toLowerCase().includes("multigrado"));
    const multigradoMatches: { entry: TextbookEntry; score: number }[] = [];

    for (const entry of multigradoCatalog) {
        if (isFrontMatter(entry)) continue;
        const snippetNorm = normalizeText(entry.snippet);
        const snippetWords = new Set(snippetNorm.split(/\s+/));
        let matchedCount = 0;
        let score = 0;

        for (const kw of keywords) {
            if (snippetWords.has(kw)) {
                score += 15;
                matchedCount++;
            } else if (kw.length >= 5 && snippetNorm.includes(kw)) {
                score += 8;
                matchedCount++;
            }
        }

        if (matchedCount >= 1 && score >= 15) {
            multigradoMatches.push({ entry, score });
        }
    }

    multigradoMatches.sort((a, b) => b.score - a.score);
    if (multigradoMatches.length > 0) {
        return multigradoMatches.slice(0, limit).map(m => m.entry);
    }

    // NUNCA devolver páginas aleatorias a ciegas: si el tema no está en los libros, se devuelve vacío
    return [];
}


