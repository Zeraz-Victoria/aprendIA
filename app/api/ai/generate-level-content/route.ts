import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { LevelContent } from '@/types/learning-world';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { worldId, levelId } = await req.json();

        if (!worldId || levelId === undefined) {
            return NextResponse.json({ error: 'Faltan parámetros worldId o levelId' }, { status: 400 });
        }

        if (!process.env.AI_API_KEY) {
            return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
        }

        // 1. Fetch World from DB
        const world = await prisma.world.findUnique({
            where: { id: worldId }
        });

        if (!world) {
            return NextResponse.json({ error: 'Mundo no encontrado' }, { status: 404 });
        }

        let days: LevelContent[] = [];
        try {
            days = JSON.parse(world.daysJson);
        } catch {
            return NextResponse.json({ error: 'Error parseando daysJson' }, { status: 500 });
        }

        const dayIndex = days.findIndex(d => d.dayNumber === levelId);
        if (dayIndex === -1) {
            return NextResponse.json({ error: 'Nivel no encontrado en el mundo' }, { status: 404 });
        }

        const day = days[dayIndex];

        // If it's already generated, return early
        if (!(day as any).isGenerating) {
            return NextResponse.json({ message: 'El nivel ya estaba generado', day });
        }

        const sessionRawText = (day as any).session_start || day.title; // session_start contains the huge chunk from Epic 1

        console.log(`Generating content for World ${worldId}, Level ${levelId}...`);

        const prompt = `
Eres un Motor de Diseño Instruccional Autónomo. Tu objetivo es convertir un fragmento de planeación docente en una experiencia interactiva y directa para el alumno, DEVOLVIENDO ÚNICAMENTE UN JSON VÁLIDO.

CONTENIDO DE LA SESIÓN ORIGINAL (Extraído de la planeación):
---
${sessionRawText}
---

REGLAS DE ORO:
1. TRANSPILACIÓN DE ROL DOCENTE (AUTONOMÍA TOTAL): El alumno está solo frente a la pantalla. PROHIBIDO decir 'El docente leerá...', 'Pide a tu maestro...' o 'Se te entregarán...'.
   - Si la planeación dice 'El docente lee un cuento', TÚ redactas el cuento.
   - Si dice 'El docente entrega oraciones mudas', TÚ generas esas oraciones mudas y las pones en el reto.
   - Si dice 'El docente explica', TÚ asumes la voz y explicas el concepto en el 'oraculo_teoria'.
2. SEPARACIÓN ESTRICTA (CRÍTICO): El campo 'oraculo_teoria' es SOLO para explicar. El campo 'instruccion_fiel' TIENE PROHIBIDO repetir la teoría. Aquí DEBES INVENTAR un problema práctico, un ejercicio o una pregunta nueva para que el alumno lo resuelva y demuestre lo aprendido. NUNCA resumas la teoría aquí.
3. TIPO DE EVIDENCIA: Analiza qué producto físico o digital exige el docente y asigna uno de estos valores a 'tipo_evidencia_requerida': FOTO_FISICA, TEXTO_DIGITAL, MULTIPLE_CHOICE.
4. FORMATO LIMPIO: Usa \\n\\n para saltos de línea. PROHIBIDO usar etiquetas HTML (<br>, <p>, <b>).

FORMATO DE SALIDA ESPERADO (JSON ESTRICTO, SIN COMENTARIOS):
{
  "historia_inicio": "Texto narrativo inmersivo...",
  "oraculo_teoria": { 
    "titulo": "...", 
    "contenido_markdown": "Explicación directa al alumno actuando como su tutor..." 
  },
  "reto_gameplay": {
    "instruccion_fiel": "EJERCICIO NUEVO INVENTADO...",
    "respuesta_correcta": "LA RESPUESTA AL EJERCICIO INVENTADO...",
    "tipo_evidencia_requerida": "FOTO_FISICA",
    "opciones": ["Opcion 1", "Opcion 2", "Opcion 3", "Opcion 4"]
  },
  "cierre_metacognicion": "Pregunta de reflexión final."
}

INSTRUCCIÓN CRÍTICA PARA 'opciones': Esta llave DEBE contener un array de 4 strings con respuestas lógicas SOLO si 'tipo_evidencia_requerida' es 'MULTIPLE_CHOICE'. Si es otro tipo, devuelve un array vacío []. ¡ESTÁ ESTRICTAMENTE PROHIBIDO INCLUIR COMENTARIOS (//) EN TU RESPUESTA JSON!

INSTRUCCIÓN PARA RESPUESTA CORRECTA: Este campo es la RÚBRICA DEL MAESTRO. Si el reto incluye tablas, conteos, o varios pasos, tu respuesta DEBE contener el desglose exacto (ej. 'Puntos: 10, Comas: 6. Por lo tanto, el mayor es el punto'). Está PROHIBIDO dar respuestas de una sola palabra si el ejercicio requiere análisis físico.
`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.2, // Low temperature for consistent JSON layout
            }
        });

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();

        let aiData: any = {};
        try {
            aiData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse prompt JSON output", e, responseText);
            try {
                const match = responseText.match(/\\{[\\s\\S]*\\}/);
                if (match) aiData = JSON.parse(match[0]);
                else throw new Error("Regex JSON extraction failed");
            } catch (e2) {
                return NextResponse.json({ error: 'AI returned malformed JSON', raw: responseText }, { status: 500 });
            }
        }

        // Map AI output to `LevelContent`
        const mappedContent = {
            ...day,
            narrative: aiData.historia_inicio || "(Historia)",
            content: {
                ...(day as any).content,
                practiceProblem: {
                    ...(day as any).content?.practiceProblem,
                    statement: JSON.stringify({
                        oraculo_teoria: `### ${aiData.oraculo_teoria?.titulo || "Teoría"}\n\n${aiData.oraculo_teoria?.contenido_markdown || ""}`,
                        instruccion_fiel: aiData.reto_gameplay?.instruccion_fiel || "",
                        cierre: aiData.cierre_metacognicion || ""
                    }),
                    // Default to TEXTO_ENSAYO if the AI returns something foreign
                    tipo_evidencia_requerida: aiData.reto_gameplay?.tipo_evidencia_requerida === "FOTO_FISICA" ? "FOTO_DIBUJO" :
                        aiData.reto_gameplay?.tipo_evidencia_requerida === "TEXTO_DIGITAL" ? "TEXTO_ENSAYO" :
                            aiData.reto_gameplay?.tipo_evidencia_requerida === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "TEXTO_ENSAYO",
                    options: aiData.reto_gameplay?.opciones || [],
                    correctValue: aiData.reto_gameplay?.respuesta_correcta || "Respuesta de rúbrica no generada",
                    hint: ""
                }
            },
            isGenerating: false // Flag to mark it ready!
        };

        days[dayIndex] = mappedContent;

        // Save back to DB!
        await prisma.world.update({
            where: { id: worldId },
            data: { daysJson: JSON.stringify(days) }
        });

        return NextResponse.json({ message: 'Day generated', day: mappedContent });

    } catch (error: any) {
        console.error('Error generating level content:', error);
        return NextResponse.json({ error: error.message || 'Error occurred' }, { status: 500 });
    }
}
