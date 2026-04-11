import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { theme, topic, dificultad = "Básico", metodologia = "ABP", diagnostico = "Ninguno", sessionCount = 3, session_title, session_start, session_development, session_end, phase = "3" } = await req.json();

    if (!theme || !topic) {
      return NextResponse.json({ error: 'theme and topic are required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const schoolId = (session?.user as any)?.schoolId;

    if (schoolId) {
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      //@ts-ignore
      if (school && school.subscriptionStatus === 'SUSPENDED') {
        return NextResponse.json({ error: 'Tu cuenta ha sido suspendida. No puedes generar nuevos mapas de Aventura. Contacta a un administrador.' }, { status: 403 });
      }
    }

    if (!process.env.AI_API_KEY) {
      console.error("CRITICAL: AI_API_KEY is not defined");
      return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
    }

    console.log("=== AUTO-GENERATOR INIT ===");
    console.log("Payload:", { theme, topic, dificultad, metodologia });

    // Attempt to fetch from Cache first to save AI API tokens
    const cacheKeyTopic = `${topic.toLowerCase().trim()}_s${sessionCount}`;
    //@ts-ignore
    const cachedPrompt = await prisma.aIPromptCache.findUnique({
      where: {
        topic_theme: {
          topic: cacheKeyTopic,
          theme: theme.toLowerCase().trim()
        }
      }
    });

    if (cachedPrompt) {
      console.log(`[CACHE HIT] Returning cached map for Topic: ${topic} | Theme: ${theme}`);
      try {
        const parsedCached = JSON.parse(cachedPrompt.response);
        console.log("Successfully parsed cached response. Sending to frontend.");
        return NextResponse.json({
          id: crypto.randomUUID(),
          theme: theme,
          title: `Aventura de ${topic}`,
          days: parsedCached,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to parse cached response", e);
        // Fallthrough to regenerate if the cache is corrupt
      }
    }

    console.log(`[CACHE MISS] Generating new AI map for Topic: ${topic} | Theme: ${theme}`);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 65536, // Max for Gemini 2.5 Flash — required for 25 sessions × 6 rich chunks (~51K tokens)
        temperature: 0.4,
        responseMimeType: "application/json",
      }
    });

    const prompt = `
# PERFIL: DOCTOR EN PEDAGOGÍA Y ESPECIALISTA DE ÉLITE NEM 2022
Tu misión es transformar el tema matemático o problemática indicada en un proyecto de impacto social y una aventura gamificada.

# 1. DATOS DE ENTRADA:
- Tema / Problemática: ${topic}
- Diagnóstico de Aula: ${diagnostico}
- Metodología NEM: ${metodologia}
- Fase NEM: ${phase}
- Nivel de Complejidad: ${dificultad}
- Tema Visual para Gamificación: ${theme}
- Sesiones Requeridas: EXACTAMENTE ${sessionCount} sesiones progresivas.

# 2. INSTRUCCIONES DE CALIDAD (EL ESTÁNDAR DE EXCELENCIA):
- Debes generar una Planeación Didáctica Oficial (NEM 2022) con rigor doctoral.
- La planeación debe estar conectada a la Metodología solicitada (${metodologia}) y dividida en ${sessionCount} partes.
- Inmediatamente después, genera el "mapa_interactivo" que traduzca esta planeación rigurosa a un juego visual con la temática "${theme}".

# 3. REGLAS DE CONTENIDO TEÓRICO (CRÍTICO):
El campo "explanation.chunks" es el corazón de la experiencia de aprendizaje del alumno. Es OBLIGATORIO cumplir:
- Debes generar EXACTAMENTE 6 chunks (párrafos/secciones) de teoría POR SESIÓN.
- Cada chunk debe tener MÍNIMO 3 oraciones completas y sustanciales. No generes chunks de una sola oración.
- Los 6 chunks deben seguir esta progresión pedagógica estricta:
  1. "¿Qué es?": Definición completa y clara del concepto central de esa sesión.
  2. "¿Por qué importa?": Relevancia en la vida cotidiana del alumno, con un ejemplo concreto.
  3. "¿Cómo funciona?": El procedimiento o razonamiento, explicado paso a paso con listas si aplica.
  4. "Ejemplo resuelto": Un caso completo resuelto con datos reales, mostrando cada paso.
  5. "Conexión con el mundo real": Cómo este concepto aparece en tecnología, naturaleza, economía o comunidad.
  6. "¿Sabías que...?": Un dato histórico, récord, paradoja o curiosidad asombrosa relacionada con el tema.
- Usa formato Markdown dentro de los chunks: **negritas** para términos clave, listas numeradas o con guiones para procedimientos, y encabezados ## para el título de cada sección.

# 4. REGLAS DE MINIJUEGO (VARIEDAD OBLIGATORIA):
Cada sesión debe tener un minijuego de tipo DIFERENTE. Sigue esta rotación estricta por número de sesión:
- Sesiones 1, 4, 7, 10, 13, 16, 19, 22, 25 → tipo: "word_search". Genera el campo "words" con un array de 8-10 palabras clave del tema (cada palabra DEBE tener mínimo 4 letras). Ejemplo: {"type":"word_search","words":["FRACCION","NUMERADOR","DENOMINADOR","EQUIVALENTE","SIMPLIFICAR","DECIMAL","PORCENTAJE","MIXTO"]}
- Sesiones 2, 5, 8, 11, 14, 17, 20, 23 → tipo: "memory_match". Genera el campo "pairs" con 5-6 pares de concepto-definición. Ejemplo: {"type":"memory_match","pairs":[{"concept":"Numerador","definition":"Número de arriba en una fracción"},{"concept":"Denominador","definition":"Número de abajo en una fracción"},...]}
- Sesiones 3, 6, 9, 12, 15, 18, 21, 24 → tipo: "multiple_choice". Genera "question", "options" (4 opciones), "correctAnswer", "feedbackSuccess", "feedbackError".

# FORMATO DE SALIDA (JSON ÚNICAMENTE):
Genera un objeto JSON puro, sin etiquetas markdown ("\`\`\`json", etc.), con esta estructura exacta:

{
  "plano_didactico": {
    "encabezado": { "proyecto": "Título", "fase": "${phase}", "metodologia": "${metodologia}", "num_sesiones": ${sessionCount} },
    "diagnostico_pedagogico": "Análisis sociocrítico",
    "estructura_curricular": {
      "campos_formativos": ["..."],
      "ejes_articuladores": ["..."],
      "proposito": "...",
      "pda": "..."
    },
    "secuencia_didactica": [
      {
        "numero": 1,
        "titulo": "...",
        "duracion": "60 min",
        "inicio": ["..."],
        "desarrollo": ["Modelaje Docente: ...", "Acción del Alumno: ..."],
        "cierre": ["..."],
        "recursos": ["..."],
        "evidencia": "..."
      }
    ]
  },
  "mapa_interactivo": [
    {
       "session_id": 1,
       "type": "concept_story",
       "title": "Título corto y gamificado basado en la sesión 1",
       "session_start": "Instrucción de INICIO o narrativa envolvente adaptada a la temática visual.",
       "session_development": "Instrucción del DESARROLLO adaptado al Reto/Puzzle del juego.",
       "session_end": "Instrucción del CIERRE para validación.",
       "narrative": "Narrativa de apertura para este nivel (del tema visual).",
       "content": {
          "explanation": { 
             "chunks": [
               "## ¿Qué es? — [REEMPLAZAR: Definición completa del concepto de esta sesión, mínimo 3 oraciones]",
               "## ¿Por qué importa? — [REEMPLAZAR: Relevancia con ejemplo cotidiano del alumno, mínimo 3 oraciones]",
               "## ¿Cómo funciona? — [REEMPLAZAR: Procedimiento paso a paso con listas, mínimo 3 oraciones]",
               "## Ejemplo resuelto — [REEMPLAZAR: Caso concreto resuelto completamente con datos reales]",
               "## Conexión con el mundo real — [REEMPLAZAR: Aparición del concepto en tecnología, naturaleza o comunidad]",
               "## ¿Sabías que...? — [REEMPLAZAR: Dato histórico curioso, récord o paradoja asombrosa del tema]"
             ],
             "analogy": "Dato curioso o analogía ingeniosa que conecte el tema con algo que un niño de Fase ${phase} ya conoce" 
          },
          "miniGame": { 
             "type": "multiple_choice",
             "question": "Pregunta de opción múltiple basada en la sesión",
             "options": ["Correcta", "Mala 1", "Mala 2", "Mala 3"],
             "correctAnswer": "Correcta",
             "feedbackSuccess": "¡Excelente!",
             "feedbackError": "Pista socrática"
          },
          "practiceProblem": { 
             "statement": "Reto final para anotar en cuaderno (Evidencia)",
             "correctValue": "Respuesta correcta",
             "hint": "Pista final"
          }
       }
    }
  ]
}

REGLA DE ORO: El arreglo "mapa_interactivo" DEBE contener EXACTAMENTE ${sessionCount} elementos y el arreglo "secuencia_didactica" también EXACTAMENTE ${sessionCount} elementos. Ambas deben empalmar lógicamente. Ningún valor numérico debe fallar. Retorna SOLO el JSON.
`;

    console.log("Calling Google AI (Non-stream mode)...");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Enviar progreso inicial al frontend
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'progress',
            session: 0,
            message: "Consultando a la IA... esto puede tardar un momento."
          }) + '\n'));

          const result = await model.generateContent(prompt);
          const responseText_raw = result.response.text();
          let responseText = responseText_raw;

          console.log("Raw AI Response completed. Length:", responseText.length);

          // Finalizamos stream, ahora a limpiar el markdown y parsear
          responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();

          const escapeUnsafeQuotes = (jsonStr: string) => {
            let isInsideString = false;
            let result = '';
            for (let i = 0; i < jsonStr.length; i++) {
              const char = jsonStr[i];
              const prevChar = i > 0 ? jsonStr[i - 1] : '';
              if (char === '"' && prevChar !== '\\\\') {
                const prevNonSpace = jsonStr.substring(0, i).trim().slice(-1);
                const nextNonSpaceIndex = jsonStr.substring(i + 1).search(/[^\s]/);
                const nextNonSpace = nextNonSpaceIndex !== -1 ? jsonStr[i + 1 + nextNonSpaceIndex] : '';
                const isStartOfString = /[:\\[\\{,]/.test(prevNonSpace);
                const isEndOfString = /[:\\}\\]\,]/.test(nextNonSpace);
                if (isStartOfString || isEndOfString) { isInsideString = !isInsideString; result += char; }
                else { result += '\\\\"'; }
              } else { result += char; }
            }
            return result;
          };

          let parsedResponse;
          try {
            parsedResponse = JSON.parse(responseText);
          } catch (initialError) {
            console.log("JSON Parse inicial falló, intentando sanear comillas...");
            responseText = escapeUnsafeQuotes(responseText);
            try {
              parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
              throw new Error("La IA retornó una estructura JSON malformada que no se pudo reparar.");
            }
          }

          try {
            if (Array.isArray(parsedResponse) && parsedResponse.length > 0 && parsedResponse[0].mapa_interactivo) {
              parsedResponse = parsedResponse[0];
            }
            if (parsedResponse.response && parsedResponse.response.mapa_interactivo) {
              parsedResponse = parsedResponse.response;
            }
          } catch (wrapperError) {}

          let days: any[] = [];
          const interactiveMap = parsedResponse.mapa_interactivo || parsedResponse.mapa_aprendizaje || parsedResponse.mapa_de_juego || (Array.isArray(parsedResponse) ? parsedResponse : []);
          const planoDidactico = parsedResponse.plano_didactico || {};

          if (interactiveMap && Array.isArray(interactiveMap)) {
            interactiveMap.forEach((nivel: any, index: number) => {
                const rawChunks = nivel.content?.explanation?.chunks;
                const chunks = Array.isArray(rawChunks) && rawChunks.length > 0 ? rawChunks : [nivel.paso_1_inicio?.oraculo || "Explora el mapa."];
                days.push({
                  dayNumber: index + 1,
                  type: nivel.type || "guided_practice",
                  title: nivel.title || nivel.titulo || "Sesión Interactiva",
                  narrative: nivel.narrative || nivel.narrativa || "(Historia AI)",
                  session_start: nivel.session_start || "",
                  session_development: nivel.session_development || "",
                  session_end: nivel.session_end || "",
                  content: {
                    explanation: { chunks: chunks, analogy: nivel.content?.explanation?.analogy || nivel.paso_3_cierre?.metacognicion || "" },
                    miniGame: nivel.content?.miniGame,
                    practiceProblem: {
                      statement: nivel.content?.practiceProblem?.statement || nivel.paso_2_desarrollo?.instruccion || "Reto final",
                      correctValue: nivel.content?.practiceProblem?.correctValue || nivel.paso_2_desarrollo?.valor_correcto || "N/A",
                      hint: nivel.content?.practiceProblem?.hint || nivel.paso_2_desarrollo?.pista_socratica || ""
                    }
                  }
                });
            });
            if (days.length > 0) {
              days[days.length - 1].type = "boss_fight";
              days[days.length - 1].originalProblemText = days[days.length - 1].content.practiceProblem.statement;
              days[days.length - 1].hints = [days[days.length - 1].content.practiceProblem.hint];
            }
          } else if (Array.isArray(parsedResponse)) {
            days = parsedResponse;
          }

          if (days.length === 0) {
            throw new Error('La IA no pudo estructurar los niveles del mapa. Intenta con un tema más específico.');
          }

          // Check if variable is defined before using it
          const safeTopic = topic ? topic.toLowerCase().trim() : 'generico';
          const safeCacheKey = `${safeTopic}_s${sessionCount}`;
          try {
            //@ts-ignore
            await prisma.aIPromptCache.create({
              data: {
                topic: safeCacheKey,
                theme: theme.toLowerCase().trim(),
                response: JSON.stringify(days)
              }
            });
          } catch (cacheError) { console.log('Cache save skipped'); }

          const payload = {
            id: crypto.randomUUID(),
            theme: "custom",
            title: `Aventura de ${topic}`,
            days: days,
            pedagogy: {
              topic: topic,
              pda: planoDidactico.estructura_curricular?.pda || parsedResponse.metadatos_nem?.pda || "Inferencia didáctica",
              grade: `Fase ${planoDidactico.encabezado?.fase || parsedResponse.metadatos_nem?.fase || "3"}`,
              proposito: planoDidactico.estructura_curricular?.proposito || parsedResponse.metadatos_nem?.proposito || "",
              diagnostico: planoDidactico.diagnostico_pedagogico || parsedResponse.metadatos_nem?.diagnostico || "",
              contenidos: planoDidactico.estructura_curricular?.campos_formativos?.[0] || parsedResponse.metadatos_nem?.contenidos || "",
              planoOficial: planoDidactico
            },
            createdAt: new Date().toISOString()
          };

          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', data: payload }) + '\n'));
          controller.close();

        } catch (error: any) {
          console.error("Stream Generator Error:", error);
          controller.enqueue(encoder.encode(JSON.stringify({ error: error.message || "Error interno del servidor en la generación" }) + '\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform'
      }
    });

  } catch (error: unknown) {
    console.error('Error in AI Generator API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
