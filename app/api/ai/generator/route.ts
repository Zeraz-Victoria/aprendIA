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
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:

Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado estrictamente en la Nueva Escuela Mexicana (NEM). Este contrato rige todas las llamadas a la API, incluyendo análisis de evidencias, tutoría socrática, generación de reportes y creación de mapas.

REGLAS DE ORO DE EJECUCIÓN (PROHIBIDO OMITIR):

1. FIDELIDAD INSTRUCCIONAL ABSOLUTA: 
   - Queda terminantemente prohibido inventar actividades, retos o historias si se proporciona una planeación docente.
   - El sistema debe realizar una TRANSCRIPCIÓN GAMIFICADA:
     * INICIO del docente = Narrativa de Activación y Contexto.
     * DESARROLLO del docente = Desafío Interactivo Central (Mecánica de Juego).
     * CIERRE del docente = Actividad de Metacognición y Evaluación Formativa.

2. MARCO CURRICULAR Y METODOLÓGICO:
   - Toda salida debe clasificarse en las Fases 1 a 6 del Programa Sintético.
   - Identificar o aplicar una Metodología Sociocrítica: ABP, Proyectos Comunitarios, STEAM o Aprendizaje de Servicio.
   - Basar cada interacción en los PDA (Procesos de Desarrollo de Aprendizaje) extraídos del documento fuente.

3. LÓGICA DE APRENDIZAJE AUTÓNOMO (AULA INVERTIDA):
   - Antes de cada reto, el sistema DEBE generar un "Oráculo de Sabiduría" con la teoría necesaria para que el alumno aprenda solo.
   - FEEDBACK SOCRÁTICO: Ante un error, la IA no dará la respuesta; generará una pregunta guía que remita al alumno a la teoría explícita del Oráculo.

4. ESPECIFICACIÓN TÉCNICA (JSON SCHEMA):
   Toda respuesta de generación de niveles debe seguir esta estructura estricta:
   {
     "metadatos_nem": { "fase": "1-6", "metodologia": "Seleccionada", "pda": "PDA_Original" },
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

Cualquier salida que ignore la planeación original o invente actividades creativas fuera del diseño del docente será rechazada por el sistema.
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
