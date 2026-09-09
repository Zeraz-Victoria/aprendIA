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

/**
 * Busca los Contenidos y PDAs oficiales más relevantes del documento Excel indexado (Fase 6 / 1° Secundaria)
 * basados en la problemática/diagnóstico que escribió el docente.
 */
export function findRelevantContenidosAndPDA(query: string, limit = 5): ContenidoPdaRecord[] {
    const list = loadContenidos();
    if (list.length === 0) return [];

    if (!query || query.trim().length === 0) {
        return list.slice(0, limit);
    }

    const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywords = cleanQuery.split(/\s+/).filter(w => w.length > 3);

    if (keywords.length === 0) {
        return list.slice(0, limit);
    }

    const scored = list.map(item => {
        let score = 0;
        const contenidoLower = item.contenido.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const pdaLower = item.pda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const materiaLower = item.materia.toLowerCase();

        for (const kw of keywords) {
            if (contenidoLower.includes(kw)) score += 3;
            if (pdaLower.includes(kw)) score += 2;
            if (materiaLower.includes(kw)) score += 1;
        }

        return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Si hubo coincidencias por palabra clave, devolver las mejores
    const bestMatches = scored.filter(s => s.score > 0);
    if (bestMatches.length > 0) {
        return bestMatches.slice(0, limit).map(s => s.item);
    }

    // Fallback: Devolver diversidad de materias si no hay coincidencia exacta de palabras clave
    return list.slice(0, limit);
}
