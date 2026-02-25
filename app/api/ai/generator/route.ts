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
Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado en la Nueva Escuela Mexicana (NEM) y Gamificación.

CONTEXTO ACTUAL PROPORCIONADO POR EL DOCENTE:
- Tema: ${topic}
- Temática Narrativa: ${theme}
- Dificultad: ${difficulty}

TU MISIÓN:
Generar un Grafo de Aprendizaje Autónomo en formato JSON para un mapa interactivo. El sistema debe funcionar bajo dos escenarios:
1. SI SE PROPORCIONA UNA PLANEACIÓN: Transformar cada sesión y fase en niveles del juego.
2. SI SE PROPORCIONA SOLO UN TEMA: Crear primero una planeación pedagógica interna basada en la Fase 5 o 6 (según corresponda) con metodología ABP o Proyectos Comunitarios, y posteriormente generar el juego.

DIRECTRICES PEDAGÓGICAS (STRICT):
- DIAGNÓSTICO: Utiliza o crea un contexto socioeducativo real (problemas de la comunidad, escuela o aula) para situar la narrativa del juego.
- PDA Y CONTENIDOS: Los retos deben validar específicamente los Procesos de Desarrollo de Aprendizaje oficiales de la NEM.
- ESTRUCTURA DE SESIÓN: Cada nivel debe tener: Inicio (Narrativa), Desarrollo (Teoría + Reto) y Cierre (Reflexión/Feedback).
- AULA INVERTIDA (EL ORÁCULO): Antes de cada desafío, presenta un bloque de teoría lúdica y clara ("Aula Invertida") para que el alumno aprenda de forma autónoma.
- MECÁNICAS DE JUEGO (GAME_ENGINE): Selecciona dinámicas que tu frontend pueda renderizar:
    * 'LOGIC_PUZZLE': Retos lógicos o matemáticos.
    * 'TEXT_MASTER': Redacción, ortografía y puntuación.
    * 'CONCEPT_MAP': Relación de conceptos o columnas.
    * 'TRIVIA_QUEST': Preguntas de opción múltiple con pistas socráticas.

ESPECIFICACIÓN TÉCNICA DE SALIDA (JSON ÚNICAMENTE):
{
  "metadatos_docente": {
    "proyecto_nombre": "Nombre creativo del proyecto",
    "metodologia": "ABP | Proyectos Comunitarios",
    "fase": "Fase 5 o 6",
    "campo_formativo": "Nombre del campo",
    "pda_general": "Objetivo principal a lograr"
  },
  "mapa_interactivo": [
    {
      "fase_id": "Fase_Nombre",
      "niveles": [
        {
          "id": "S1",
          "titulo_nivel": "Título épico del nivel",
          "narrativa_intro": "Historia que sitúa al alumno en el problema",
          "oraculo_teoria": {
            "contenido_html": "Texto educativo para aprendizaje autónomo",
            "analogia_clave": "Comparación con la vida real"
          },
          "desafio": {
            "tipo_componente": "QUIZ | CROSSWORD | MATCHING | CHALLENGE",
            "datos_juego": {
                "pregunta": "El reto a resolver",
                "opciones": ["si aplica"],
                "respuesta_correcta": "Valor exacto",
                "pista_socratica": "Pregunta guía que no da la respuesta"
            }
          },
          "feedback": {
            "exito": "Mensaje de motivación",
            "repaso": "Explicación del porqué de la respuesta"
          }
        }
      ]
    }
  ]
}

REGLAS CRÍTICAS:
- No incluyas texto explicativo fuera del bloque JSON.
- Si el docente solo da un tema, garantiza que la estructura del JSON refleje una planeación completa de la NEM (mínimo 6 sesiones).
- La dificultad debe ser progresiva: de la recuperación de saberes al pensamiento crítico.
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
    const interactiveMap = parsedResponse.mapa_interactivo || (Array.isArray(parsedResponse) ? parsedResponse : []);

    if (interactiveMap && Array.isArray(interactiveMap)) {
      let globalIndex = 1;
      interactiveMap.forEach((fase: any) => {
        if (fase.niveles && Array.isArray(fase.niveles)) {
          fase.niveles.forEach((nivel: any) => {
            days.push({
              dayNumber: globalIndex++,
              type: "guided_practice", // Fallback for all items currently
              title: nivel.titulo_nivel || "Nivel",
              narrative: nivel.narrativa_intro || "",
              content: {
                explanation: {
                  chunks: [nivel.oraculo_teoria?.contenido_html || ""],
                  analogy: nivel.oraculo_teoria?.analogia_clave || ""
                },
                practiceProblem: {
                  statement: nivel.desafio?.datos_juego?.pregunta || "Pregunta no definida",
                  correctValue: nivel.desafio?.datos_juego?.respuesta_correcta ?? "N/A",
                  hint: nivel.desafio?.datos_juego?.pista_socratica || ""
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
