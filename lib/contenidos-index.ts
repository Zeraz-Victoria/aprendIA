import fs from 'fs';
import path from 'path';

export interface ContenidoPdaRecord {
    grado: string;
    fase: string;
    materia: string;
    campo_formativo: string;
    contenido: string;
    pda: string;
}

let cachedContenidos: ContenidoPdaRecord[] | null = null;

function loadContenidos(): ContenidoPdaRecord[] {
    if (cachedContenidos) return cachedContenidos;

    try {
        const filePath = path.join(process.cwd(), 'data', 'contenidos_pda.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            cachedContenidos = JSON.parse(raw);
            return cachedContenidos || [];
        }
    } catch (e) {
        console.error("Error cargando índice de Contenidos y PDA:", e);
    }
    return [];
}

const NEM_STOPWORDS = new Set([
    "problemas", "problema", "problematica", "problematicas", "comunidad", "comunitario", "comunitaria",
    "alumnos", "alumno", "estudiantes", "docente", "escuela", "escolar", "aula", "proyecto", "proyectos",
    "trabajo", "actividad", "actividades", "evaluacion", "entorno", "contexto", "cotidiano", "cotidiana",
    "vida", "social", "sociedad", "aprender", "aprendizaje", "desarrollo", "fortalecer", "fomentar",
    "promover", "comprender", "comprension", "estrategias", "situacion", "identificar", "reflexionar", "analizar",
    "para", "como", "sobre", "entre", "hasta", "desde", "hacia", "este", "esta", "estos", "estas"
]);

