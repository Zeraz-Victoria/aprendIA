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
Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado en la Nueva Escuela Mexicana (NEM) y Gamificación de alta fidelidad. Tu misión es transformar una planeación o un tema educativo en un "Mapa de Aprendizaje" (JSON) para que el alumno aprenda de forma autónoma.

---
REGLAS DE IDENTIFICACIÓN Y MARCO CURRICULAR (NEM):

1. FASES DEL PROGRAMA SINTÉTICO: Clasifica el contenido estrictamente en las fases oficiales (1 a 6).
2. METODOLOGÍAS SOCIOCRÍTICAS: Identifica o selecciona la metodología adecuada: ABP, Proyectos, STEAM, Comunitarios o Aprendizaje de Servicio.
3. FIDELIDAD INSTRUCCIONAL (ESTRICTO): 
   - INICIO de la sesión -> 'NARRATIVA_DE_ACTIVACIÓN'.
   - DESARROLLO de la sesión -> 'DESAFÍO_INTERACTIVO_CENTRAL'.
   - CIERRE de la sesión -> 'METACOGNICIÓN_Y_EVALUACIÓN'.
   PROHIBIDO inventar retos si existe una planeación previa; transcríbela fielmente.

---
ARQUITECTURA DEL CONTENIDO (JUEGO Y TEORÍA):

- EL ORÁCULO (AULA INVERTIDA): Genera teoría lúdica basada en el 'Acervo Bibliográfico' de la planeación. El contenido debe ser suficiente para que el alumno resuelva el reto sin ayuda externa.
- MOTOR DE UI (DETERMINÍSTICO): Selecciona un componente basado en el objetivo del PDA:
    * 'LOGIC_PUZZLE': Algoritmos, lógica y matemáticas.
    * 'TEXT_MASTER': Redacción, ortografía y gramática.
    * 'CONCEPT_MAP': Clasificación, jerarquías y relación de ideas.
    * 'TRIVIA_QUEST': Comprensión lectora y trivia con pistas socráticas.
- FEEDBACK SOCRÁTICO: Ante errores, genera una pregunta guía que apunte directamente a la sección del 'Oráculo' que contiene la respuesta.

---
ESPECIFICACIÓN TÉCNICA DE SALIDA (JSON SCHEMA):

{
  "metadatos": {
    "proyecto_titulo": "Título original",
    "fase_sintetica": "1-6",
    "metodologia": "ABP | Proyectos | STEAM | Comunitarios | Servicio",
    "pda": "PDA_Extraído",
    "diagnostico_situado": "Resumen del contexto socioeducativo"
  },
  "mapa_aprendizaje": [
    {
      "fase_metodologica": "Etapa (ej. Presentemos / Acción)",
      "niveles": [
        {
          "id": "SESION_X",
          "config_nivel": {
            "titulo": "Título de la sesión",
            "narrativa_inicio": "Transcripción de la actividad de Inicio",
            "oraculo_teoria": {
                "contenido_html": "Cuerpo teórico para aprendizaje autónomo",
                "terminos_clave": ["Palabra 1", "Palabra 2"]
            }
          },
          "interaccion_desarrollo": {
            "componente_ui": "LOGIC_PUZZLE | TEXT_MASTER | CONCEPT_SORT | TRIVIA",
            "instruccion_docente": "Transcripción exacta de la actividad de Desarrollo",
            "validacion": {
                "pregunta": "Reto central planteado por el docente",
                "respuesta_esperada": "Valor correcto",
                "pista_socratica": "Guía reflexiva ante el error"
            }
          },
          "cierre_formativo": {
            "actividad_reflexion": "Transcripción de la actividad de Cierre",
            "instrumento_evaluacion": "Rúbrica o criterio de la planeación"
          }
        }
      ]
    }
  ]
}

REGLA DE ORO: Si hay un archivo adjunto, prioriza la transcripción de sus actividades. Si solo hay un tema, genera la planeación completa siguiendo la estructura de la NEM antes de crear el JSON.
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
              title: nivel.config_nivel?.titulo || nivel.titulo_nivel || nivel.titulo_original || nivel.titulo || "Nivel",
              narrative: nivel.config_nivel?.narrativa_inicio || nivel.paso_1_inicio?.narrativa_contexto || nivel.mecanica_gamificada?.introduccion || nivel.contexto_narrativo || nivel.narrativa_intro || "",
              content: {
                explanation: {
                  chunks: [nivel.config_nivel?.oraculo_teoria?.contenido_html || nivel.paso_1_inicio?.oraculo_teoria || nivel.mecanica_gamificada?.oraculo_teoria || nivel.aula_invertida_teoria?.contenido || nivel.oraculo_teoria?.contenido_html || ""],
                  analogy: nivel.cierre_formativo?.actividad_reflexion || nivel.paso_3_cierre?.metacognicion || nivel.mecanica_gamificada?.cierre_metacognicion || (nivel.config_nivel?.oraculo_teoria?.terminos_clave || []).join(' • ') || (nivel.aula_invertida_teoria?.puntos_clave || []).join(' • ') || nivel.oraculo_teoria?.analogia_clave || ""
                },
                practiceProblem: {
                  statement: nivel.interaccion_desarrollo?.validacion?.pregunta || nivel.interaccion_desarrollo?.instruccion_docente || nivel.paso_2_desarrollo?.datos_juego?.pregunta || nivel.paso_2_desarrollo?.instruccion_fiel || nivel.mecanica_gamificada?.reto_jugable?.datos?.pregunta || nivel.mecanica_gamificada?.reto_jugable?.instruccion_docente || nivel.desafio_interactivo?.config?.reto || nivel.desafio?.datos_juego?.pregunta || "Pregunta no definida",
                  correctValue: (nivel.interaccion_desarrollo?.validacion?.respuesta_esperada || nivel.paso_2_desarrollo?.datos_juego?.respuesta_correcta || nivel.mecanica_gamificada?.reto_jugable?.datos?.respuesta_correcta || nivel.desafio_interactivo?.config?.valor_correcto || nivel.desafio?.datos_juego?.respuesta_correcta) ?? "N/A",
                  hint: nivel.interaccion_desarrollo?.validacion?.pista_socratica || nivel.paso_2_desarrollo?.datos_juego?.pista_socratica || nivel.mecanica_gamificada?.reto_jugable?.datos?.pista_socratica || nivel.desafio_interactivo?.config?.pista_socratica || nivel.desafio?.datos_juego?.pista_socratica || ""
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
