import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { LevelContent } from '@/types/learning-world';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkUserSubscriptionAccess } from '@/lib/subscription';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any).id;
        const schoolId = (session.user as any).schoolId;

        const subCheck = await checkUserSubscriptionAccess(userId, schoolId);
        if (!subCheck.allowed) {
            return NextResponse.json({ error: subCheck.reason, subscriptionExpired: true }, { status: 402 });
        }

        const { worldId, levelId } = await req.json();

        if (!worldId || levelId === undefined) {
            return NextResponse.json({ error: 'Faltan parametros worldId o levelId' }, { status: 400 });
        }

        if (!process.env.AI_API_KEY) {
            return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
        }

        const world = await prisma.world.findUnique({ where: { id: worldId } });
        if (!world) return NextResponse.json({ error: 'Mundo no encontrado' }, { status: 404 });

        let days: LevelContent[] = [];
        try { days = JSON.parse(world.daysJson); }
        catch { return NextResponse.json({ error: 'Error parseando daysJson' }, { status: 500 }); }

        const dayIndex = days.findIndex(d => d.dayNumber === levelId);
        if (dayIndex === -1) return NextResponse.json({ error: 'Nivel no encontrado' }, { status: 404 });

        const day = days[dayIndex] as any;

        // Si ya fue generado, retornar sin volver a llamar a la IA
        if (!day.isGenerating) {
            return NextResponse.json({ message: 'El nivel ya estaba generado', day });
        }

        // Recopilar informacion pedagogica completa del nivel
        const pdaObjetivo  = day.pda_objetivo       || day.title || '';
        const sessionStart = day.session_start       || day.title || '';
        const sessionDev   = day.session_development || '';
        const sessionEnd   = day.session_end         || '';
        const grade        = day.grade               || world.theme || '';
        const levelType    = day.type                || 'guided_practice';

        // Adaptar lenguaje al grado
        const isSecundaria = grade.toLowerCase().includes('secund') ||
            grade.toLowerCase().includes('fase 6') ||
            /^[123]°\s*secund/i.test(grade);

        const languageInstruction = isSecundaria
            ? `NIVEL DE LENGUAJE: Secundaria (${grade}). Usa vocabulario tecnico-curricular. Explicaciones rigurosas y precisas.`
            : `NIVEL DE LENGUAJE: Primaria (${grade}). Oraciones cortas, palabras simples, analogias del hogar, emojis ocasionales (🌟💡📖). Sin tecnicismos.`;

        console.log(`[RICH CONTENT] World ${worldId} | Level ${levelId} | Grade: ${grade}`);

        const prompt = `
Eres un Disenador Instruccional Senior de la Nueva Escuela Mexicana (NEM). Genera un nivel COMPLETO Y AUTOSUFICIENTE: el alumno aprende solo, sin el docente.

DATOS PEDAGOGICOS:
- GRADO: ${grade}
- PDA A ALCANZAR: "${pdaObjetivo}"
- TIPO DE NIVEL: ${levelType}
- SESION INICIO: ${sessionStart}
- SESION DESARROLLO: ${sessionDev}
- SESION CIERRE: ${sessionEnd}

${languageInstruction}

REGLAS ABSOLUTAS:
1. AUTONOMIA: PROHIBIDO "El docente...", "Pide a tu maestro...", "Se te entregara...". Si el docente hace algo en la sesion, TU lo haces en el nivel.
2. ORACULO (min 400 palabras): Es el libro virtual del alumno. Usa ## subtitulos, - listas, **negritas**. Incluye el concepto completo, ejemplos concretos dentro del texto y una analogia cotidiana.
3. SEPARACION ESTRICTA: oraculo_teoria solo explica. instruccion_fiel NUNCA repite la teoria, es un EJERCICIO NUEVO.
4. EJERCICIO LIBRETA: actividad fisica para cuaderno, basada en el DESARROLLO de la sesion.
5. SIN HTML. Solo Markdown y saltos de linea con \\n\\n.

DEVUELVE UNICAMENTE ESTE JSON (sin texto extra, sin comentarios):
{
  "historia_inicio": "Narrativa inmersiva de 3-5 oraciones...",
  "oraculo_teoria": {
    "titulo": "Titulo motivador del tema",
    "contenido_markdown": "Explicacion COMPLETA minimo 400 palabras. ## Subtitulos. **Negritas**. - Listas. Ejemplos resueltos dentro del texto. Analogia cotidiana al final.",
    "tip_clave": "Una sola frase que resume lo mas importante"
  },
  "ejemplos_resueltos": [
    { "problema": "Ejemplo 1 enunciado", "solucion": "Solucion paso a paso del ejemplo 1" },
    { "problema": "Ejemplo 2 distinto al 1", "solucion": "Solucion paso a paso del ejemplo 2" }
  ],
  "glosario": [
    { "palabra": "termino1", "definicion": "definicion en 1-2 oraciones simples" },
    { "palabra": "termino2", "definicion": "definicion en 1-2 oraciones simples" },
    { "palabra": "termino3", "definicion": "definicion en 1-2 oraciones simples" }
  ],
  "ejercicio_libreta": {
    "instruccion": "Instruccion especifica para el cuaderno. Que escribir/dibujar/calcular exactamente.",
    "tipo": "OPERACION"
  },
  "reto_gameplay": {
    "instruccion_fiel": "Reto NUEVO en pantalla. NO repetir teoria. Problema practico diferente a los ejemplos.",
    "respuesta_correcta": "Respuesta exacta o rubrica detallada.",
    "tipo_evidencia_requerida": "FOTO_FISICA",
    "opciones": []
  },
  "cierre_metacognicion": "Pregunta de reflexion para conectar lo aprendido con la vida del alumno."
}

ejercicio_libreta.tipo: OPERACION | REDACCION | DIBUJO | TABLA | INVESTIGACION | EXPERIMENTO
tipo_evidencia_requerida: FOTO_FISICA | TEXTO_DIGITAL | MULTIPLE_CHOICE (si MULTIPLE_CHOICE, "opciones" tiene 4 strings)
`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: { temperature: 0.25 }
        });

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();

        let aiData: any = {};
        try {
            aiData = JSON.parse(responseText);
        } catch {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                try { aiData = JSON.parse(match[0]); }
                catch { return NextResponse.json({ error: 'AI returned malformed JSON', raw: responseText }, { status: 500 }); }
            } else {
                return NextResponse.json({ error: 'AI returned malformed JSON', raw: responseText }, { status: 500 });
            }
        }

        const oraculoTitle    = aiData.oraculo_teoria?.titulo             || 'Teoria';
        const oraculoContent  = aiData.oraculo_teoria?.contenido_markdown || '';
        const tipClave        = aiData.oraculo_teoria?.tip_clave           || '';
        const ejemplos        = Array.isArray(aiData.ejemplos_resueltos)   ? aiData.ejemplos_resueltos : [];
        const glosario        = Array.isArray(aiData.glosario)             ? aiData.glosario           : [];
        const ejercicioLibreta = aiData.ejercicio_libreta                  || null;

        const oraculoFull = `### ${oraculoTitle}\n\n${oraculoContent}${tipClave ? `\n\n💡 **Tip clave:** ${tipClave}` : ''}`;

        const tipoEvidencia =
            aiData.reto_gameplay?.tipo_evidencia_requerida === 'FOTO_FISICA'     ? 'FOTO_DIBUJO'    :
            aiData.reto_gameplay?.tipo_evidencia_requerida === 'TEXTO_DIGITAL'   ? 'TEXTO_ENSAYO'   :
            aiData.reto_gameplay?.tipo_evidencia_requerida === 'MULTIPLE_CHOICE' ? 'MULTIPLE_CHOICE': 'TEXTO_ENSAYO';

        const mappedContent = {
            ...day,
            narrative: aiData.historia_inicio || day.narrative || '(Historia)',
            content: {
                ...day.content,
                practiceProblem: {
                    ...day.content?.practiceProblem,
                    statement: JSON.stringify({
                        oraculo_teoria:    oraculoFull,
                        ejemplos_resueltos: ejemplos,
                        ejercicio_libreta:  ejercicioLibreta,
                        instruccion_fiel:   aiData.reto_gameplay?.instruccion_fiel || '',
                        cierre:             aiData.cierre_metacognicion || ''
                    }),
                    tipo_evidencia_requerida: tipoEvidencia,
                    options:      aiData.reto_gameplay?.opciones  || [],
                    correctValue: aiData.reto_gameplay?.respuesta_correcta || 'Rubrica no generada',
                    hint: tipClave || ''
                }
            },
            glosario:          glosario,
            ejercicio_libreta: ejercicioLibreta,
            isGenerating:      false
        };

        days[dayIndex] = mappedContent;

        await prisma.world.update({
            where: { id: worldId },
            data:  { daysJson: JSON.stringify(days) }
        });

        return NextResponse.json({ message: 'Day generated', day: mappedContent });

    } catch (error: any) {
        console.error('Error generating level content:', error);
        return NextResponse.json({ error: error.message || 'Error occurred' }, { status: 500 });
    }
}