const MATERIA_KEYWORDS: Record<string, string[]> = {
    // ── 1° Secundaria ──────────────────────────────────────────────────────────
    '1° MAT':     ['matematicas', 'matematica', 'fraccion', 'fracciones', 'decimal', 'decimales', 'ecuacion', 'ecuaciones', 'algebra', 'algebraico', 'geometria', 'geometrico', 'recta', 'porcentaje', 'reparto', 'proporcionalidad', 'angulos', 'triangulos', 'poligonos', 'area', 'perimetro', 'volumen', 'probabilidad', 'estadistica', 'grafica', 'graficas', 'numeros', 'multiplicacion', 'division', 'suma', 'resta', 'calculo'],
    '1° ESP':     ['lenguaje', 'lengua', 'espanol', 'lectura', 'redaccion', 'texto', 'textos', 'cuento', 'cuentos', 'poema', 'poemas', 'poesia', 'ensayo', 'debate', 'noticia', 'periodico', 'entrevista', 'comunicacion', 'dialogo', 'literario', 'literatura', 'ortografia', 'gramatica', 'argumentacion'],
    '1° ING':     ['ingles', 'english', 'idioma', 'vocabulario', 'pronunciacion', 'traduccion', 'bilingue'],
    '1° BIO':     ['biologia', 'celula', 'celulas', 'biodiversidad', 'ecosistema', 'ecosistemas', 'seres vivos', 'genetica', 'adn', 'organos', 'cuerpo humano', 'salud', 'nutricion', 'vacunas', 'microorganismos', 'flora', 'fauna', 'fotosintesis'],
    '1° GEO':     ['geografia', 'mapa', 'mapas', 'territorio', 'espacio geografico', 'clima', 'relieve', 'cuencas', 'hidrografica', 'aguas', 'rios', 'lagos', 'placas tectonicas', 'sismos', 'volcanes', 'migracion', 'poblacion'],
    '1° HIST':    ['historia', 'historico', 'independencia', 'revolucion', 'mesoamerica', 'colonizacion', 'colonia', 'pueblos indigenas', 'constitucion', 'porfiriato', 'antiguedad', 'siglo', 'epoca'],
    '1° F.C.E':   ['civica', 'etica', 'derechos', 'derechos humanos', 'leyes', 'normas', 'justicia', 'igualdad', 'genero', 'discriminacion', 'inclusion', 'democracia', 'ciudadania', 'violencia', 'cultura de paz', 'paz', 'acoso'],
    '1° ART':     ['artes', 'artistico', 'musica', 'danza', 'teatro', 'pintura', 'dibujo', 'sonido', 'colores', 'expresion artistica'],
    '1° TEC':     ['tecnologia', 'tecnico', 'herramientas', 'maquinas', 'instrumentos', 'innovacion', 'procesos tecnicos', 'artesanal', 'industrial', 'digital'],
    '1° TUTO':    ['tutoria', 'socioemocional', 'emociones', 'autoestima', 'proyecto de vida', 'empatia', 'convivencia escolar', 'adicciones'],
    '1° EDU.FIS': ['educacion fisica', 'deporte', 'motricidad', 'juego', 'actividad fisica', 'corporalidad', 'recreacion'],
    // ── 2° Secundaria ──────────────────────────────────────────────────────────
    '2° MAT':     ['matematicas', 'matematica', 'fraccion', 'fracciones', 'decimal', 'decimales', 'ecuacion', 'ecuaciones', 'algebra', 'algebraico', 'geometria', 'geometrico', 'recta', 'porcentaje', 'reparto', 'proporcionalidad', 'angulos', 'triangulos', 'poligonos', 'area', 'perimetro', 'volumen', 'probabilidad', 'estadistica', 'grafica', 'graficas', 'numeros', 'calculo'],
    '2° ESP':     ['lenguaje', 'lengua', 'espanol', 'lectura', 'redaccion', 'texto', 'textos', 'cuento', 'cuentos', 'poema', 'poemas', 'poesia', 'ensayo', 'debate', 'noticia', 'periodico', 'entrevista', 'comunicacion', 'dialogo', 'literario', 'literatura', 'ortografia', 'gramatica', 'argumentacion'],
    '2° ING':     ['ingles', 'english', 'idioma', 'vocabulario', 'pronunciacion', 'traduccion', 'bilingue'],
    '2° FIS':     ['fisica', 'fuerza', 'fuerzas', 'velocidad', 'aceleracion', 'movimiento', 'energia', 'trabajo', 'potencia', 'inercia', 'newton', 'cinematica', 'dinamica', 'calor', 'temperatura', 'termodinamica', 'electricidad', 'magnetismo', 'onda', 'sonido', 'luz', 'optica', 'presion', 'densidad', 'flotacion', 'gravedad', 'caida libre', 'tiro parabolico', 'circuito', 'voltaje', 'resistencia', 'ondas mecanicas', 'medicion', 'unidades'],
    '2° HIST':    ['historia', 'historico', 'independencia', 'revolucion', 'virreinato', 'colonia', 'colonizacion', 'conquista', 'mesoamerica', 'constitucion', 'porfiriato', 'siglo', 'epoca', 'aztecas', 'mayas', 'espana', 'colonial', 'hernandez cortes', 'independencia', 'reforma', 'juarez', 'porfirio'],
    '2° F.C.E':   ['civica', 'etica', 'derechos', 'derechos humanos', 'leyes', 'normas', 'justicia', 'igualdad', 'genero', 'discriminacion', 'inclusion', 'democracia', 'ciudadania', 'violencia', 'paz', 'acoso', 'identidad juvenil', 'bienestar colectivo'],
    '2° ART':     ['artes', 'artistico', 'musica', 'danza', 'teatro', 'pintura', 'dibujo', 'sonido', 'colores', 'expresion artistica'],
    '2° TEC':     ['tecnologia', 'tecnico', 'herramientas', 'maquinas', 'instrumentos', 'innovacion', 'materiales', 'procesos tecnicos', 'artesanal', 'industrial', 'digital'],
    '2° TUTO':    ['tutoria', 'socioemocional', 'emociones', 'autoestima', 'proyecto de vida', 'empatia', 'sentimientos', 'convivencia escolar', 'adicciones', 'toma de decisiones'],
    '2° EDU.FIS': ['educacion fisica', 'deporte', 'motricidad', 'juego', 'actividad fisica', 'corporalidad', 'recreacion', 'condicion fisica', 'habilidades motrices'],
    // ── 1° Primaria ──────────────────────────────────────────────────────────
    '1º Len':        ['lenguaje', 'lectura', 'escritura', 'comunicacion', 'texto', 'cuento', 'poema', 'narrativa', 'gramatica', 'ortografia'],
    '1º Saberes y P. C.': ['ciencias', 'naturaleza', 'experimentacion', 'observacion', 'metodo cientifico', 'materia', 'energia', 'cuerpo', 'ecosistema'],
    '1º Ética N. y S.': ['valores', 'respeto', 'responsabilidad', 'ciudadania', 'etica', 'normas', 'convivencia', 'solidaridad'],
    '1º De lo Humano y lo C.': ['tecnologia', 'herramientas', 'maquinas', 'materiales', 'procesos', 'comunidad'],
    // ── 2° Primaria ──────────────────────────────────────────────────────────
    '2º Len':        ['lectura', 'escritura', 'comprension', 'vocabulario', 'gramatica', 'redaccion', 'cuentos', 'poemas'],
    '2º Saberes y P. C.': ['ciencias', 'materia', 'energia', 'cuerpo', 'ecosistema', 'agua', 'aire', 'tierra'],
    '2º Ética N. y S.': ['valores', 'responsabilidad', 'derechos', 'deberes', 'convivencia', 'civica'],
    '2º De lo Humano y lo C.': ['instrumentos', 'tecnologia', 'herramientas', 'procesos', 'materiales'],
    // ── 3° Primaria ──────────────────────────────────────────────────────────
    '3º Len':        ['lectura', 'escritura', 'analisis', 'interpretacion', 'vocabulario', 'gramatica', 'redaccion'],
    '3º Saberes y P. C.': ['ciencias', 'física', 'quimica', 'biologia', 'ecología', 'energia', 'materia'],
    '3º Ética N. y S.': ['ética', 'responsabilidad', 'cívica', 'derechos humanos', 'valores'],
    '3º De lo Humano y lo C.': ['tecnología', 'maquinaria', 'procesos', 'materiales', 'innovación'],
    // ── 4° Primaria ──────────────────────────────────────────────────────────
    '4º Len':        ['literatura', 'análisis', 'crítica', 'redacción', 'vocabulario', 'gramática', 'interpretación'],
    '4º Saberes y P. C.': ['ciencias', 'física', 'química', 'biología', 'astronomía', 'energía', 'materia'],
    '4º Ética N. y S.': ['ética', 'cívica', 'responsabilidad', 'ciudadanía', 'valores'],
    '4º De lo Humano y lo C.': ['tecnología', 'ingeniería', 'procesos', 'materiales', 'innovación'],
    // ── 5° Primaria ──────────────────────────────────────────────────────────
    '5º Len':        ['literatura', 'crítica', 'ensayo', 'poesía', 'análisis', 'redacción'],
    '5º Saberes y P. C.': ['ciencias', 'física', 'química', 'biología', 'geología', 'energía', 'materia'],
    '5º Ética N. y S.': ['ética', 'cívica', 'responsabilidad', 'derechos', 'valores'],
    '5º De lo Humano y lo C.': ['tecnología', 'diseño', 'procesos', 'materiales', 'innovación'],
    // ── 6° Primaria ──────────────────────────────────────────────────────────
    '6º Len':        ['literatura', 'crítica', 'análisis', 'redacción', 'poesía', 'ensayo'],
    '6º Saberes y P. C.': ['ciencias', 'física', 'química', 'biología', 'astronomía', 'energía', 'materia'],
    '6º Ética N. y S.': ['ética', 'cívica', 'responsabilidad', 'ciudadanía', 'valores'],
    '6º De lo Humano y lo C.': ['tecnología', 'ingeniería', 'diseño', 'procesos', 'materiales'],
    // Existing secondary entries follow below
    // ── 2° Secundaria ──────────────────────────────────────────────────────────
    '2° MAT':     ['matematicas', 'matematica', 'fraccion', 'fracciones', 'decimal', 'decimales', 'ecuacion', 'ecuaciones', 'algebra', 'algebraico', 'geometria', 'geometrico', 'recta', 'porcentaje', 'reparto', 'proporcionalidad', 'angulos', 'triangulos', 'poligonos', 'area', 'perimetro', 'volumen', 'probabilidad', 'estadistica', 'grafica', 'graficas', 'numeros', 'calculo'],
    '2° ESP':     ['lenguaje', 'lengua', 'espanol', 'lectura', 'redaccion', 'texto', 'textos', 'cuento', 'cuentos', 'poema', 'poemas', 'poesia', 'ensayo', 'debate', 'noticia', 'periodico', 'entrevista', 'comunicacion', 'dialogo', 'literario', 'literatura', 'ortografia', 'gramatica', 'argumentacion'],
    '2° ING':     ['ingles', 'english', 'idioma', 'vocabulario', 'pronunciacion', 'traduccion', 'bilingue'],
    '2° FIS':     ['fisica', 'fuerza', 'fuerzas', 'velocidad', 'aceleracion', 'movimiento', 'energia', 'trabajo', 'potencia', 'inercia', 'newton', 'cinematica', 'dinamica', 'calor', 'temperatura', 'termodinamica', 'electricidad', 'magnetismo', 'onda', 'sonido', 'luz', 'optica', 'presion', 'densidad', 'flotacion', 'gravedad', 'caida libre', 'tiro parabolico', 'circuito', 'voltaje', 'resistencia', 'ondas mecanicas', 'medicion', 'unidades'],
    '2° HIST':    ['historia', 'historico', 'independencia', 'revolucion', 'virreinato', 'colonia', 'colonizacion', 'conquista', 'mesoamerica', 'constitucion', 'porfiriato', 'siglo', 'epoca', 'aztecas', 'mayas', 'espana', 'colonial', 'hernandez cortes', 'independencia', 'reforma', 'juarez', 'porfirio'],
    '2° F.C.E':   ['civica', 'etica', 'derechos', 'derechos humanos', 'leyes', 'normas', 'justicia', 'igualdad', 'genero', 'discriminacion', 'inclusion', 'democracia', 'ciudadania', 'violencia', 'paz', 'acoso', 'identidad juvenil', 'bienestar colectivo'],
    '2° ART':     ['artes', 'artistico', 'musica', 'danza', 'teatro', 'pintura', 'dibujo', 'sonido', 'colores', 'expresion artistica'],
    '2° TEC':     ['tecnologia', 'tecnico', 'herramientas', 'maquinas', 'instrumentos', 'innovacion', 'materiales', 'procesos tecnicos', 'artesanal', 'industrial', 'digital'],
    '2° TUTO':    ['tutoria', 'socioemocional', 'emociones', 'autoestima', 'proyecto de vida', 'empatia', 'sentimientos', 'convivencia escolar', 'adicciones', 'toma de decisiones'],
    '2° EDU.FIS': ['educacion fisica', 'deporte', 'motricidad', 'juego', 'actividad fisica', 'corporalidad', 'recreacion', 'condicion fisica', 'habilidades motrices'],
    // ── 3° Secundaria ──────────────────────────────────────────────────────────
    '3° MAT':     ['matematicas', 'matematica', 'fraccion', 'fracciones', 'decimal', 'decimales', 'ecuacion', 'ecuaciones', 'algebra', 'algebraico', 'geometria', 'geometrico', 'recta', 'porcentaje', 'reparto', 'proporcionalidad', 'angulos', 'triangulos', 'poligonos', 'area', 'perimetro', 'volumen', 'probabilidad', 'estadistica', 'grafica', 'graficas', 'numeros', 'calculo'],
    '3° ESP':     ['lenguaje', 'lengua', 'espanol', 'lectura', 'redaccion', 'texto', 'textos', 'cuento', 'cuentos', 'poema', 'poemas', 'poesia', 'ensayo', 'debate', 'noticia', 'periodico', 'entrevista', 'comunicacion', 'dialogo', 'literario', 'literatura', 'ortografia', 'gramatica', 'argumentacion'],
    '3° ING':     ['ingles', 'english', 'idioma', 'vocabulario', 'pronunciacion', 'traduccion', 'bilingue'],
    '3° QUI':     ['quimica', 'reacciones', 'elementos', 'compuestos', 'tabla periodica', 'laboratorio', 'mezclas', 'soluciones', 'pH', 'acidos', 'bases'],
    '3° HIST':    ['historia', 'historico', 'independencia', 'revolucion', 'aztecas', 'mayas', 'colonial', 'conquista', 'independencia', 'reforma', 'juarez', 'porfirio', 'cultura'],
    '3° F.C.E':   ['civica', 'etica', 'derechos', 'derechos humanos', 'leyes', 'normas', 'justicia', 'igualdad', 'genero', 'discriminacion', 'inclusion', 'democracia', 'ciudadania', 'violencia', 'paz', 'acoso', 'identidad juvenil', 'bienestar colectivo'],
    '3° ART':     ['artes', 'artistico', 'musica', 'danza', 'teatro', 'pintura', 'dibujo', 'sonido', 'colores', 'expresion artistica'],
    '3° TEC':     ['tecnologia', 'tecnico', 'herramientas', 'maquinas', 'instrumentos', 'innovacion', 'materiales', 'procesos tecnicos', 'artesanal', 'industrial', 'digital'],
    '3° TUTO':    ['tutoria', 'socioemocional', 'emociones', 'autoestima', 'proyecto de vida', 'empatia', 'sentimientos', 'convivencia escolar', 'adicciones', 'toma de decisiones'],
    '3° EDU.FIS': ['educacion fisica', 'deporte', 'motricidad', 'juego', 'actividad fisica', 'corporalidad', 'recreacion', 'condicion fisica', 'habilidades motrices'],
};

