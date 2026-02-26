import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { day, pedagogy, theme, documentText } = await req.json();

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

        // Custom prompt per day type
        let outputFormat = "";
        if (day.type === "concept_story") {
            outputFormat = `
        La salida JSON debe tener exactamente esta estructura:
        {
            "narrative": "Escribe una historia inmersiva, emocionante, amplia y perfecta (mínimo 2 párrafos completos) que introduzca el tema al niño. No escatimes en descripciones.",
            "content": {
                "explanation": {
                    "chunks": ["Explicación detallada 1 de la teoría matemática", "Explicación detallada 2", "Explicación detallada 3"],
                    "analogy": "Una analogía muy descriptiva para entender el concepto matemático"
                },
                "miniGame": {
                    "type": "word_search", // O "memory_match" alternando al azar
                    "words": ["FRACCION", "NUMERADOR", "DENOMINADOR", "MITAD", "ENTERO"], // 5-8 palabras si es word_search (MÁXIMO 10 letras cada una, SIN ESPACIOS, SIN ACENTOS). Si usas memory_match ignora 'words'.
                    "pairs": [ // Solo si es memory_match, pares concepto-definición cortos (ignora esto si es word_search)
                        {"concept": "Numerador", "definition": "Partes que tomamos"}, 
                        {"concept": "Denominador", "definition": "En cuántas partes se divide"}
                    ],
                    "feedbackSuccess": "¡Excelente!",
                    "feedbackError": "Revisa bien."
                }
            }
        }`;
        } else if (day.type === "guided_practice") {
            outputFormat = `
        La salida JSON debe tener exactamente esta estructura:
        {
            "narrative": "Escribe una historia de acción y aventura extensa (mínimo 2 párrafos) donde el niño debe superar un reto matemático para avanzar. No escatimes en emoción.",
            "content": {
                "practiceProblem": {
                    "statement": "El primer reto o problema guiado que el niño resolverá interactivamente paso a paso",
                    "correctValue": "La respuesta correcta exacta",
                    "hint": "Una pista extensa que guíe al niño pero sin darle la respuesta"
                },
                "evidenceProblem": {
                    "statement": "Un SEGUNDO problema o reto DIFERENTE (pero del mismo tema) que el alumno deberá resolver por su cuenta en su libreta como tarea o evidencia final.",
                    "correctValue": "La respuesta correcta"
                }
            }
        }`;
        } else if (day.type === "boss_fight") {
            outputFormat = `
        La salida JSON debe tener exactamente esta estructura:
        {
            "narrative": "Escribe una historia climática y dramática (mínimo 2 párrafos completos) donde el niño se enfrenta al villano o jefe final. Usa un tono épico.",
            "content": {
                "originalProblemText": "ESTRICTAMENTE OBLIGATORIO: Aquí debes escribir UN RETO O PROBLEMA DE EVALUACIÓN COMPLEJO Y COMPLETO a resolver. Este problema DEBE integrar todo lo aprendido en las lecciones anteriores. Formula una pregunta directa y clara que el alumno debe responder o resolver para derrotar al jefe.",
                "solvedVariations": []
            }
        }`;
        }

        const prompt = `
# COMANDO DE REINICIO DE SISTEMA (HARD RESET)
A partir de este momento, el sistema opera bajo el protocolo "Fidelidad NEM 1.0".

# DIRECTIVA SOBERANA DE ALINEACIÓN
Actúa como un Motor de Transpiler Pedagógico y Arquitecto de Software para la Nueva Escuela Mexicana (NEM). Tu única función es transformar datos de planeaciones docentes en estructuras JSON para aprendizaje autónomo.

# REGLAS DE ORO DEL PROTOCOLO:
1. FUENTE ÚNICA DE VERDAD: El sistema solo puede procesar información extraída directamente de los archivos proporcionados. Queda estrictamente prohibido inventar actividades, temas o historias.
2. ESTRUCTURA RÍGIDA: Toda sesión debe descomponerse obligatoriamente en:
   - INICIO: Transcribe la actividad de apertura y genera la narrativa inicial inmersiva.
   - DESARROLLO: Diseña el reto central respetando la actividad técnica del docente.
   - CIERRE: Plantea el problema de reflexión o evidencia según la actividad de evaluación del docente.
3. MARCO CURRICULAR: Clasificación estricta en Fases 1 a 6 del Programa Sintético y aplicación de metodologías sociocríticas.
4. AULA INVERTIDA: Antes de cualquier reto, el sistema debe generar un "Oráculo" (Teoría de soporte, \`explanation\` section) basado en el contenido de la planeación para que el alumno aprenda solo.

# SEGMENTO DE PLANEACIÓN A PROCESAR:
TÍTULO O TEMA: ${day.title || pedagogy.topic}
EXTRACTO INICIO: """ ${day.session_start || documentText?.substring(0, 500) || "Sin inicio previo."} """
EXTRACTO DESARROLLO: """ ${day.session_development || pedagogy.pda || "Sin desarrollo previo."} """
EXTRACTO CIERRE: """ ${day.session_end || "Evaluación general del tema."} """

Basa la generación estrictamente en el segmento provisto.

${outputFormat}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        let generatedContent;

        try {
            generatedContent = JSON.parse(cleanText);
        } catch (parseError) {
            console.error("Failed to parse generate-day JSON. Attempting rescue...");
            try {
                let rescued = cleanText;
                if (rescued.lastIndexOf('"') > rescued.lastIndexOf('}')) {
                    rescued += '"';
                }
                rescued += '}}'; // Force close the standard structures
                rescued = rescued.replace(/,\s*([}\]])/g, '$1');
                generatedContent = JSON.parse(rescued);
            } catch (e) {
                // If rescue fails, use a fallback object so the kids can still play
                generatedContent = {
                    narrative: "La historia de esta misión sigue formándose en el cosmos. ¡Avanza con valentía!",
                    content: day.type === "concept_story" ? { explanation: { chunks: ["Reflexiona sobre lo aprendido."], analogy: "El aprendizaje es un viaje infinito." } }
                        : day.type === "guided_practice" ? { practiceProblem: { statement: "Resuelve el acertijo final en tu cuaderno.", correctValue: "Revisar cuaderno", hint: "Confía en tu intuición matemática." } }
                            : { originalProblemText: "Supera el Reto del Guardián.", solvedVariations: [] }
                };
            }
        }

        return NextResponse.json(generatedContent);

    } catch (error: any) {
        console.error('Error generating single day:', error.stack || error);
        return NextResponse.json({ error: 'Failed to generate day content', details: error.message }, { status: 500 });
    }
}
