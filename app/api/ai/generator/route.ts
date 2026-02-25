import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { theme, topic, difficulty = "Básico" } = await req.json();

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

    // Attempt to fetch from Cache first to save AI API tokens
    //@ts-ignore
    const cachedPrompt = await prisma.aIPromptCache.findUnique({
      where: {
        topic_theme: {
          topic: topic.toLowerCase().trim(),
          theme: theme.toLowerCase().trim()
        }
      }
    });

    if (cachedPrompt) {
      console.log(`[CACHE HIT] Returning cached map for Topic: ${topic} | Theme: ${theme}`);
      try {
        return NextResponse.json({
          id: crypto.randomUUID(),
          theme: theme,
          title: `Aventura de ${topic}`,
          days: JSON.parse(cachedPrompt.response),
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to parse cached response", e);
        // Fallthrough to regenerate if the cache is corrupt
      }
    }

    console.log(`[CACHE MISS] Generating new AI map for Topic: ${topic} | Theme: ${theme}`);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Actúa como un Motor de Conversión Instruccional. Tu objetivo es transformar CADA ACTIVIDAD de la planeación proporcionada en un nivel jugable, sin alterar la esencia pedagógica del docente.

CONTEXTO ACTUAL PROPORCIONADO POR EL DOCENTE:
- Tema (o Planeación): ${topic}
- Temática Narrativa: ${theme}
- Dificultad: ${difficulty}

REGLAS DE FIDELIDAD ESTRICTA (CRÍTICO):
1. PROHIBIDO INVENTAR: No propongas actividades nuevas. Debes mapear exactamente las acciones descritas en el "INICIO", "DESARROLLO" y "CIERRE" de cada sesión de la planeación.
2. TRADUCCIÓN MECÁNICA:
   - Las actividades de INICIO de la planeación deben convertirse en la 'NARRATIVA_INTRO' o 'ACTIVACIÓN_PREVIA'.
   - Las actividades de DESARROLLO deben ser el 'DESAFÍO_CENTRAL' del juego.
   - Las actividades de CIERRE deben ser el 'RETO_DE_CONSOLIDACIÓN' o 'REFLEXIÓN'.
3. AULA INVERTIDA: Extrae la teoría de los apartados de la planeación o del acervo bibliográfico citado para alimentar el 'ORÁCULO'.
4. METODOLOGÍA Y FASE: Respeta la metodología sociocrítica y la Fase (1-6) del programa sintético indicadas en el documento.

ESPECIFICACIÓN TÉCNICA DE SALIDA (JSON):
{
  "metadatos": {
    "proyecto": "Título exacto de la planeación",
    "metodologia": "Metodología indicada",
    "fase_sintetica": "Fase 1-6"
  },
  "mapa_de_juego": [
    {
      "fase_metodologica": "Fase de la planeación (ej. Recolectemos)",
      "niveles": [
        {
          "sesion_id": "S_X",
          "titulo_original": "Título de la sesión",
          "mecanica_gamificada": {
            "introduccion": "Actividad de INICIO transcrita como narrativa",
            "oraculo_teoria": "Contenido teórico extraido",
            "reto_jugable": {
                "tipo_ui": "LOGIC_PUZZLE | TEXT_MASTER | CONCEPT_SORT | TRIVIA",
                "instruccion_docente": "Actividad de DESARROLLO transcrita",
                "datos": {
                    "pregunta": "Problema planteado",
                    "respuesta_correcta": "Valor esperado",
                    "pista_socratica": "Pista basada en los recursos"
                }
            },
            "cierre_metacognicion": "Actividad de CIERRE transcrita"
          }
        }
      ]
    }
  ]
}

ESCENARIO SIN PLANEACIÓN:
Solo si el docente no proporciona un documento, tienes permiso de crear una estructura desde cero siguiendo la normativa NEM, pero si hay un archivo, tu prioridad es la TRANSCRIPCIÓN GAMIFICADA de sus actividades de Inicio, Desarrollo y Cierre.
Regresa el código JSON y NADA MÁS. SIN MARCADORES DE MARKDOWN COMO \`\`\`json.
`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    console.log("Raw AI Response:", responseText); // Debugging log

    // Clean up markdown if the model hallucinated it
    responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();

    // A robust function to escape quotes used inside string values but preserve structural JSON quotes
    const escapeUnsafeQuotes = (jsonStr: string) => {
      let isInsideString = false;
      let result = '';

      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        const prevChar = i > 0 ? jsonStr[i - 1] : '';

        if (char === '"' && prevChar !== '\\\\') {
          // Look behind for : { [ , or look ahead for : } ] , to detect structural boundaries
          const prevNonSpace = jsonStr.substring(0, i).trim().slice(-1);
          const nextNonSpaceIndex = jsonStr.substring(i + 1).search(/[^\\s]/);
          const nextNonSpace = nextNonSpaceIndex !== -1 ? jsonStr[i + 1 + nextNonSpaceIndex] : '';

          const isStartOfString = /[:\\[\\{,]/.test(prevNonSpace);
          const isEndOfString = /[:\\]\\},]/.test(nextNonSpace);

          if (isStartOfString || isEndOfString) {
            isInsideString = !isInsideString;
            result += char;
          } else {
            // It's an inner quote inside a string value
            result += '\\\\"';
          }
        } else {
          result += char;
        }
      }
      return result;
    };

    responseText = escapeUnsafeQuotes(responseText);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      // If Gemini wrapped the whole response in an array despite instructions:
      if (Array.isArray(parsedResponse) && parsedResponse.length > 0 && parsedResponse[0].mapa_interactivo) {
        parsedResponse = parsedResponse[0];
      }

      // If the root is nested inside a `response` or `data` wrapper
      if (parsedResponse.response && parsedResponse.response.mapa_interactivo) {
        parsedResponse = parsedResponse.response;
      }
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", parseError);
      console.error("Attempted to parse:", responseText);
      return NextResponse.json({ error: 'AI returned malformed JSON structure', raw: responseText }, { status: 500 });
    }

    // Adapt new JSON format to old Data Schema to avoid frontend breakage
    let days: any[] = [];
    const interactiveMap = parsedResponse.mapa_de_juego || parsedResponse.mapa_interactivo || (Array.isArray(parsedResponse) ? parsedResponse : []);

    if (interactiveMap && Array.isArray(interactiveMap)) {
      let globalIndex = 1;
      interactiveMap.forEach((etapa: any) => {
        if (etapa.niveles && Array.isArray(etapa.niveles)) {
          etapa.niveles.forEach((nivel: any) => {
            days.push({
              dayNumber: globalIndex++,
              type: "guided_practice", // Fallback for all items currently
              title: nivel.titulo_original || nivel.titulo || nivel.titulo_nivel || "Nivel",
              narrative: nivel.mecanica_gamificada?.introduccion || nivel.contexto_narrativo || nivel.narrativa_intro || "",
              content: {
                explanation: {
                  chunks: [nivel.mecanica_gamificada?.oraculo_teoria || nivel.aula_invertida_teoria?.contenido || nivel.oraculo_teoria?.contenido_html || ""],
                  analogy: nivel.mecanica_gamificada?.cierre_metacognicion || (nivel.aula_invertida_teoria?.puntos_clave || []).join(' • ') || nivel.oraculo_teoria?.analogia_clave || ""
                },
                practiceProblem: {
                  statement: nivel.mecanica_gamificada?.reto_jugable?.datos?.pregunta || nivel.mecanica_gamificada?.reto_jugable?.instruccion_docente || nivel.desafio_interactivo?.config?.reto || nivel.desafio?.datos_juego?.pregunta || "Pregunta no definida",
                  correctValue: (nivel.mecanica_gamificada?.reto_jugable?.datos?.respuesta_correcta || nivel.desafio_interactivo?.config?.valor_correcto || nivel.desafio?.datos_juego?.respuesta_correcta) ?? "N/A",
                  hint: nivel.mecanica_gamificada?.reto_jugable?.datos?.pista_socratica || nivel.desafio_interactivo?.config?.pista_socratica || nivel.desafio?.datos_juego?.pista_socratica || ""
                }
              }
            });
          });
        }
      });
      // Mark the last element as Boss Fight
      if (days.length > 0) {
        days[days.length - 1].type = "boss_fight";
        days[days.length - 1].originalProblemText = days[days.length - 1].content.practiceProblem.statement;
        days[days.length - 1].hints = [days[days.length - 1].content.practiceProblem.hint];
      }
    } else if (Array.isArray(parsedResponse)) {
      // Fallback in case Gemini hallucinates the old format
      days = parsedResponse;
    }
    // Save to Cache so future requests don't hit the Gemini API
    try {
      //@ts-ignore
      await prisma.aIPromptCache.create({
        data: {
          topic: topic.toLowerCase().trim(),
          theme: theme.toLowerCase().trim(),
          response: JSON.stringify(days)
        }
      });
    } catch (cacheError) {
      console.error("Failed to save to aiPromptCache (non-fatal):", cacheError);
    }

    return NextResponse.json({
      id: crypto.randomUUID(),
      theme: "custom", // Internal enum mapping could go here
      title: `Aventura de ${topic}`,
      days: days,
      createdAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error in AI Generator API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
