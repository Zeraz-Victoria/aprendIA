import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { checkUserSubscriptionAccess } from '@/lib/subscription';
import { findRelevantTextbookPages } from '@/lib/textbooks-index';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      theme,
      topic,
      difficulty = "Básico",
      lessonPlan,
      sesiones: rawSesiones,
      session_title,
      session_start,
      session_development,
      session_end
    } = body;

    if (!theme || !topic) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios (tema y título)' }, { status: 400 });
    }

    // Extraer lista de sesiones si viene de una planeación EduPlan
    let sesionesList: any[] = [];
    if (Array.isArray(rawSesiones) && rawSesiones.length > 0) {
      sesionesList = rawSesiones;
    } else if (lessonPlan?.secuencia_didactica && Array.isArray(lessonPlan.secuencia_didactica)) {
      sesionesList = lessonPlan.secuencia_didactica.flatMap((f: any) => f.sesiones || []);
    }

    // Buscar sugerencias de libros de texto indexados
    const searchTopicForBooks = topic + (lessonPlan?.diagnostico_pedagogico ? ` ${lessonPlan.diagnostico_pedagogico}` : '');
    const textbookSuggestions = findRelevantTextbookPages(searchTopicForBooks, difficulty, 4);
    const textbookSnippet = textbookSuggestions.length > 0
      ? `\nREFERENCIAS DE LIBROS DE TEXTO DE TELESECUNDARIA (Sugerir estas páginas en la teoría/oráculo del juego):\n` +
        textbookSuggestions.map(b => `- ${b.bookTitle} (Página ${b.page}): "${b.snippet.substring(0, 160)}..."`).join('\n')
      : '';

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const schoolId = (session?.user as any)?.schoolId;

    if (userId && schoolId) {
      const subCheck = await checkUserSubscriptionAccess(userId, schoolId);
      if (!subCheck.allowed) {
        return NextResponse.json({ error: subCheck.reason, subscriptionExpired: true }, { status: 402 });
      }

      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { apiCalls: true, subscriptionPlan: true, subscriptionStatus: true }
      });

      if (school) {
        if (school.subscriptionStatus === 'SUSPENDED') {
          return NextResponse.json({ error: 'Cuenta suspendida. Contacta a soporte para continuar.' }, { status: 403 });
        }

        const maxCreations = school.subscriptionPlan === 'PREMIUM' ? 20 : (school.subscriptionPlan === 'INTERMEDIATE' ? 7 : 3);
        if (school.apiCalls >= maxCreations) {
          return NextResponse.json({
            error: `Has alcanzado el límite máximo histórico de ${maxCreations} planeaciones/mundos creados para tu plan (${school.apiCalls}/${maxCreations}). Aunque borres mundos existentes, el cupo de generación con IA de tu cuenta ha finalizado. Contacta a soporte por WhatsApp para ampliar tu plan.`
          }, { status: 403 });
        }
      }
    }

    if (!process.env.AI_API_KEY) {
      console.error("CRITICAL: AI_API_KEY is not defined");
      return NextResponse.json({ error: 'La clave de API de IA no está configurada.' }, { status: 500 });
    }

    // Cache lookup solo cuando no hay planeación personalizada (las planeaciones son únicas)
    const hasCustomPlan = sesionesList.length > 0 || !!lessonPlan;
    if (!hasCustomPlan) {
      try {
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
          const parsedCache = JSON.parse(cachedPrompt.response);
          // Si el cache tiene al menos 3 niveles válidos, retornarlo
          if (Array.isArray(parsedCache) && parsedCache.length >= 3) {
            console.log(`[CACHE HIT] Returning cached multi-level map for Topic: ${topic} | Theme: ${theme}`);
            return NextResponse.json({
              id: crypto.randomUUID(),
              theme: theme,
              title: `Aventura de ${topic}`,
              days: parsedCache,
              createdAt: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.warn("Non-fatal prompt cache lookup error:", e);
      }
    }

    console.log(`[GENERATOR] Generating new AI map for Topic: "${topic}" | Theme: "${theme}" | Sesiones: ${sesionesList.length}`);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    let prompt = '';

    if (sesionesList.length > 0) {
      // MODO PLANEACIÓN DIDÁCTICA COMPLETA: Generar un nivel por cada sesión de la planeación
      const planContext = lessonPlan ? `
INFORMACIÓN DE LA PLANEACIÓN BASE (NEM):
- Proyecto: ${lessonPlan.encabezado?.proyecto || topic}
- Grado / Fase: ${difficulty} (${lessonPlan.encabezado?.fase || 'Fase 6'})
- Metodología: ${lessonPlan.encabezado?.metodologia || 'NEM'}
- Propósito / Diagnóstico: ${lessonPlan.diagnostico_pedagogico || lessonPlan.estructura_curricular?.proposito || topic}
- PDA / Contenidos: ${JSON.stringify(lessonPlan.estructura_curricular?.vinculacion || [])}
` : '';

      const sesionesFormatted = sesionesList.map((s, idx) => `
--- SESIÓN ${idx + 1} DE ${sesionesList.length} ---
NÚMERO: ${s.numero || idx + 1}
TÍTULO: ${s.titulo || `Sesión ${idx + 1}`}
INICIO: ${Array.isArray(s.inicio) ? s.inicio.join(" ") : (s.inicio || "Exploración e indagación de saberes previos")}
DESARROLLO: ${Array.isArray(s.desarrollo) ? s.desarrollo.join(" ") : (s.desarrollo || "Actividades prácticas y modelaje")}
CIERRE: ${Array.isArray(s.cierre) ? s.cierre.join(" ") : (s.cierre || "Reflexión metacognitiva y evaluación")}
RECURSOS: ${Array.isArray(s.recursos) ? s.recursos.join(", ") : (s.recursos || "")}
EVIDENCIA: ${s.evidencia || ""}
`).join('\n');

      prompt = `
# ROL: ARQUITECTO PEDAGÓGICO DE GAMIFICACIÓN EDUCATIVA (NUEVA ESCUELA MEXICANA)
Tu misión es transformar CADA UNA DE LAS ${sesionesList.length} SESIONES de la planeación docente adjunta en una ruta secuencial de niveles interactivos para un Mundo Virtual gamificado.

${planContext}

AMBIENTACIÓN NARRATIVA SELECCIONADA: "${theme}" (Ejemplos: Infierno de Fuego, Tundra de Hielo, Selva Mística, Ciudad Neón, Clásico Escolar).
Debes tejer la ambientación de "${theme}" con los contenidos pedagógicos reales de cada sesión.

${textbookSnippet}

SESIONES DIDÁCTICAS A TRANSFORMAR (DEBES GENERAR EXACTAMENTE ${sesionesList.length} NIVELES, UNO POR CADA SESIÓN):
${sesionesFormatted}

### REGLAS DE CONSTRUCCIÓN DE NIVELES:
1. Para cada sesión $i$ (desde 1 hasta ${sesionesList.length}):
   - Nivel 1 (Día 1): "type": "concept_story". Narrativa de apertura en el mundo de "${theme}" que introduce la aventura. En "chunks" incluye la teoría clara y menciona las páginas del libro de texto. Incluye un primer reto interactivo.
   - Niveles intermedios (Día 2 a ${sesionesList.length - 1}): "type": "guided_practice". Continúa la historia, presenta el reto práctico de la sesión correspondiente, con pregunta clara ("statement"), respuesta correcta esperada ("correctValue") y una pista socrática ("hint") que guíe al alumno ante un error.
   - Último Nivel (Día ${sesionesList.length}): "type": "boss_fight". La Batalla Final o Desafío Épico del Proyecto. El reto debe evaluar el producto central o síntesis de todo el proyecto. Incluye "originalProblemText" y un arreglo con 2 "hints".

ESTRUCTURA JSON REQUERIDA (DEVUELVE ESTRICTAMENTE UN ARREGLO JSON CON LOS ${sesionesList.length} NIVELES):
[
  {
    "dayNumber": 1,
    "type": "concept_story",
    "title": "Título llamativo del Nivel 1 basado en la Sesión 1",
    "narrative": "Historia inmersiva con temática ${theme} conectada al inicio de la sesión...",
    "content": {
      "explanation": {
        "chunks": ["Explicación amigable del concepto central y orientación con el libro de texto"],
        "analogy": "Analogía clara conectada al mundo real o a la ambientación"
      },
      "practiceProblem": {
        "statement": "Pregunta o reto directo derivado de la actividad de desarrollo",
        "correctValue": "Respuesta correcta exacta o palabra clave",
        "hint": "¿Qué sucede si recuerdas el concepto clave?"
      }
    },
    "pda_objetivo": "PDA de la sesión",
    "cierre_metacognicion": "Reflexión del cierre de la sesión"
  },
  {
    "dayNumber": ${sesionesList.length},
    "type": "boss_fight",
    "title": "Jefe Final: Desafío Épico del Proyecto",
    "originalProblemText": "El reto integrador culminante que resuelve la misión principal del proyecto...",
    "hints": ["Pista socrática inicial", "Pista socrática avanzada"],
    "content": {
      "explanation": {
        "chunks": ["¡Has llegado a la prueba final de la aventura! Demuestra todo lo aprendido."],
        "analogy": "La síntesis de tus conocimientos es la clave para la victoria."
      },
      "practiceProblem": {
        "statement": "El reto integrador culminante que resuelve la misión principal...",
        "correctValue": "Respuesta correcta final",
        "hint": "Integra los conceptos aprendidos en las sesiones previas."
      }
    },
    "pda_objetivo": "PDA final",
    "cierre_metacognicion": "Conclusión metacognitiva del proyecto"
  }
]
`;
    } else {
      // MODO TEMA DIRECTO: Generar aventura estándar de 3 a 5 niveles
      const singleSessionContext = session_title || session_start || session_development
        ? `
DATOS DE REFERENCIA:
- Título: ${session_title || topic}
- Inicio: ${session_start || 'Introducción'}
- Desarrollo: ${session_development || 'Actividades prácticas'}
- Cierre: ${session_end || 'Evaluación'}
` : '';

      prompt = `
# ROL: DISEÑADOR INSTRUCCIONAL EXPERTO EN GAMIFICACIÓN EDUCATIVA (NEM)
Crea una aventura pedagógica secuencial de 4 niveles que conecte el tema "${topic}" con la ambientación temática "${theme}" para el grado "${difficulty}".

${singleSessionContext}

${textbookSnippet}

REGLAS DE DISEÑO:
- Día 1: "concept_story" (Descubrimiento Guiado, Narrativa inmersiva, teoría y oráculo con libros de texto, primer reto).
- Día 2: "guided_practice" (Práctica guiada y resolución de problemas, con pregunta directa, respuesta correcta y pista socrática).
- Día 3: "guided_practice" (Reto avanzado de aplicación contextualizada).
- Día 4: "boss_fight" (Jefe Final integrador y épico con 2 pistas socráticas).

ESTRUCTURA JSON REQUERIDA (DEVUELVE ESTRICTAMENTE UN ARREGLO JSON):
[
  {
    "dayNumber": 1,
    "type": "concept_story",
    "title": "Título del Día 1",
    "narrative": "Historia inmersiva contextualizada en ${theme}...",
    "content": {
      "explanation": {
        "chunks": ["Teoría y explicación clara del tema"],
        "analogy": "Analogía cotidiana"
      },
      "practiceProblem": {
        "statement": "Pregunta o desafío del Nivel 1",
        "correctValue": "Respuesta correcta",
        "hint": "Pista socrática"
      }
    }
  },
  {
    "dayNumber": 4,
    "type": "boss_fight",
    "title": "Jefe Final: El Gran Desafío",
    "originalProblemText": "Desafío integrador de pensamiento crítico...",
    "hints": ["Pista 1", "Pista 2"],
    "content": {
      "practiceProblem": {
        "statement": "Desafío integrador...",
        "correctValue": "Respuesta correcta",
        "hint": "Pista socrática"
      }
    }
  }
]
`;
    }

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // Extract JSON block if wrapped in text or markdown
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/```\n([\s\S]*?)\n```/) ||
                      responseText.match(/\[[\s\S]*\]/) ||
                      responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[1] || jsonMatch[0];
    }
    responseText = responseText.trim();

    // A robust function to escape quotes used inside string values but preserve structural JSON quotes
    const escapeUnsafeQuotes = (jsonStr: string) => {
      let isInsideString = false;
      let res = '';

      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        const prevChar = i > 0 ? jsonStr[i - 1] : '';

        if (char === '"' && prevChar !== '\\') {
          const prevNonSpace = jsonStr.substring(0, i).trim().slice(-1);
          const nextNonSpaceIndex = jsonStr.substring(i + 1).search(/[^\s]/);
          const nextNonSpace = nextNonSpaceIndex !== -1 ? jsonStr[i + 1 + nextNonSpaceIndex] : '';

          const isStartOfString = /[:\[\{,]/.test(prevNonSpace);
          const isEndOfString = /[:\}\]\,]/.test(nextNonSpace);

          if (isStartOfString || isEndOfString) {
            isInsideString = !isInsideString;
            res += char;
          } else {
            res += '\\"';
          }
        } else {
          res += char;
        }
      }
      return res;
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
        console.error("Failed to parse AI JSON after escaping:", parseError);
        console.error("Attempted to parse:", responseText);
        return NextResponse.json({ error: 'AI returned malformed JSON structure', raw: responseText }, { status: 500 });
      }
    }

    // Normalizar a un arreglo de niveles
    let rawLevels: any[] = [];
    if (Array.isArray(parsedResponse)) {
      rawLevels = parsedResponse;
    } else if (parsedResponse.days && Array.isArray(parsedResponse.days)) {
      rawLevels = parsedResponse.days;
    } else if (parsedResponse.mapa_interactivo && Array.isArray(parsedResponse.mapa_interactivo)) {
      rawLevels = parsedResponse.mapa_interactivo;
    } else if (parsedResponse.mapa_aprendizaje && Array.isArray(parsedResponse.mapa_aprendizaje)) {
      rawLevels = parsedResponse.mapa_aprendizaje;
    } else if (parsedResponse.niveles && Array.isArray(parsedResponse.niveles)) {
      rawLevels = parsedResponse.niveles;
    } else {
      rawLevels = [parsedResponse];
    }

    // Mapear y garantizar estructura estándar para el frontend
    const days = rawLevels.map((lvl: any, index: number) => {
      const isLast = index === rawLevels.length - 1 && rawLevels.length > 1;
      const isFirst = index === 0;
      
      const defaultType = isLast ? "boss_fight" : (isFirst ? "concept_story" : "guided_practice");
      const type = lvl.type || defaultType;

      const title = lvl.title || lvl.titulo_nivel || lvl.config_nivel?.titulo || lvl.sesion_id || `Nivel ${index + 1}`;
      const narrative = lvl.narrative || lvl.paso_1_inicio?.narrativa || lvl.config_nivel?.narrativa_inicio || lvl.contexto_narrativo || "";

      const explanationChunks = lvl.content?.explanation?.chunks || 
        (lvl.paso_1_inicio?.oraculo ? [lvl.paso_1_inicio.oraculo] : [lvl.config_nivel?.oraculo_teoria?.contenido_html || ""]);
      const analogy = lvl.content?.explanation?.analogy || lvl.paso_3_cierre?.metacognicion || "";

      const practiceStatement = lvl.content?.practiceProblem?.statement || 
        lvl.originalProblemText || 
        lvl.paso_2_desarrollo?.instruccion || 
        lvl.interaccion_desarrollo?.validacion?.pregunta || 
        "Completa el desafío del nivel para avanzar.";
      const practiceCorrectValue = lvl.content?.practiceProblem?.correctValue ?? 
        lvl.paso_2_desarrollo?.valor_correcto ?? 
        lvl.interaccion_desarrollo?.validacion?.respuesta_esperada ?? 
        "correcto";
      const practiceHint = lvl.content?.practiceProblem?.hint || 
        lvl.hints?.[0] || 
        lvl.paso_2_desarrollo?.pista_socratica || 
        "Piensa en los conceptos revisados en esta sesión.";

      const hints = Array.isArray(lvl.hints) && lvl.hints.length > 0 ? lvl.hints : [practiceHint, "Revisa la teoría del nivel anterior."];

      if (type === "boss_fight" || isLast) {
        return {
          dayNumber: index + 1,
          type: "boss_fight",
          title: title.startsWith("Jefe") ? title : `Jefe Final: ${title}`,
          originalProblemText: lvl.originalProblemText || practiceStatement,
          hints: hints,
          pda_objetivo: lvl.pda_objetivo || "",
          cierre_metacognicion: lvl.cierre_metacognicion || "",
          content: {
            explanation: {
              chunks: explanationChunks,
              analogy: analogy
            },
            practiceProblem: {
              statement: practiceStatement,
              correctValue: practiceCorrectValue,
              hint: practiceHint
            }
          }
        };
      }

      return {
        dayNumber: index + 1,
        type: type,
        title: title,
        narrative: narrative,
        pda_objetivo: lvl.pda_objetivo || "",
        cierre_metacognicion: lvl.cierre_metacognicion || "",
        content: {
          explanation: {
            chunks: explanationChunks,
            analogy: analogy
          },
          practiceProblem: {
            statement: practiceProblemStatement(practiceStatement),
            correctValue: String(practiceCorrectValue),
            hint: practiceHint
          }
        }
      };
    });

    function practiceProblemStatement(st: string): string {
      return st || "Resuelve el problema planteado.";
    }

    // Guardar en cache solo si es una generación estándar multi-nivel
    if (!hasCustomPlan && days.length >= 3) {
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
    }

    return NextResponse.json({
      id: crypto.randomUUID(),
      theme: theme || "clasico",
      title: topic,
      days: days,
      createdAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in AI Generator API:', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar la generación del mundo con IA.' }, { status: 500 });
  }
}

