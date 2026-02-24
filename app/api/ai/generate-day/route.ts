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
    Eres un "Súper Maestro" increíblemente carismático, empático y experto en contar historias. Eres especialista en diseño instruccional y gamificación.
    
    Debes generar el contenido de UNA SOLA SESIÓN para una aventura interactiva con temática "${theme}".
    Tema Principal a Trabajar: ${pedagogy.topic}
    Aprendizaje Esperado (PDA): ${pedagogy.pda}
    Grado Objetivo: ${pedagogy.grade || "Educación Básica"}
    
    Información de la Sesión a generar:
    Día: ${day.dayNumber}
    Título de la Sesión: "${day.title}"
    Tipo de Actividad: ${day.type}
    
    Contexto original de la planeación docente:
    --- INICIO EXTRACTO ---
    ${isDemo ? "Este es un ejercicio de fracciones básicas." : (documentText ? documentText.substring(0, 15000) : "No hay contexto disponible, básate en el título de la sesión.")}
    --- FIN EXTRACTO ---
    
    REGLA PEDAGÓGICA Y DE TONO ESTRICTA (¡CRUCIAL!):
    1. TONO MAGISTRAL: Eres un "Súper Maestro" platicando directamente con el alumno de forma amigable, emocionante y como si le estuvieras contando un cuento inmersivo. El juego es 100% autogestionable por el alumno.
    2. SÚPER ENTENDIBLE: Adapta el lenguaje, tono y vocabulario para que sea AÚN MÁS FÁCIL y comprensible de lo que sugiere el grado escolar (${pedagogy.grade || "niños"}). Usa metáforas cotidianas, analogías simples y explicaciones paso a paso. ¡No asumas que ya saben el tema!
    3. FLUJO DIDÁCTICO (INICIO, DESARROLLO, CIERRE): Tu historia o narrativa debe estructurarse implícitamente en:
       - INICIO: Enganche emocionante, saludo del súper maestro y planteamiento del conflicto en la aventura.
       - DESARROLLO: Explicación del concepto o tema (buscando lograr el PDA) de forma clarísima y digerible.
       - CIERRE: Preparar al estudiante para el ejercicio práctico final o dejar la enseñanza clara como evidencia de aprendizaje.
    4. CONTEXTUALIZACIÓN: Los problemas o retos deben estar 100% integrados en la historia elegida (nada de problemas genéricos desconectados del tema).

    REGLA DE PREGUNTAS Y EJERCICIOS:
    - Al formular el problema o actividad práctica ("practiceProblem", "evidenceProblem", "miniGame" o "originalProblemText"), sé muy claro y fácil de entender.
    - OBLIGATORIO PARA PRÁCTICA GUIADA (guided_practice): El "practiceProblem" y el "evidenceProblem" DEBEN SER DOS PROBLEMAS TOTALMENTE DIFERENTES. El primero es guiado y el segundo es un reto extra para su libreta.
    - OBLIGATORIO PARA JEFES FINALES (boss_fight): El "originalProblemText" NO puede ser solo una historia. DEBE incluir obligatoriamente el planteamiento de un problema, reto o pregunta que requiera aplicar todo lo aprendido en el mapa. Termina el texto con una indicación clara sobre qué calcular, deducir o resolver.
    - Formula SIEMPRE UNA SOLA PREGUNTA DIRECTA en los problemas prácticos.
    - ESTRICTAMENTE PROHIBIDO crear sub-incisos múltiples (por ejemplo, nada de "Pregunta 1a, Pregunta 1b, Problema 2a").
    
    REGLA DE PERSONALIZACIÓN Y FORMATO:
    - Dirígete al niño usando EXPLÍCITAMENTE la etiqueta \`[NOMBRE_DEL_ESTUDIANTE]\` varias veces a lo largo de tu "plática".
    - FORMATEA rigurosamente usando MARKDOWN (Listas con viñetas, **Negritas** para resaltar conceptos y números clave, saltos de línea claros).
    
    REGLA DE ILUSTRACIÓN (MAGIA VISUAL):
    - OBLIGATORIO: En tu resultado debes incluir al menos 2 IMÁGENES dinámicas en formato Markdown para ilustrar el escenario.
    - Formato exacto: \`![Descripción en español](https://image.pollinations.ai/prompt/tu%20prompt%20descriptivo%20en%20ingles%20cute%202d%20kids%20game%20art?width=800&height=400)\`
    - Recuerda incluir una al principio para el "Inicio" y otra en el "Desarrollo" para explicar el concepto visualmente.

    INSTRUCCIONES CLAVES:
    Platícale esta sesión al estudiante como un Súper Maestro contando un gran cuento de aventuras, asegurando que el ejercicio sea claro y que logre el aprendizaje propuesto (PDA).
    
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
