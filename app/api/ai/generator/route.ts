import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { checkAndSuspendSchool } from "@/lib/subscription";



export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const rawApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/['"]/g, '').trim();
    if (!apiKey) throw new Error('API Key missing');
    const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const { theme, topic, dificultad = "Básico", metodologia = "ABP", diagnostico = "Ninguno", sessionCount = 3, session_title, session_start, session_development, session_end, phase = "3" } = await req.json();

    if (!theme || !topic) {
      return NextResponse.json({ error: 'theme and topic are required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const schoolId = (session?.user as any)?.schoolId;

    if (schoolId) {
      // Lazy-check and suspend the school if subscription is expired
      await checkAndSuspendSchool(schoolId);

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
# PERFIL: DOCTOR EN PEDAGOGÍA, DISEÑADOR DE VIDEOJUEGOS EDUCATIVOS Y ESPECIALISTA NEM 2022
Tu misión es actuar como un diseñador instruccional y de gamificación de élite. Debes transformar un contenido matemático en una aventura de aprendizaje inmersiva de alto impacto y rigor pedagógico.

# 1. DATOS DE ENTRADA:
- Tema / Problemática: ${topic}
- Diagnóstico de Aula: ${diagnostico}
- Metodología NEM: ${metodologia}
- Fase NEM: ${phase}
- Nivel de Dificultad: ${dificultad}
- Tema Visual para Gamificación: ${theme}
- Sesiones Requeridas: EXACTAMENTE ${sessionCount} sesiones.

# 2. ADAPTACIÓN AL DIAGNÓSTICO DE AULA (CRÍTICO):
Analiza el "Diagnóstico de Aula" y adapta dinámicamente todo el contenido bajo las siguientes reglas:
- Si el diagnóstico indica rezago, barreras de aprendizaje o dificultades específicas, simplifica la complejidad del lenguaje, añade analogías más visuales y físicas, y desglosa los procedimientos en pasos más pequeños (micro-pasos).
- Si el diagnóstico indica alumnos sobresalientes o alta motivación, aumenta el nivel de reto cognitivo de los problemas prácticos, plantea preguntas más abiertas e introduce mayor profundidad analítica.

# 3. ANDAMIAJE PEDAGÓGICO DE LA AVENTURA (SCROLL PROGRESSION):
Las ${sessionCount} sesiones deben tener una progresión de dificultad y aprendizaje estructurada de la siguiente manera:
- **Fase de Apertura (Primer 25% de las sesiones)**: Foco en la conceptualización base, exploración y conexión del tema con saberes previos. Explicación intuitiva.
- **Fase de Desarrollo (Siguiente 50% de las sesiones)**: Foco en la modelación matemática, algoritmos, procedimientos paso a paso y resolución guiada de problemas.
- **Fase de Cierre y Boss Fight (Último 25% de las sesiones)**: Foco en la transferencia de conocimiento, aplicaciones complejas a problemáticas comunitarias y síntesis total del contenido para derrotar al jefe final.

# 4. INTEGRACIÓN NARRATIVA ORGÁNICA (GAMIFICACIÓN PROFUNDA):
No separes la matemática de la fantasía. Integra el "Tema Visual para Gamificación" (${theme}) dentro del núcleo de la enseñanza:
- **Narrativa del nivel**: Debe contar una historia secuencial donde el alumno avanza resolviendo misterios, ayudando a personajes, o interactuando con el entorno del tema visual.
- **Explicaciones y Problemas**: El ejemplo resuelto y los problemas prácticos DEBEN usar elementos del tema visual (ej. si el tema es "Piratas", el problema debe involucrar monedas de oro, barcos, islas o raciones de agua, no manzanas genéricas).

# 5. REGLAS DE CONTENIDO TEÓRICO (EXPLANATION.CHUNKS):
El campo "explanation.chunks" debe tener EXACTAMENTE 6 bloques de teoría por sesión. Cada bloque debe tener MÍNIMO 3 oraciones ricas en contenido y seguir este flujo pedagógico:
1. **¿Qué es?**: Definición rigurosa pero comprensible según la Fase NEM, conectando el concepto con la narrativa del juego.
2. **¿Por qué importa?**: Utilidad real en la vida del estudiante y en el contexto de su aventura.
3. **¿Cómo funciona?**: Algoritmo o procedimiento paso a paso. Usa listas numeradas y Markdown (**negritas** para términos clave).
4. **Ejemplo Resuelto**: Un caso práctico resuelto detallando operaciones matemáticas paso a paso y aplicando elementos narrativos del tema visual.
5. **Conexión con el Mundo Real**: Su presencia en la ciencia, tecnología, arte o comunidad.
6. **Curiosidades**: Un dato asombroso, paradoja o historia fascinante del concepto.

# 6. RETROALIMENTACIÓN SOCRÁTICA ENRIQUECIDA (MINIJUEGOS):
- **Word Search / Memory Match**: Selecciona términos clave significativos y definiciones precisas alineadas a la Fase NEM.
- **Multiple Choice**: La pregunta debe evaluar comprensión profunda, no memorización. 
- **feedbackError (Crítico)**: No digas "Incorrecto". Explica el error común específico en el que pudo incurrir el alumno y dale una pista reflexiva (socrática) para que halle la respuesta correcta por sí mismo.
- **feedbackSuccess**: Valida el éxito conectándolo con el progreso de la aventura.

# FORMATO DE SALIDA (JSON ÚNICAMENTE):
Genera un objeto JSON puro, sin etiquetas markdown ("\`\`\`json", etc.), con esta estructura exacta:
{
  "plano_didactico": {
    "encabezado": { "proyecto": "Título del Proyecto", "fase": "${phase}", "metodologia": "${metodologia}", "num_sesiones": ${sessionCount} },
    "diagnostico_pedagogico": "Análisis didáctico adaptado al diagnóstico del docente",
    "estructura_curricular": {
      "campos_formativos": ["Campos oficiales correspondientes"],
      "ejes_articuladores": ["Ejes oficiales correspondientes"],
      "proposito": "Propósito general del proyecto de impacto social",
      "pda": "Procesos de Desarrollo de Aprendizaje (PDA) oficiales vinculados"
    },
    "secuencia_didactica": [
      {
        "numero": 1,
        "titulo": "Título formal de la sesión",
        "duracion": "60 min",
        "inicio": ["Actividad de inicio"],
        "desarrollo": ["Desarrollo pedagógico paso a paso"],
        "cierre": ["Cierre socrático"],
        "recursos": ["Recursos didácticos"],
        "evidencia": "Evidencia de aprendizaje esperada"
      }
    ]
  },
  "mapa_interactivo": [
    {
       "session_id": 1,
       "type": "concept_story",
       "title": "Título de nivel inmersivo y gamificado",
       "session_start": "Instrucción de inicio que introduce la misión narrativa del nivel",
       "session_development": "Instrucción de desarrollo/reto narrativo que el minijuego representa",
       "session_end": "Instrucción de cierre para sellar el logro de la sesión",
       "narrative": "Narrativa introductoria del nivel conectando con el tema visual",
       "content": {
          "explanation": { 
             "chunks": [
                "## ¿Qué es?\\n...",
                "## ¿Por qué importa?\\n...",
                "## ¿Cómo funciona?\\n...",
                "## Ejemplo resuelto\\n...",
                "## Conexión con el mundo real\\n...",
                "## ¿Sabías que...?\\n..."
             ],
             "analogy": "Analogía contextualizada para la Fase ${phase} basada en la vida real del estudiante" 
          },
          "miniGame": { 
             "type": "multiple_choice",
             "question": "Pregunta de opción múltiple con enfoque pedagógico",
             "options": ["Opción Correcta", "Distractor 1", "Distractor 2", "Distractor 3"],
             "correctAnswer": "Opción Correcta",
             "feedbackSuccess": "Mensaje de éxito narrativo",
             "feedbackError": "Pista socrática explicativa del error"
          },
          "practiceProblem": { 
             "statement": "Reto matemático contextualizado a la narrativa para registrar en cuaderno",
             "correctValue": "Respuesta esperada o valor numérico exacto",
             "hint": "Pista reflexiva final"
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
