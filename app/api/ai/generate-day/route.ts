import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { findRelevantPages } from '@/lib/textbooks';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';



export async function POST(req: Request) {
    const rawApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/['"]/g, '').trim();
    if (!apiKey) throw new Error('API Key missing');
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { day, pedagogy, theme, documentText, previousGrade, isFinalBoss, vocabularyLevel } = await req.json();

        if (!day || !pedagogy) {
            return NextResponse.json({ error: 'Faltan datos requeridos (day, pedagogy)' }, { status: 400 });
        }

        console.log(`Generating narrative for Day ${day.dayNumber}: ${day.title}...`);

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.2, // Slightly more creative for narratives
                responseMimeType: "application/json",
            }
        });

        const isDemo = documentText === "DEMO_MODE";

        // V2 Adaptive Difficulty: Inject warning if the previous grade was low
        const adaptiveRescuePrompt = (previousGrade !== undefined && previousGrade <= 6)
            ? `\n\n[ALERTA DE REZAGO: El alumno tuvo dificultades severas en el nivel anterior (Calificación: ${previousGrade}/10). Simplifica el vocabulario de esta sesión al máximo, explica con ejemplos muy cotidianos y reduce la complejidad cognitiva de la actividad de desarrollo un 30%].`
            : "";

        // Vocabulary complexity instruction
        const vocabInstructions: Record<string, string> = {
            facil: 'NIVEL DE VOCABULARIO: FÁCIL (1° a 4° de primaria). Usa palabras simples y cotidianas que un niño de 6 a 10 años entienda. Evita tecnicismos. Usa oraciones cortas y directas. Si necesitas usar un término técnico, explícalo inmediatamente con palabras sencillas.',
            medio: 'NIVEL DE VOCABULARIO: MEDIO (5° primaria a 1° secundaria). Usa vocabulario adecuado para preadolescentes de 10 a 13 años. Puedes usar algunos términos técnicos básicos pero siempre con contexto. Oraciones de complejidad media.',
            alto: 'NIVEL DE VOCABULARIO: ALTO (2° secundaria a preparatoria). Usa vocabulario académico apropiado para adolescentes de 13 a 18 años. Puedes usar terminología técnica y especializada del campo. Oraciones complejas con conectores lógicos.'
        };
        const vocabPrompt = vocabInstructions[vocabularyLevel || 'facil'] || vocabInstructions.facil;

        // Buscar páginas de libros de texto de apoyo relevantes
        let booksContext = "";
        let relevantPages: any[] = [];
        try {
            let searchGrade = undefined;
            if (pedagogy.grade) {
                if (pedagogy.grade.includes("6")) {
                    searchGrade = "Secundaria 1";
                } else if (pedagogy.grade.includes("5")) {
                    searchGrade = "Primaria 5";
                } else if (pedagogy.grade.includes("4")) {
                    searchGrade = "Primaria 3";
                } else if (pedagogy.grade.includes("3")) {
                    searchGrade = "Primaria 1";
                }
            }
            const targetGrade = searchGrade || (pedagogy.grade && !pedagogy.grade.startsWith("Fase") ? pedagogy.grade : undefined);
            relevantPages = await findRelevantPages(pedagogy.topic, 4, targetGrade);
            if (relevantPages.length > 0) {
                booksContext = relevantPages.map(page => 
                    `- Libro: "${page.bookTitle}" | Página: ${page.pageNumber} | PDF: "${page.pdfUrl}" | Contexto: "${page.snippet}"`
                ).join('\n');
            }
        } catch (err) {
            console.error("Error fetching relevant pages for generate-day prompt:", err);
        }

        // Custom prompt per day type
        const prompt = `
# ROL
Eres un Diseñador Instruccional Senior especializado en la Nueva Escuela Mexicana (NEM), con maestría en Tecnología Educativa. Tu trabajo es crear experiencias de aprendizaje digitales autónomas de calidad profesional.

# ${vocabPrompt}

# DATOS DE ENTRADA
- TÍTULO DE LA SESIÓN: ${day.title || pedagogy.topic}
- CONTENIDO PEDAGÓGICO: ${day.session_start || documentText?.substring(0, 800) || "Sin contenido previo."}
- FASE ESCOLAR: ${pedagogy.grade || "Fase General"}
- TEMA VISUAL NARRATIVO: ${theme || "clasico"}
- PDA (Proceso de Desarrollo de Aprendizaje): ${pedagogy.pda || "PDA General"}
- TIPO DE NIVEL: ${day.type || "concept_story"}
- NÚMERO DE NIVEL: ${day.dayNumber}

# INSTRUCCIONES DE CALIDAD PROFESIONAL

## 1. NARRATIVA DE APERTURA (historia_inicio)
Escribe un párrafo envolvente (80-120 palabras) que:
- Conecte con la vida cotidiana del alumno y use fuertemente elementos del tema visual (${theme || 'clasico'}).
- Presente una situación problema o pregunta detonadora real.
- Use vocabulario accesible pero preciso.

## 2. ORÁCULO DE TEORÍA (oraculo_teoria)
Este es el bloque MÁS IMPORTANTE. Debe ser una explicación COMPLETA que permita aprendizaje autónomo.

Estructura el contenido_html con SECCIONES CLARAS usando Markdown:

### [Título del Concepto Principal]
Explicación clara del concepto (3-4 oraciones). Usa lenguaje directo.

### ¿Cómo funciona?
Paso a paso o proceso explicado con claridad.

### Ejemplo Resuelto
Un ejemplo concreto con datos reales y su resolución paso a paso.

### Dato Curioso
Un hecho interesante que conecte el concepto con el mundo real.

REGLAS del oráculo:
- Mínimo 250 palabras, máximo 500
- Usa \\n\\n para separar párrafos (NUNCA HTML)
- Incluye al menos 1 ejemplo numérico resuelto si aplica
- Usa **negritas** para términos clave
- El alumno debe poder entender el tema SOLO leyendo este bloque

## 3. RETO DE GAMEPLAY (reto_gameplay)
OBLIGATORIO: Construye un mini-juego interactivo de opción múltiple relacionado con la sesión.
- datos_config.pregunta: Una pregunta específica y bien formulada para el mini-juego en pantalla.
- datos_config.respuesta_correcta: La respuesta exacta esperada del mini-juego.
- datos_config.opciones_distractor: Genera EXACTAMENTE 3 opciones incorrectas pero plausibles.
- datos_config.feedback_error: Una pista corta si el alumno se equivoca en el juego.

## 4. INSTRUCCIÓN Y EVIDENCIA FÍSICA (instruccion_evidencia)
OBLIGATORIO: Esta es la actividad principal que el alumno realizará EN SU LIBRETA/CUADERNO de forma física para luego tomarle foto.
- Si el maestro proporcionó una actividad de evaluación o cierre en la planeación, úsala aquí y adáptala para que sea completamente autónoma.
- Si no hay actividad proporcionada por el docente, INVENTA UNA basada en el tema.
- instrucción_fiel: Instrucciones claras y paso a paso de lo que el alumno debe escribir, dibujar o calcular en su cuaderno.
- tipo_evidencia_requerida: FOTO_DIBUJO | FOTO_TEXTO | MULTIPLE_CHOICE (generalmente foto de libreta).
- valor_esperado_docente: Lo que el docente espera ver en la libreta del alumno (la respuesta correcta o criterios de éxito).
- ejemplos_resolucion: Un ejemplo resuelto de lo que deben hacer en la libreta.

## 5. GLOSARIO (glosario)
Extrae entre 3 y 5 palabras técnicas o complejas del oráculo. Cada definición debe ser:
- Máximo 15 palabras
- Comprensible para un niño de la fase correspondiente
- Sin usar la misma palabra en la definición

## 6. AUTONOMÍA TOTAL
El alumno está SOLO. PROHIBIDO mencionar al docente. Si la planeación dice "el docente explica...", TÚ redactas esa explicación completa. Si dice "el docente entrega materiales...", TÚ generas ese material.
${adaptiveRescuePrompt}

# LIBROS DE TEXTO DE APOYO DISPONIBLES:
Aquí tienes fragmentos reales y referencias de los libros de texto oficiales que coinciden con el tema "${pedagogy.topic}". Utiliza esta información para enriquecer los contenidos teóricos (el oráculo y los ejemplos resueltos) y asigna obligatoriamente cuáles de estas lecturas se recomiendan para esta sesión:
${booksContext || "No se encontraron páginas de apoyo en la base de datos."}

*REGLA CRÍTICA Y SOBERANA DE LIBROS (CERO ALUCINACIÓN)*:
1. Solo puedes incluir lecturas que aparezcan explícitamente listadas en la sección "LIBROS DE TEXTO DE APOYO DISPONIBLES" de arriba.
2. Está TERMINANTEMENTE PROHIBIDO inventar nombres de libros, inventar números de páginas que no estén en la lista, inventar temas o rutas de archivos PDF.
3. Si el libro y la página no están en la lista de arriba, NO los agregues. Si la lista está vacía, el arreglo "lecturas_sugeridas" debe ser estrictamente vacío: [].
4. Copia los campos "libro", "pagina" y "pdfUrl" EXACTAMENTE tal como aparecen en la lista de arriba. No los modifiques ni un solo carácter.

# FORMATO DE SALIDA (JSON estricto):
{
  "nivel_id": "${day.dayNumber}",
  "pda_objetivo": "Descripción breve del PDA que se trabaja",
  "lecturas_sugeridas": [
    {
      "libro": "Nombre exacto del libro",
      "pagina": 47,
      "tema": "Título o tema de la página",
      "pdfUrl": "Ruta exacta del PDF"
    }
  ],
  "historia_inicio": "Narrativa de apertura envolvente (80-120 palabras)",
  "oraculo_teoria": {
    "titulo": "Título descriptivo del concepto",
    "contenido_html": "### Sección 1\\n\\nContenido...\\n\\n### Sección 2\\n\\nContenido... (mínimo 250 palabras, bien estructurado con secciones Markdown)",
    "tip_clave": "La regla más importante a recordar en una oración"
  },
  "reto_gameplay": {
    "datos_config": {
      "pregunta": "Pregunta de opción múltiple para jugar en la pantalla",
      "respuesta_correcta": "Respuesta correcta",
      "opciones_distractor": ["Opción incorrecta 1", "Opción incorrecta 2", "Opción incorrecta 3"],
      "feedback_error": "Pista corta si se equivoca"
    }
  },
  "instruccion_evidencia": {
    "tipo_evidencia_requerida": "FOTO_DIBUJO|FOTO_TEXTO|TEXTO_ENSAYO",
    "instruccion_fiel": "Instrucciones detalladas de lo que hará en la libreta",
    "valor_esperado_docente": "Criterio o respuesta que espera el maestro",
    "ejemplos_resolucion": "Ejemplo similar resuelto paso a paso (Markdown)"
  },
  "cierre_metacognicion": "Reflexión final que invite al alumno a pensar sobre su aprendizaje",
  "presentationType": "${(() => { const types = ['flashcards', 'mind_map', 'synoptic_chart', 'infographic', 'crossword']; return types[((day.dayNumber || 1) - 1) % types.length]; })()}",
  "glosario": [
    { "palabra": "término", "definicion": "definición clara y breve" }
  ]
}
`;


        const repairJson = (jsonStr: string): string => {
            jsonStr = jsonStr.trim();
            const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || 
                              jsonStr.match(/```\n([\s\S]*?)\n```/) ||
                              jsonStr.match(/{[\s\S]*}/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1] || jsonMatch[0];
            }
            jsonStr = jsonStr.trim();

            let repaired = '';
            let inString = false;
            let isEscaped = false;
            
            const contextStack: ('object' | 'array')[] = [];
            let expect: 'value' | 'key_or_close' | 'value_or_close' | 'colon' | 'comma_or_close' | 'key' = 'value';

            let lastKeyStart = -1;
            let lastValueStart = -1;

            for (let i = 0; i < jsonStr.length; i++) {
              const char = jsonStr[i];

              if (inString) {
                if (isEscaped) {
                  repaired += char;
                  isEscaped = false;
                } else if (char === '\\') {
                  repaired += char;
                  isEscaped = true;
                } else if (char === '\n') {
                  repaired += '\\n';
                } else if (char === '\r') {
                  repaired += '\\r';
                } else if (char === '\t') {
                  repaired += '\\t';
                } else if (char === '"') {
                  let nextNonWs = '';
                  for (let j = i + 1; j < jsonStr.length; j++) {
                    if (!/\s/.test(jsonStr[j])) {
                      nextNonWs = jsonStr[j];
                      break;
                    }
                  }

                  let isClosing = false;
                  if (expect === 'key' || expect === 'key_or_close') {
                    if (nextNonWs === ':') {
                      isClosing = true;
                    }
                  } else {
                    if (nextNonWs === '}' || nextNonWs === ']' || nextNonWs === '') {
                      isClosing = true;
                    } else if (nextNonWs === ',') {
                      let nextAfterComma = '';
                      const commaIdx = jsonStr.indexOf(',', i + 1);
                      if (commaIdx !== -1) {
                        for (let j = commaIdx + 1; j < jsonStr.length; j++) {
                          if (!/\s/.test(jsonStr[j])) {
                            nextAfterComma = jsonStr[j];
                            break;
                          }
                        }
                      }
                      const parent = contextStack[contextStack.length - 1];
                      if (parent === 'object') {
                        if (commaIdx !== -1) {
                          const remaining = jsonStr.slice(commaIdx + 1).trim();
                          if (remaining === '' || remaining.startsWith('}') || /^"[a-zA-Z0-9_]+"\s*:/.test(remaining)) {
                            isClosing = true;
                          }
                        } else {
                          isClosing = true;
                        }
                      } else if (parent === 'array') {
                        if (nextAfterComma === '' || nextAfterComma === ']' || /["\d\-\{\[tfn]/.test(nextAfterComma)) {
                          isClosing = true;
                        }
                      } else {
                        isClosing = true;
                      }
                    }
                  }

                  if (isClosing) {
                    inString = false;
                    repaired += char;
                    if (expect === 'key' || expect === 'key_or_close') {
                      expect = 'colon';
                    } else {
                      expect = 'comma_or_close';
                    }
                  } else {
                    repaired += '\\"';
                  }
                } else {
                  repaired += char;
                }
              } else {
                if (char === '"') {
                  inString = true;
                  if (expect === 'key' || expect === 'key_or_close') {
                    lastKeyStart = repaired.length;
                  } else {
                    lastValueStart = repaired.length;
                  }
                  repaired += char;
                } else if (char === '{') {
                  contextStack.push('object');
                  expect = 'key_or_close';
                  lastValueStart = repaired.length;
                  repaired += char;
                } else if (char === '[') {
                  contextStack.push('array');
                  expect = 'value_or_close';
                  lastValueStart = repaired.length;
                  repaired += char;
                } else if (char === '}') {
                  if (contextStack[contextStack.length - 1] === 'object') {
                    contextStack.pop();
                    expect = contextStack.length === 0 ? 'value' : 'comma_or_close';
                  }
                  repaired += char;
                } else if (char === ']') {
                  if (contextStack[contextStack.length - 1] === 'array') {
                    contextStack.pop();
                    expect = contextStack.length === 0 ? 'value' : 'comma_or_close';
                  }
                  repaired += char;
                } else if (char === ':') {
                  if (expect === 'colon') {
                    expect = 'value';
                  }
                  repaired += char;
                } else if (char === ',') {
                  const currentContext = contextStack[contextStack.length - 1];
                  if (currentContext === 'object') {
                    expect = 'key';
                  } else if (currentContext === 'array') {
                    expect = 'value';
                  }
                  repaired += char;
                } else {
                  if (!/\s/.test(char)) {
                    if (expect === 'value' || expect === 'value_or_close') {
                      lastValueStart = repaired.length;
                    }
                  }
                  repaired += char;
                }
              }
            }

            if (inString) {
              repaired += '"';
              if (expect === 'key' || expect === 'key_or_close') {
                expect = 'colon';
              } else {
                expect = 'comma_or_close';
              }
            }

            if (expect === 'colon' && lastKeyStart !== -1) {
              repaired = repaired.slice(0, lastKeyStart).trimEnd();
              if (repaired.endsWith(',')) {
                repaired = repaired.slice(0, -1).trimEnd();
              }
              expect = 'comma_or_close';
            }

            if (expect === 'value') {
              const currentContext = contextStack[contextStack.length - 1];
              if (currentContext === 'object') {
                if (lastKeyStart !== -1) {
                  repaired = repaired.slice(0, lastKeyStart).trimEnd();
                  if (repaired.endsWith(',')) {
                    repaired = repaired.slice(0, -1).trimEnd();
                  }
                }
              } else if (currentContext === 'array') {
                const lastComma = repaired.lastIndexOf(',');
                if (lastComma !== -1 && lastComma >= repaired.length - 5) {
                  repaired = repaired.slice(0, lastComma).trimEnd();
                }
              }
            }

            repaired = repaired.trimEnd();
            if (repaired.endsWith(',')) {
              repaired = repaired.slice(0, -1).trimEnd();
            }

            while (contextStack.length > 0) {
              const open = contextStack.pop();
              if (open === 'object') {
                repaired += '}';
              } else if (open === 'array') {
                repaired += ']';
              }
            }

            return repaired;
        };

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = repairJson(responseText);
        let generatedContent;

        try {
            const parsed = JSON.parse(cleanText);

            // Construct MINIGAME portion
            const correctAns = parsed.reto_gameplay?.datos_config?.respuesta_correcta || "Correcto";
            const distractors = parsed.reto_gameplay?.datos_config?.opciones_distractor || ["Opción A", "Opción B", "Opción C"];
            const allOptions = [correctAns, ...distractors.slice(0, 3)];
            for (let i = allOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
            }

            const miniGame = {
                type: "multiple_choice",
                question: parsed.reto_gameplay?.datos_config?.pregunta || "¿Estás listo?",
                options: allOptions,
                correctAnswer: correctAns,
                feedbackSuccess: "¡Correcto! Excelente análisis.",
                feedbackError: parsed.reto_gameplay?.datos_config?.feedback_error || "Revisa la teoría de nuevo."
            };

            // Construct NOTEBOOK/EVIDENCE portion
            const evidenciaEjemplos = parsed.instruccion_evidencia?.ejemplos_resolucion || "";
            const practiceProblem = {
                statement: `**📝 INSTRUCCIÓN (LIBRETA):**\n${parsed.instruccion_evidencia?.instruccion_fiel}`,
                correctValue: `${parsed.instruccion_evidencia?.valor_esperado_docente || "Evidencia completada"}${evidenciaEjemplos ? `\n\nEJEMPLO RESUELTO:\n${evidenciaEjemplos}` : ""}`,
                hint: parsed.oraculo_teoria?.tip_clave || "Recuerda revisar tus apuntes.",
                tipo_evidencia_requerida: parsed.instruccion_evidencia?.tipo_evidencia_requerida || "FOTO_TEXTO"
            };

            // Combine based on day type
            let legacyContent: any = {};

            if (day.type === "concept_story" || day.type === "guided_practice") {
                legacyContent = {
                    explanation: {
                        chunks: [parsed.oraculo_teoria?.contenido_html || "Lee la teoría cuidadosamente."],
                        analogy: parsed.oraculo_teoria?.tip_clave || "Recuerda el concepto principal."
                    },
                    miniGame: miniGame,
                    practiceProblem: practiceProblem
                };
            } else if (day.type === "boss_fight") {
                legacyContent = {
                    originalProblemText: `** RETO FINAL:**\n${parsed.instruccion_evidencia?.instruccion_fiel} \n\n * Nota de Cierre: ${parsed.cierre_metacognicion}* `,
                    tipo_evidencia_requerida: parsed.instruccion_evidencia?.tipo_evidencia_requerida || "TEXTO_ENSAYO",
                    solvedVariations: []
                };
            }

            generatedContent = {
                narrative: `${parsed.historia_inicio} \n\n### ${parsed.oraculo_teoria?.titulo} \n\n${parsed.oraculo_teoria?.contenido_html} `,
                content: legacyContent,
                pda_objetivo: parsed.pda_objetivo,
                cierre_metacognicion: parsed.cierre_metacognicion,
                glosario: parsed.glosario || [],
                presentationType: parsed.presentationType || "text",
                isFinalBoss: isFinalBoss === true,
                lecturas_sugeridas: sanitizeSuggestedReadings(parsed.lecturas_sugeridas || [], relevantPages)
            };

        } catch (parseError) {
            console.error("Failed to parse generate-day JSON. Attempting fallback...", parseError);
            generatedContent = {
                narrative: "La actividad técnica no pudo ser procesada, por favor revisa el material físico docente.",
                content: day.type === "concept_story" ? { explanation: { chunks: ["Reflexiona sobre lo aprendido."], analogy: "El aprendizaje es un viaje infinito." } }
                    : day.type === "guided_practice" ? { practiceProblem: { statement: "Resuelve el acertijo final en tu cuaderno.", correctValue: "Revisar cuaderno", hint: "Confía en tu intuición matemática." } }
                        : { originalProblemText: "Completa el reto final escrito en el pizarrón.", solvedVariations: [] },
                lecturas_sugeridas: []
            };
        }

        return NextResponse.json(generatedContent);

    } catch (error: any) {
        console.error('Error generating single day:', error.stack || error);
        return NextResponse.json({ error: 'Failed to generate day content', details: error.message }, { status: 500 });
    }
}

