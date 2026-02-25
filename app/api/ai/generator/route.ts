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
Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado en la Nueva Escuela Mexicana (NEM) y Gamificación de alta fidelidad. Tu objetivo es transformar una planeación o un tema educativo en un "Mapa de Aprendizaje" (JSON) para que el alumno aprenda de forma autónoma.

---
REGLAS DE IDENTIFICACIÓN Y MARCO CURRICULAR (NEM):

1. FASES DEL PROGRAMA SINTÉTICO: Clasifica el contenido estrictamente en las fases oficiales de la 1 a la 6.
2. METODOLOGÍAS SOCIOCRÍTICAS: Debes identificar (si existe en el documento) o seleccionar la más apta para el tema:
   - Aprendizaje Basado en Problemas (ABP).
   - Aprendizaje Basado en Proyectos.
   - Aprendizaje Basado en Indagación (STEAM).
   - Aprendizaje Basado en Problemas Comunitarios.
   - Aprendizaje de Servicio (AS).
3. FIDELIDAD INSTRUCCIONAL (ESTRICTO): 
   Si se proporciona una planeación, queda PROHIBIDO inventar retos. Debes transcribir y mapear fielmente:
   - El INICIO de la sesión como la 'Narrativa de Activación'.
   - El DESARROLLO de la sesión como el 'Desafío Interactivo Central'.
   - El CIERRE de la sesión como la 'Actividad de Consolidación/Metacognición'.

---
DINÁMICA DE APRENDIZAJE AUTÓNOMO:

- EL ORÁCULO (AULA INVERTIDA): Antes de cada desafío, genera un bloque de teoría lúdica y técnica basada en la planeación y su acervo bibliográfico. El alumno debe poder aprender el concepto solo para resolver el reto.
- PISTAS SOCRÁTICAS: Ante un error, no des la respuesta. Genera una pregunta que guíe al alumno de regreso a la teoría del Oráculo.
- MOTOR DE UI: Selecciona el componente que mejor se adapte a la actividad de desarrollo: LOGIC_PUZZLE, TEXT_MASTER, CONCEPT_SORT o TRIVIA_QUEST.

---
ESPECIFICACIÓN TÉCNICA DE SALIDA (JSON ÚNICAMENTE):

{
  "metadatos_sistema": {
    "proyecto_titulo": "Nombre original de la planeación o tema",
    "fase_sintetica": "1-6",
    "metodologia_elegida": "ABP | Proyectos | STEAM | Comunitarios | Servicio",
    "pda_objetivo": "PDA extraído fielmente del documento"
  },
  "mapa_aprendizaje": [
    {
      "fase_metodologica": "Nombre de la etapa (ej. Presentemos, Acción, etc.)",
      "niveles": [
        {
          "id": "S_X",
          "titulo_nivel": "Título de la sesión",
          "paso_1_inicio": {
            "narrativa_contexto": "Transcripción de la actividad de Inicio",
            "oraculo_teoria": "Contenido para aprendizaje autónomo (Aula Invertida)"
          },
          "paso_2_desarrollo": {
            "tipo_ui": "LOGIC_PUZZLE | TEXT_MASTER | CONCEPT_SORT | TRIVIA",
            "instruccion_fiel": "Transcripción exacta de la actividad de Desarrollo de la planeación",
            "datos_juego": {
              "pregunta": "Problema específico planteado por el docente",
              "respuesta_correcta": "Valor esperado",
              "pista_socratica": "Pista basada en la teoría para el error"
            }
          },
          "paso_3_cierre": {
            "metacognicion": "Transcripción de la actividad de Cierre",
            "evaluacion_formativa": "Criterio de evaluación de la planeación"
          }
        }
      ]
    }
  ]
}

REGLA DE ORO: Si hay un archivo adjunto, prioriza la transcripción de sus actividades sobre la generación creativa. No inventes historias si el diagnóstico socioeducativo ya proporciona una.
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
    const interactiveMap = parsedResponse.mapa_aprendizaje || parsedResponse.mapa_de_juego || parsedResponse.mapa_interactivo || (Array.isArray(parsedResponse) ? parsedResponse : []);

    if (interactiveMap && Array.isArray(interactiveMap)) {
      let globalIndex = 1;
      interactiveMap.forEach((etapa: any) => {
        if (etapa.niveles && Array.isArray(etapa.niveles)) {
          etapa.niveles.forEach((nivel: any) => {
            days.push({
              dayNumber: globalIndex++,
              type: "guided_practice", // Fallback for all items currently
              title: nivel.titulo_nivel || nivel.titulo_original || nivel.titulo || "Nivel",
              narrative: nivel.paso_1_inicio?.narrativa_contexto || nivel.mecanica_gamificada?.introduccion || nivel.contexto_narrativo || nivel.narrativa_intro || "",
              content: {
                explanation: {
                  chunks: [nivel.paso_1_inicio?.oraculo_teoria || nivel.mecanica_gamificada?.oraculo_teoria || nivel.aula_invertida_teoria?.contenido || nivel.oraculo_teoria?.contenido_html || ""],
                  analogy: nivel.paso_3_cierre?.metacognicion || nivel.mecanica_gamificada?.cierre_metacognicion || (nivel.aula_invertida_teoria?.puntos_clave || []).join(' • ') || nivel.oraculo_teoria?.analogia_clave || ""
                },
                practiceProblem: {
                  statement: nivel.paso_2_desarrollo?.datos_juego?.pregunta || nivel.paso_2_desarrollo?.instruccion_fiel || nivel.mecanica_gamificada?.reto_jugable?.datos?.pregunta || nivel.mecanica_gamificada?.reto_jugable?.instruccion_docente || nivel.desafio_interactivo?.config?.reto || nivel.desafio?.datos_juego?.pregunta || "Pregunta no definida",
                  correctValue: (nivel.paso_2_desarrollo?.datos_juego?.respuesta_correcta || nivel.mecanica_gamificada?.reto_jugable?.datos?.respuesta_correcta || nivel.desafio_interactivo?.config?.valor_correcto || nivel.desafio?.datos_juego?.respuesta_correcta) ?? "N/A",
                  hint: nivel.paso_2_desarrollo?.datos_juego?.pista_socratica || nivel.mecanica_gamificada?.reto_jugable?.datos?.pista_socratica || nivel.desafio_interactivo?.config?.pista_socratica || nivel.desafio?.datos_juego?.pista_socratica || ""
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