/**
 * Busca los Contenidos y PDAs oficiales más relevantes del documento Excel indexado (Fase 6 / 1° Secundaria)
 * basados en la problemática/diagnóstico que escribió el docente.
 */
export function findRelevantContenidosAndPDA(query: string, limit = 6, grade?: string): ContenidoPdaRecord[] {
    const list = loadContenidos();
    if (list.length === 0) return [];

    if (!query || query.trim().length === 0) {
        return list.slice(0, limit);
    }

    const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Filtrar palabras vacías genéricas de la NEM para quedarnos con el núcleo temático
    const rawTokens = cleanQuery.split(/\s+/).filter(w => w.length > 2);
    const specificKeywords = rawTokens.filter(w => !NEM_STOPWORDS.has(w));
    const searchTokens = specificKeywords.length > 0 ? specificKeywords : rawTokens;

    // Detectar materia prioritaria según términos temáticos
    const boostedMaterias = new Set<string>();
    for (const [materia, kws] of Object.entries(MATERIA_KEYWORDS)) {
        for (const kw of kws) {
            if (cleanQuery.includes(kw)) {
                boostedMaterias.add(materia);
            }
        }
    }

    // Filtrar por grado si se proporciona
    const cleanGrade = grade ? grade.toLowerCase() : "";
    const filteredList = list.filter(item => {
        if (!cleanGrade) return true;
        const itemGrade = item.grado.toLowerCase();
        if (cleanGrade.includes("1") && itemGrade.includes("1")) return true;
        if (cleanGrade.includes("2") && itemGrade.includes("2")) return true;
        if (cleanGrade.includes("3") && itemGrade.includes("3")) return true;
        return true;
    });

    const candidatePool = filteredList.length > 0 ? filteredList : list;

    const scored = candidatePool.map(item => {
        let score = 0;
        const contenidoLower = item.contenido.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const pdaLower = item.pda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const materiaLower = item.materia.toLowerCase();

        for (const kw of searchTokens) {
            if (contenidoLower.includes(kw)) score += 6;
            if (pdaLower.includes(kw)) score += 4;
            if (materiaLower.includes(kw)) score += 2;
        }

        // Boost alto si coincide con la materia detectada (ej. matemáticas)
        if (boostedMaterias.has(item.materia)) {
            score += 15;
        }

        return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Si hubo coincidencias por palabra clave o materia, devolver las mejores
    const bestMatches = scored.filter(s => s.score > 0);
    if (bestMatches.length > 0) {
        return bestMatches.slice(0, limit).map(s => s.item);
    }

    // Fallback: Devolver primeros elementos
    return candidatePool.slice(0, limit);
}
