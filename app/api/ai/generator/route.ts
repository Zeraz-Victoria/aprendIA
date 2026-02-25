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
Actúa como un Senior Instructional Designer y Arquitecto de Software Educativo experto en la Nueva Escuela Mexicana (NEM). Tu misión es transformar una planeación o un tema educativo en un "Mapa de Aprendizaje Gamificado" en formato JSON.

CONTEXTO ACTUAL PROPORCIONADO POR EL DOCENTE:
- Tema: ${topic}
- Temática Narrativa: ${theme}
- Dificultad: ${difficulty}

REGLAS DE IDENTIFICACIÓN PEDAGÓGICA (NEM):
1. FASES DEL PROGRAMA SINTÉTICO: Debes ubicar el contenido estrictamente en la fase que corresponda (Fase 1 a Fase 6).
2. SELECCIÓN DE METODOLOGÍA: Debes identificar (si viene en la planeación) o elegir (si partes de un tema) la metodología sociocrítica más apta:
   - Aprendizaje Basado en Problemas (ABP).
   - Aprendizaje Basado en Proyectos.
   - Aprendizaje Basado en Indagación (STEAM).
   - Aprendizaje Basado en Problemas Comunitarios.
   - Aprendizaje de Servicio (AS).
3. ESTRUCTURA DE LA EXPERIENCIA: Cada sesión debe respetar el flujo de Inicio, Desarrollo y Cierre, integrando el diagnóstico socioeducativo en la narrativa del juego.

INSTRUCCIONES DE DISEÑO INSTRUCCIONAL:
- AULA INVERTIDA: Cada nivel del mapa debe iniciar con un "Oráculo de Sabiduría" (Teoría técnica pero accesible) que el alumno debe leer para resolver el reto de forma autónoma.
- MECÁNICAS DE JUEGO: Define el tipo de componente UI que el frontend debe cargar (LOGIC_PUZZLE, TEXT_MASTER, CONCEPT_SORT, o TRIVIA_QUEST).
- RETROALIMENTACIÓN SOCRÁTICA: Si el alumno falla, no des la respuesta; genera una pregunta que lo obligue a reflexionar sobre la teoría leída.

ESPECIFICACIÓN TÉCNICA DE SALIDA (JSON ESTRICTO):
{
  "configuracion_pedagogica": {
    "fase_programa_sintetico": "Fase 1-6",
    "metodologia_seleccionada": "ABP | Proyectos | STEAM | Comunitarios | Servicio",
    "campo_formativo": "Nombre del campo",
    "pda_objetivo": "Proceso de Desarrollo de Aprendizaje a lograr"
  },
  "mapa_de_juego": [
    {
      "etapa_metodologica": "Nombre de la fase según la metodología (ej. Presentemos o Acción)",
      "niveles": [
        {
          "id": "Nivel_X",
          "titulo": "Título épico",
          "contexto_narrativo": "Historia basada en el diagnóstico socioeducativo",
          "aula_invertida_teoria": {
            "contenido": "Teoría necesaria para el aprendizaje autónomo",
            "puntos_clave": ["Dato 1", "Dato 2"]
          },
          "desafio_interactivo": {
            "tipo_ui": "LOGIC_PUZZLE | TEXT_MASTER | CONCEPT_SORT | TRIVIA_QUEST",
            "config": {
              "reto": "Pregunta o problema a resolver",
              "opciones": ["si aplica"],
              "valor_correcto": "Respuesta esperada",
              "pista_socratica": "Pregunta guía ante el error"
            }
          },
          "evaluacion_formativa": {
            "criterio": "Qué se está evaluando",
            "mensaje_exito": "Refuerzo positivo"
          }
        }
      ]
    }
  ]
}

REGLAS CRÍTICAS DE FORMATO:
- Genera ÚNICAMENTE el código JSON. NO agregues comillas inclinadas (\\\`\\\`\\\`json) al inicio ni al final.
- Asegúrate de que la dificultad sea progresiva y que el alumno pueda completar el mapa sin ayuda constante del docente.
- Si solo se proporciona un tema general, garantiza generar al menos 5 o 6 niveles.
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
              title: nivel.titulo || nivel.titulo_nivel || "Nivel",
              narrative: nivel.contexto_narrativo || nivel.narrativa_intro || "",
              content: {
                explanation: {
                  chunks: [nivel.aula_invertida_teoria?.contenido || nivel.oraculo_teoria?.contenido_html || ""],
                  analogy: (nivel.aula_invertida_teoria?.puntos_clave || []).join(' • ') || nivel.oraculo_teoria?.analogia_clave || ""
                },
                practiceProblem: {
                  statement: nivel.desafio_interactivo?.config?.reto || nivel.desafio?.datos_juego?.pregunta || "Pregunta no definida",
                  correctValue: (nivel.desafio_interactivo?.config?.valor_correcto || nivel.desafio?.datos_juego?.respuesta_correcta) ?? "N/A",
                  hint: nivel.desafio_interactivo?.config?.pista_socratica || nivel.desafio?.datos_juego?.pista_socratica || ""
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
