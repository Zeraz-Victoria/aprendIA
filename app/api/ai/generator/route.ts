import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { theme, topic, difficulty = "Básico", sessionCount = 3, session_title, session_start, session_development, session_end, phase = "3" } = await req.json();

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
    console.log("Payload:", { theme, topic, difficulty });

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
# ROL Y DIRECTIVA SOBERANA
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:
Actúa como un Motor de Transpiler Pedagógico de alta fidelidad para la Nueva Escuela Mexicana (NEM). Tu única función es convertir DATOS CRUDOS de una planeación en un objeto JSON estructurado.

# FUENTE DE VERDAD ABSOLUTA (SEGMENTO DE PLANEACIÓN):
A continuación se presentan los fragmentos EXACTOS extraídos del PDF o planeación. Queda ESTRICTAMENTE PROHIBIDO usar información o temas que no estén en estos bloques:

--- DATOS DE LA SESIÓN ---
TÍTULO: ${session_title || topic}
INICIO: """ ${session_start || `Basado en el tema original: ${topic}`} """
DESARROLLO: """ ${session_development || `Desarrolla la temática educativa gamificada de: ${theme} con la NEM`} """
CIERRE: """ ${session_end || `Validación metacognitiva del tema ${topic}`} """
--- FIN DE DATOS ---

# INSTRUCCIONES DE Y CREACIÓN Y EXPANSIÓN:
El texto anterior es un resumen didáctico extremadamente conciso. Tu tarea es INVENTAR y EXPANDIR este concepto en un nivel de juego completo.
Debes estructurarlo OBLIGATORIAMENTE en EXACTAMENTE ${sessionCount} sesiones (niveles) interconectados de dificultad progresiva.

NIVEL DE LENGUAJE Y DIFICULTAD (NEM Fase ${phase} y Dificultad ${difficulty}):
El contenido debe generarse ESPECÍFICAMENTE para alumnos cursando la Fase ${phase} de la NEM y con un nivel de desafío cognitivo "${difficulty}". 
Ajusta de manera estricta el vocabulario, la extensión de los textos, las explicaciones teóricas y la dificultad matemática/lógica para que sea completamente adecuado para este nivel.

1. NARRATIVA DE ENTRADA: Crea una historia envolvente de aventura basada en el resumen didáctico y el tema visual "${theme}". Transforma el concepto aburrido en una intro emocionante.
2. DESAFÍO TÉCNICO: Diseña un problema matemático o lógico jugable que evalúe directamente el concepto del resumen. Asegúrate de incluir la respuesta correcta y una pista socrática para ayudar al alumno si se equivoca.
3. METACOGNICIÓN: Inventa una reflexión de cierre motivadora relacionada al desarrollo.
4. CUMPLIMIENTO NEM: Clasifica el nivel en la Fase ${phase} y extrae o inventa el PDA directamente relacionado al tema.

# FORMATO DE SALIDA (JSON ÚNICAMENTE):
Genera un objeto JSON que mapee estos campos. No incluyas explicaciones ni etiquetas markdown. Asegúrate de generar EXACTAMENTE ${sessionCount} objetos consecutivos dentro del arreglo "mapa_interactivo".
   Toda respuesta de generación de niveles debe seguir esta estructura estricta:
   {
     "metadatos_nem": { 
        "fase": "1-6", 
        "metodologia": "Seleccionada", 
        "pda": "PDA_Original",
        "proposito": "Propósito del proyecto",
        "diagnostico": "Problemática inicial",
        "contenidos": "Contenidos de la fase"
     },
     "mapa_interactivo": [{
       "sesion_id": "ID",
       "paso_1_inicio": { 
          "narrativa": "Actividad de Inicio transcrita",
          "oraculo": "Teoría necesaria para el alumno (Aula Invertida)"
       },
       "paso_2_desarrollo": { 
         "componente_ui": "LOGIC_PUZZLE|TEXT_MASTER|CONCEPT_SORT|TRIVIA",
         "instruccion": "Actividad de Desarrollo transcrita",
         "valor_correcto": "Dato_Docente",
         "pista_socratica": "Pregunta guía ante un error"
       },
       "paso_3_cierre": { "metacognicion": "Actividad de Cierre transcrita" }
     }]
   }
