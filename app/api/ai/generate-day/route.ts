import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { day, pedagogy, theme, documentText, previousGrade, isFinalBoss, vocabularyLevel } = await req.json();

        if (!day || !pedagogy) {
            return NextResponse.json({ error: 'Faltan datos requeridos (day, pedagogy)' }, { status: 400 });
        }

        console.log(`Generating narrative for Day ${day.dayNumber}: ${day.title}...`);

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
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

        // Custom prompt per day type
        const prompt = `
# ROL
Eres un Diseñador Instruccional Senior especializado en la Nueva Escuela Mexicana (NEM), con maestría en Tecnología Educativa. Tu trabajo es crear experiencias de aprendizaje digitales autónomas de calidad profesional.

# ${vocabPrompt}

# DATOS DE ENTRADA
- TÍTULO DE LA SESIÓN: ${day.title || pedagogy.topic}
- CONTENIDO PEDAGÓGICO: ${day.session_start || documentText?.substring(0, 800) || "Sin contenido previo."}
- FASE ESCOLAR: ${pedagogy.grade || "Fase General"}
- PDA (Proceso de Desarrollo de Aprendizaje): ${pedagogy.pda || "PDA General"}
- TIPO DE NIVEL: ${day.type || "concept_story"}
- NÚMERO DE NIVEL: ${day.dayNumber}

# INSTRUCCIONES DE CALIDAD PROFESIONAL

## 1. NARRATIVA DE APERTURA (historia_inicio)
Escribe un párrafo envolvente (80-120 palabras) que:
- Conecte con la vida cotidiana del alumno
- Presente una situación problema o pregunta detonadora real
- Use vocabulario accesible pero preciso
- NO uses elementos de fantasía a menos que la planeación los mencione

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

# FORMATO DE SALIDA (JSON estricto):
{
  "nivel_id": "${day.dayNumber}",
  "pda_objetivo": "Descripción breve del PDA que se trabaja",
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


        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = responseText.replace(/\`\`\`json/gi, '').replace(/\`\`\`/gi, '').trim();
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
                isFinalBoss: isFinalBoss === true
            };

        } catch (parseError) {
            console.error("Failed to parse generate-day JSON. Attempting fallback...", parseError);
            generatedContent = {
                narrative: "La actividad técnica no pudo ser procesada, por favor revisa el material físico docente.",
                content: day.type === "concept_story" ? { explanation: { chunks: ["Reflexiona sobre lo aprendido."], analogy: "El aprendizaje es un viaje infinito." } }
                    : day.type === "guided_practice" ? { practiceProblem: { statement: "Resuelve el acertijo final en tu cuaderno.", correctValue: "Revisar cuaderno", hint: "Confía en tu intuición matemática." } }
                        : { originalProblemText: "Completa el reto final escrito en el pizarrón.", solvedVariations: [] }
            };
        }

        return NextResponse.json(generatedContent);

    } catch (error: any) {
        console.error('Error generating single day:', error.stack || error);
        return NextResponse.json({ error: 'Failed to generate day content', details: error.message }, { status: 500 });
    }
}