function sanitizeSuggestedReadings(aiReadings: any[], verifiedPages: any[]) {
  if (!Array.isArray(aiReadings) || !Array.isArray(verifiedPages) || verifiedPages.length === 0) {
    return [];
  }
  
  const sanitized: any[] = [];
  
  for (const item of aiReadings) {
    if (!item) continue;
    
    const match = verifiedPages.find(p => {
      const pageNumMatch = Number(p.pageNumber) === Number(item.pagina || item.pageNumber || item.page);
      
      const itemPdf = item.pdfUrl || item.pdf || item.url || '';
      const pdfMatch = p.pdfUrl && itemPdf && p.pdfUrl.toLowerCase().trim() === itemPdf.toLowerCase().trim();
      
      const itemLibro = item.libro || item.book || item.bookTitle || '';
      const titleMatch = p.bookTitle && itemLibro && p.bookTitle.toLowerCase().replace(/[^a-z0-9]/g, '') === itemLibro.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      return pageNumMatch && (pdfMatch || titleMatch);
    });
    
    if (match) {
      sanitized.push({
        libro: match.bookTitle,
        pagina: Number(match.pageNumber),
        tema: item.tema || match.snippet || "Lectura de apoyo",
        pdfUrl: match.pdfUrl
      });
    }
  }
  
  return sanitized;
}