`;

    console.log("Calling Google AI...");
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    console.log("Raw AI Response completed. Length:", responseText.length);
    console.log("Raw AI Response Snip:", responseText.substring(0, 100)); // Debugging log

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
          const nextNonSpaceIndex = jsonStr.substring(i + 1).search(/[^\s]/);
          const nextNonSpace = nextNonSpaceIndex !== -1 ? jsonStr[i + 1 + nextNonSpaceIndex] : '';

          const isStartOfString = /[:\\[\\{,]/.test(prevNonSpace);
          const isEndOfString = /[:\\}\\]\,]/.test(nextNonSpace);

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

    let parsedResponse;
    try {
      // Intentar primero el JSON puro que generó la IA (suele venir perfecto con Gemini 2.5 Flash)
      parsedResponse = JSON.parse(responseText);
      console.log("JSON parsed successfully on first try");
    } catch (initialError) {
      console.log("JSON Parse inicial falló, intentando sanear comillas...");
      responseText = escapeUnsafeQuotes(responseText);
      try {
        parsedResponse = JSON.parse(responseText);
        console.log("JSON parsed successfully on second try");
      } catch (parseError) {
        console.error("Failed to parse AI JSON after escaping:", parseError);
        console.error("Attempted to parse:", responseText);
        return NextResponse.json({ error: 'AI returned malformed JSON structure', raw: responseText }, { status: 500 });
      }
    }

    try {
      // If Gemini wrapped the whole response in an array despite instructions:
      if (Array.isArray(parsedResponse) && parsedResponse.length > 0 && parsedResponse[0].mapa_interactivo) {
        parsedResponse = parsedResponse[0];
      }

      // If the root is nested inside a `response` or `data` wrapper
      if (parsedResponse.response && parsedResponse.response.mapa_interactivo) {
        parsedResponse = parsedResponse.response;
      }
    } catch (wrapperError) {
      console.error("Error un-wrapping AI response:", wrapperError);
    }

    // Adapt new JSON format to old Data Schema to avoid frontend breakage
    let days: any[] = [];
    const interactiveMap = parsedResponse.mapa_aprendizaje || parsedResponse.mapa_de_juego || parsedResponse.mapa_interactivo || (Array.isArray(parsedResponse) ? parsedResponse : []);

    console.log("=== DEBUG GENERATOR ===");
    console.log("IS ARRAY?", Array.isArray(interactiveMap));
    console.log("INTERACTIVE MAP DUMP:", JSON.stringify(interactiveMap, null, 2));

    if (interactiveMap && Array.isArray(interactiveMap)) {
      let globalIndex = 1;
      interactiveMap.forEach((etapa: any) => {
        // En V4 map_interactivo itera niveles directo. En V3 estaba anidado bajo "niveles:"
        const arrToIterate = etapa.niveles && Array.isArray(etapa.niveles) ? etapa.niveles : [etapa];

        arrToIterate.forEach((nivel: any) => {
          days.push({
            dayNumber: globalIndex++,
            type: "guided_practice", // Fallback for all items currently
            title: nivel.titulo_nivel || nivel.config_nivel?.titulo || nivel.sesion_id || "Nivel",
            narrative: nivel.paso_1_inicio?.narrativa || nivel.config_nivel?.narrativa_inicio || nivel.paso_1_inicio?.narrativa_contexto || nivel.contexto_narrativo || "",
            content: {
              explanation: {
                chunks: [nivel.paso_1_inicio?.oraculo || nivel.config_nivel?.oraculo_teoria?.contenido_html || nivel.paso_1_inicio?.oraculo_teoria || ""],
                analogy: nivel.paso_3_cierre?.metacognicion || nivel.cierre_formativo?.actividad_reflexion || ""
              },
              practiceProblem: {
                statement: nivel.paso_2_desarrollo?.instruccion || nivel.interaccion_desarrollo?.validacion?.pregunta || nivel.interaccion_desarrollo?.instruccion_docente || nivel.paso_2_desarrollo?.datos_juego?.pregunta || nivel.paso_2_desarrollo?.instruccion_fiel || "Pregunta no definida",
                correctValue: (nivel.paso_2_desarrollo?.valor_correcto || nivel.interaccion_desarrollo?.validacion?.respuesta_esperada || nivel.paso_2_desarrollo?.datos_juego?.respuesta_correcta) ?? "N/A",
                hint: nivel.paso_2_desarrollo?.pista_socratica || nivel.interaccion_desarrollo?.validacion?.pista_socratica || nivel.paso_2_desarrollo?.datos_juego?.pista_socratica || ""
              }
            }
          });
        });
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

    if (days.length === 0) {
      console.error("AI generated 0 days for topic:", topic);
      return NextResponse.json({ 
        error: 'La IA no pudo estructurar los niveles del mapa. Intenta con un tema más específico o reintenta en unos segundos.',
        raw: responseText 
      }, { status: 422 });
    }

    // Save to Cache so future requests don't hit the Gemini API
    try {
      //@ts-ignore
      await prisma.aIPromptCache.create({
        data: {
          topic: cacheKeyTopic,
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
      pedagogy: {
        topic: topic,
        pda: parsedResponse.metadatos_nem?.pda || "Inferencia didáctica",
        grade: `Fase ${parsedResponse.metadatos_nem?.fase || "3"}`,
        proposito: parsedResponse.metadatos_nem?.proposito || "",
        diagnostico: parsedResponse.metadatos_nem?.diagnostico || "",
        contenidos: parsedResponse.metadatos_nem?.contenidos || ""
      },
      createdAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error in AI Generator API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
