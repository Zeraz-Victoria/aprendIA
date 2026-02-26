import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { day, pedagogy, theme, documentText, previousGrade, isFinalBoss } = await req.json();

        if (!day || !pedagogy) {
            return NextResponse.json({ error: 'Faltan datos requeridos (day, pedagogy)' }, { status: 400 });
        }

        console.log(`Generating narrative for Day ${day.dayNumber}: ${day.title}...`);

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
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

        // Custom prompt per day type
        const prompt = `
# ROL Y DIRECTIVA SOBERANA
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:
Actúa como un Diseñador Instruccional Senior y Arquitecto de Software Educativo especializado en la NEM. Tu única función es convertir los FRAGMENTOS FIELES de una sesión en un nivel interactivo de aprendizaje autónomo.

# ENTRADA DE DATOS (FRAGMENTO SAGRADO):
Utiliza exclusivamente la información contenida en este objeto:
- TÍTULO: ${day.title || pedagogy.topic}
- INICIO: ${day.session_start || documentText?.substring(0, 500) || "Sin inicio previo."}
- DESARROLLO: ${day.session_development || pedagogy.pda || "Sin desarrollo previo."}
- CIERRE: ${day.session_end || "Evaluación general del tema."}
- FASE: ${pedagogy.grade || "Fase General"}
- PDA: ${pedagogy.pda || "PDA General"}

# INSTRUCCIONES DE CONSTRUCCIÓN (PROHIBIDO INVENTAR):
1. NARRATIVA DE ENTRADA (MOMENTO 1): Transcribe el contenido de 'INICIO' para situar al alumno. Si el docente planteó un problema inicial o una pregunta detonadora, esa es la introducción del nivel.
2. EL ORÁCULO (AULA INVERTIDA): Genera un bloque de teoría lúdica y técnica que explique el concepto necesario para resolver la actividad de 'DESARROLLO'. El alumno debe poder aprenderlo solo leyendo este bloque.
3. DESAFÍO TÉCNICO (MOMENTO 2): Convierte la actividad de 'DESARROLLO' en el reto central. 
   - Si el docente pide resolver una operación, el reto es esa operación.
   - Si el docente pide redactar un texto, el reto es esa redacción.
   - Selecciona el componente UI: LOGIC_PUZZLE, TEXT_MASTER, CONCEPT_SORT o TRIVIA_QUEST.
4. VALIDACIÓN Y CIERRE (MOMENTO 3): Usa el contenido de 'CIERRE' para la reflexión final o la pregunta de autoevaluación.

# REGLAS DE ORO:
- Dirígete al estudiante como [NOMBRE_DEL_ESTUDIANTE].
- FEEDBACK SOCRÁTICO: Si el alumno falla, genera una pregunta que lo guíe de vuelta a la teoría del Oráculo.
- No agregues elementos de fantasía (piratas, magos) a menos que la planeación original los mencione.
- GLOSARIO: Extrae entre 2 y 4 palabras complejas usadas en el oráculo y defínelas de forma simple.
${adaptiveRescuePrompt}

# FORMATO DE SALIDA (JSON CRUDO):
{
  "nivel_id": "${day.dayNumber}",
  "pda_objetivo": "...",
  "historia_inicio": "...",
  "oraculo_teoria": { "titulo": "...", "contenido_html": "...", "tip_clave": "..." },
  "reto_gameplay": {
    "tipo_ui": "LOGIC_PUZZLE|TEXT_MASTER|CONCEPT_SORT|TRIVIA_QUEST",
    "tipo_evidencia_requerida": "FOTO_DIBUJO | FOTO_GRAFICA | TEXTO_ENSAYO | MULTIPLE_CHOICE",
    "instruccion_fiel": "...",
    "datos_config": { "pregunta": "...", "respuesta_correcta": "...", "pista_socratica": "..." }
  },
  "cierre_metacognicion": "...",
  "glosario": [
    { "palabra": "concepto", "definicion": "definición fácil de entender" }
  ]
}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        let generatedContent;

        try {
            const parsed = JSON.parse(cleanText);

            // Map the new "Fidelidad NEM 1.0" Instructional Designer template back to what the frontend expects
            let legacyContent: any = {};

            if (day.type === "concept_story") {
                // Usually theory + minigame
                legacyContent = {
                    explanation: {
                        chunks: [parsed.oraculo_teoria?.contenido_html || "Lee la teoría cuidadosamente."],
                        analogy: parsed.oraculo_teoria?.tip_clave || "Recuerda el concepto principal."
                    },
                    miniGame: {
                        type: "multiple_choice",
                        question: parsed.reto_gameplay?.datos_config?.pregunta || parsed.reto_gameplay?.instruccion_fiel,
                        options: [parsed.reto_gameplay?.datos_config?.respuesta_correcta, "Revisar Teoría", "Volver a Leer"],
                        correctAnswer: parsed.reto_gameplay?.datos_config?.respuesta_correcta,
                        feedbackSuccess: "¡Correcto! Excelente análisis.",
                        feedbackError: parsed.reto_gameplay?.datos_config?.pista_socratica || "Revisa la lectura anterior."
                    }
                };
            } else if (day.type === "guided_practice") {
                // Practice challenge
                legacyContent = {
                    practiceProblem: {
                        statement: `**INSTRUCCIÓN:** ${parsed.reto_gameplay?.instruccion_fiel}\n\n**RETO:** ${parsed.reto_gameplay?.datos_config?.pregunta}`,
                        correctValue: parsed.reto_gameplay?.datos_config?.respuesta_correcta || "Completado",
                        hint: parsed.reto_gameplay?.datos_config?.pista_socratica || parsed.oraculo_teoria?.tip_clave || "Analiza los datos dados.",
                        tipo_evidencia_requerida: parsed.reto_gameplay?.tipo_evidencia_requerida || "TEXTO_ENSAYO"
                    }
                };
            } else if (day.type === "boss_fight") {
                // Boss evaluation
                legacyContent = {
                    originalProblemText: `**RETO FINAL:**\n${parsed.reto_gameplay?.instruccion_fiel}\n\n${parsed.reto_gameplay?.datos_config?.pregunta}\n\n*Nota de Cierre: ${parsed.cierre_metacognicion}*`,
                    tipo_evidencia_requerida: parsed.reto_gameplay?.tipo_evidencia_requerida || "TEXTO_ENSAYO",
                    solvedVariations: []
                };
            }

            generatedContent = {
                narrative: `${parsed.historia_inicio}\n\n### ${parsed.oraculo_teoria?.titulo}\n\n${parsed.oraculo_teoria?.contenido_html}`,
                content: legacyContent,
                pda_objetivo: parsed.pda_objetivo,
                cierre_metacognicion: parsed.cierre_metacognicion,
                glosario: parsed.glosario || [],
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
