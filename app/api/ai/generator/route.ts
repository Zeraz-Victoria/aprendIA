import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { checkAndSuspendSchool } from "@/lib/subscription";
import { findRelevantPages } from '@/lib/textbooks';
import fs from 'fs';
import path from 'path';



export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const rawApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/['"]/g, '').trim();
    if (!apiKey) throw new Error('API Key missing');
    const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const { theme, topic, problemDescription = "", dificultad = "Básico", metodologia = "ABP", diagnostico = "Ninguno", sessionCount = 3, session_title, session_start, session_development, session_end, phase = "3", grade, modality } = await req.json();

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
        if (parsedCached.days) {
          return NextResponse.json({
            id: crypto.randomUUID(),
            theme: theme,
            title: parsedCached.title || `Aventura de ${topic}`,
            days: parsedCached.days,
            pedagogy: parsedCached.pedagogy,
            createdAt: new Date().toISOString()
          });
        }
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
    
    // Buscar contenido y PDA oficiales en nuestra base de datos Fase 6
    const officialMatch = findOfficialPda(topic, grade);
    let officialPdaContext = "";
    if (officialMatch) {
      officialPdaContext = `
# CONTENIDO Y PDA OFICIAL DE REFERENCIA (DEBES ALINEARTE A ESTOS):
- Asignatura Oficial: ${officialMatch.subject}
- Contenido Oficial NEM: ${officialMatch.content}
- Proceso de Desarrollo de Aprendizaje (PDA) Oficial: ${officialMatch.pda}
- Grado: ${officialMatch.grade}

*INSTRUCCIÓN CRÍTICA DE ALINEACIÓN CURRICULAR*:
TÚ DEBES basar el diseño del proyecto, las explicaciones teóricas y la secuencia didáctica ESTRICTAMENTE en este Contenido y PDA oficiales de arriba. Toda la planeación didáctica y las dinámicas del juego deben estar dirigidas a cumplir este PDA.
`;
    }
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        maxOutputTokens: 8192, // Max for Gemini 1.5 Flash (gemini-flash-latest)
        temperature: 0.4,
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    // Buscar páginas de libros de texto de apoyo relevantes
    let booksContext = "";
    let relevantPages: any[] = [];
    try {
      relevantPages = await findRelevantPages(topic, 4, grade, modality);
      if (relevantPages.length > 0) {
        booksContext = relevantPages.map(page => 
          `- Libro: "${page.bookTitle}" | Página: ${page.pageNumber} | PDF: "${page.pdfUrl}" | Contexto: "${page.snippet}"`
        ).join('\n');
      }
    } catch (err) {
      console.error("Error fetching relevant pages for prompt:", err);
    }

    // Leer la guía metodológica oficial
    let abpGuide = "";
    try {
      const guidePath = path.join(process.cwd(), 'books_markdown/abp/abp_methodology_guide.md');
      if (fs.existsSync(guidePath)) {
        abpGuide = fs.readFileSync(guidePath, 'utf8');
      }
    } catch (e) {
      console.error("Error reading abp guide:", e);
    }

    const prompt = `
# PERFIL: DOCTOR EN PEDAGOGÍA, DISEÑADOR DE VIDEOJUEGOS EDUCATIVOS Y ESPECIALISTA NEM 2022
Tu misión es actuar como un diseñador instruccional y de gamificación de élite. Debes transformar el tema, asignatura o Campo Formativo solicitado (sea Español, Historia, Geografía, Matemáticas, Ciencias, etc.) en una aventura de aprendizaje inmersiva de alto impacto y rigor pedagógico.

# FILOSOFÍA DE APRENDIZAJE AUTODIDACTA (CRÍTICO):
Toda la aventura debe estar diseñada para que el alumno sea 100% AUTODIDACTA. La narrativa del juego, la explicación teórica de los "chunks" y las analogías en el "mapa_interactivo" deben ser tan claras, completas y autónomas que el alumno sea capaz de comprender el tema y resolver todos los desafíos (minijuegos y problemas de práctica) de forma independiente, sin necesidad de que el profesor le explique el tema previamente.
Por consecuencia:
1. El juego del alumno ("mapa_interactivo") y la planeación del profesor ("plano_didactico" -> "secuencia_didactica") deben ser una misma ruta de aprendizaje unificada.
2. La "secuencia_didactica" debe estructurar las actividades del profesor puramente como supervisor, facilitador de dudas socráticas, y tutor que guía al alumno en el uso autónomo del juego y la consulta física de las lecturas recomendadas en sus libros de texto. El profesor no imparte clases magistrales ni explicaciones directas, solo monitorea y acompaña.

# 1. DATOS DE ENTRADA:
- Tema / Problemática: ${topic}
${problemDescription ? `- Descripción de la problemática a atender: ${problemDescription}` : ''}
- Diagnóstico de Aula: ${diagnostico}
- Metodología NEM: ${metodologia}
- Fase NEM: ${phase}
- Nivel de Dificultad: ${dificultad}
- Tema Visual para Gamificación: ${theme}
- Sesiones Requeridas: EXACTAMENTE ${sessionCount} sesiones.
${officialPdaContext}

# GUÍA METODOLÓGICA DE PROYECTOS OFICIAL (TU CEREBRO Y PAUTA DE DISEÑO):
Debes basar el diseño de la secuencia didáctica y del mapa del estudiante ESTRICTAMENTE en la metodología NEM seleccionada: "${metodologia}".
Sigue el flujo, fases y momentos específicos que describe la guía oficial de abajo para estructurar las sesiones. Cada una de las ${sessionCount} sesiones debe representar de forma secuencial una de las fases o momentos de esta metodología:
*IMPORTANTE (ANTI-RECITACIÓN)*: Queda terminantemente prohibido copiar textualmente las oraciones o descripciones de las fases y momentos de la guía. Debes explicar las actividades en tus propias palabras y adaptarlas a la temática visual del juego.
---
${abpGuide}
---

# 2. ADAPTACIÓN AL DIAGNÓSTICO DE AULA (CRÍTICO):
Analiza el "Diagnóstico de Aula" y adapta dinámicamente todo el contenido bajo las siguientes reglas:
- Si el diagnóstico indica rezago, barreras de aprendizaje o dificultades específicas, simplifica la complejidad del lenguaje, añade analogías más visuales y físicas, y desglosa los procedimientos en pasos más pequeños (micro-pasos).
- Si el diagnóstico indica alumnos sobresalientes o alta motivación, aumenta el nivel de reto cognitivo de los problemas prácticos, plantea preguntas más abiertas e introduce mayor profundidad analítica.

# 3. ANDAMIAJE PEDAGÓGICO DE LA AVENTURA (SCROLL PROGRESSION):
Las ${sessionCount} sesiones deben tener una progresión de dificultad y aprendizaje estructurada de la siguiente manera:
- **Fase de Apertura (Primer 25% de las sesiones)**: Foco en la conceptualización base, exploración y conexión del tema con saberes previos. Explicación intuitiva.
- **Fase de Desarrollo (Siguiente 50% de las sesiones)**: Foco en la explicación profunda de conceptos, procedimientos, algoritmos o métodos paso a paso según la asignatura, y resolución guiada de actividades o ejercicios prácticos.
- **Fase de Cierre y Boss Fight (Último 25% de las sesiones)**: Foco en la transferencia de conocimiento, aplicaciones complejas a problemáticas comunitarias y síntesis total del contenido para derrotar al jefe final.

# 4. INTEGRACIÓN NARRATIVA ORGÁNICA (GAMIFICACIÓN PROFUNDA):
No separes el contenido educativo de la fantasía. Integra el "Tema Visual para Gamificación" (${theme}) dentro del núcleo de la enseñanza:
- **Narrativa del nivel**: Debe contar una historia secuencial donde el alumno avanza resolviendo misterios, ayudando a personajes, o interactuando con el entorno del tema visual.
- **Explicaciones y Problemas**: El ejemplo resuelto y los problemas prácticos DEBEN usar elementos del tema visual (ej. si el tema es "Piratas", el problema debe involucrar monedas de oro, barcos, islas o raciones de agua, no manzanas genéricas).

# 5. REGLAS DE CONTENIDO TEÓRICO (EXPLANATION.CHUNKS):
- **Explicación Teórica ("explanation")**: Divide la teoría en exactamente 3 secciones/partes ("chunks") que sigan esta estructura estricta:
  1. **¿Qué es y cómo funciona?**: Comienza con "## ¿Qué es y cómo funciona? — [Definición profunda y detallada del concepto. Explica el funcionamiento, reglas o fórmulas de manera completa paso a paso, con un mínimo de 6 a 8 oraciones ricas en contenido]".
  2. **Ejemplo Resuelto**: Comienza con "## Ejemplo resuelto — [Problema práctico resuelto detalladamente paso a paso con la temática]".
  3. **Conexión con el Mundo Real**: Comienza con "## Conexión con el mundo real — [Dato de relevancia cotidiana o curiosidad asombrosa en 2 oraciones]".
  *IMPORTANTE* (LÍMITE DE MAPA INTERACTIVO Y CONCISIÓN):
  - Si el total de sesiones solicitadas es mayor a 2 (${sessionCount} > 2), DEBES generar objetos de nivel detallados únicamente para las primeras 2 sesiones en el arreglo "mapa_interactivo". NO generes las sesiones a partir de la 3 en adelante en el mapa interactivo; el servidor se encargará de crear los esqueletos automáticamente. El arreglo "mapa_interactivo" en tu respuesta JSON debe tener como máximo 2 elementos.
  - La sección "secuencia_didactica" del docente (las listas de "inicio", "desarrollo" y "cierre") SÍ debe contener todas las ${sessionCount} sesiones detalladas. Escribe exactamente 1 sola oración corta, directa y concisa por fase (inicio, desarrollo y cierre) de la secuencia docente para evitar exceder los límites de tokens.
  - El campo "diagnostico_pedagogico" y "proposito" deben tener como máximo 2 oraciones.
  - Toda la riqueza de contenido de aprendizaje debe residir en la teoría de "chunks" de los primeros 2 niveles generados.



# 6. RETROALIMENTACIÓN SOCRÁTICA ENRIQUECIDA (MINIJUEGOS):
- **Word Search / Memory Match**: Selecciona términos clave significativos y definiciones precisas alineadas a la Fase NEM.
- **Multiple Choice**: La pregunta debe evaluar comprensión profunda, no memorización. 
- **feedbackError (Crítico)**: No digas "Incorrecto". Explica el error común específico en el que pudo incurrir el alumno y dale una pista reflexiva (socrática) para que halle la respuesta correcta por sí mismo.
- **feedbackSuccess**: Valida el éxito conectándolo con el progreso de la aventura.

# 7. INSTRUCCIONES DE FORMATO JSON (CRÍTICO PARA EVITAR ERRORES):
- El retorno debe ser exclusivamente el JSON estructurado solicitado, sin explicaciones ni tags markdown de bloque como \`\`\`json.
- Para evitar que el JSON sea inválido:
  1. Todos los saltos de línea (line breaks) dentro de los strings (cadenas de texto) DEBEN ser escapados como \\n. Nunca dejes un salto de línea real (Enter) dentro de un valor de texto.
  2. REGLA SOBERANA DE COMILLAS: Prohibido usar comillas dobles (") dentro de tus textos (ej. explicaciones, historias, diálogos, etc.). Si necesitas citar algo o destacar palabras, utiliza obligatoriamente comillas angulares (« ») o comillas simples (' '). Las comillas dobles (") en tu respuesta deben ser exclusivamente para abrir/cerrar propiedades y cadenas del JSON.
  3. No utilices caracteres especiales no válidos o fórmulas en formato LaTeX que contengan barras invertidas no escapadas.
  4. REGLA DE REDACCIÓN (PROHIBIDO COPIAR TEXTOS LITERALES): Está terminantemente prohibido copiar oraciones o textos de manera literal de los fragmentos de libros provistos. Debes reescribir y parafrasear toda la información didáctica con tus propias palabras adaptadas al nivel del estudiante. Copiar texto literal activará los filtros de derechos de autor (recitation checks) de Google e interrumpirá la generación de forma abrupta.

# 8. LIBROS DE TEXTO DE APOYO DISPONIBLES:
Aquí tienes fragmentos reales y referencias de los libros de texto oficiales de 1er Grado Telesecundaria que coinciden con el tema "${topic}". Utiliza esta información para enriquecer los contenidos teóricos y asigna obligatoriamente cuáles de estas lecturas se recomiendan para cada sesión:
${booksContext || "No se encontraron páginas de apoyo en la base de datos."}

*REGLA CRÍTICA Y SOBERANA DE LIBROS (CERO ALUCINACIÓN)*:
1. Solo puedes incluir lecturas que aparezcan explícitamente listadas en la sección "LIBROS DE TEXTO DE APOYO DISPONIBLES" de arriba.
2. Está TERMINANTEMENTE PROHIBIDO inventar nombres de libros, inventar números de páginas que no estén en la lista, inventar temas o rutas de archivos PDF.
3. Si el libro y la página no están en la lista de arriba, NO los agregues. Si la lista está vacía, el arreglo "lecturas_sugeridas" debe ser estrictamente vacío: [].
4. Copia los campos "libro", "pagina" y "pdfUrl" EXACTAMENTE tal como aparecen en la lista de arriba. No los modifiques ni un solo carácter.

Estructura de "lecturas_sugeridas":
"lecturas_sugeridas": [
  {
    "libro": "Nombre exacto del libro (ej. Saberes y Pensamiento Científico - Primer Grado Telesecundaria)",
    "pagina": número_de_pagina (ej. 47),
    "tema": "Tema, título principal o concepto clave de esa página (ej. Factores externos que modelan el relieve)",
    "pdfUrl": "Ruta exacta del PDF (ej. /libros de texto/libros primero/1_TS-ENS-BAJA.pdf)"
  }
]

# FORMATO DE SALIDA (JSON ÚNICAMENTE):
Genera un objeto JSON puro, sin etiquetas markdown ("\`\`\`json", etc.), con esta estructura exacta:
{
  "plano_didactico": {
    "encabezado": { "proyecto": "Título del proyecto sumamente creativo, llamativo y gamificado que conecte el tema y la problemática (evita usar la palabra 'Aventura de...' de forma genérica, inventa algo único que enganche)", "fase": "${phase}", "metodologia": "${metodologia}", "num_sesiones": ${sessionCount} },
    "diagnostico_pedagogico": "Análisis didáctico adaptado al diagnóstico del docente",
    "estructura_curricular": {
      "campos_formativos": ["Campos oficiales correspondientes (ej. Lenguajes, Saberes y Pensamiento Científico)"],
      "contenido": "Contenido del programa sintético oficial (ej. La diversidad étnica, cultural y lingüística...)",
      "ejes_articuladores": ["Ejes oficiales correspondientes"],
      "proposito": "Propósito general del proyecto de impacto social",
      "pda": "Procesos de Desarrollo de Aprendizaje (PDA) oficiales vinculados"
    },
    "secuencia_didactica": [
      {
        "numero": 1,
        "titulo": "Título formal de la sesión",
        "duracion": "60 min",
        "inicio": ["Actividad de inicio del docente (máx 1 oración)"],
        "desarrollo": ["Guía del docente en el juego (máx 1 oración)"],
        "cierre": ["Reflexión socrática guiada (máx 1 oración)"],
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
       "lecturas_sugeridas": [
          { "libro": "Nombre del Libro", "pagina": 47, "tema": "Título o tema de la página", "pdfUrl": "/libros de texto/libros primero/1_TS-ENS-BAJA.pdf" }
       ],
       "session_start": "Instrucción de inicio al alumno (máx 1 oración)",
       "session_development": "Desafío del minijuego (máx 1 oración)",
       "session_end": "Cierre y logro del nivel (máx 1 oración)",
       "narrative": "Narrativa inmersiva del nivel (máx 2 oraciones)",
       "content": {
          "explanation": { 
             "chunks": [
                "## ¿Qué es y cómo funciona? — [Definición profunda y detallada del concepto. Explica el funcionamiento, reglas o fórmulas de manera completa paso a paso, con un mínimo de 6 a 8 oraciones ricas en contenido]",
                "## Ejemplo resuelto — [Problema práctico resuelto detalladamente paso a paso con la temática]",
                "## Conexión con el mundo real — [Dato de relevancia cotidiana o curiosidad asombrosa en 2 oraciones]"
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
             "statement": "Reto, ejercicio práctico o pregunta de análisis y reflexión contextualizada a la narrativa para registrar en cuaderno (adecuada a la asignatura)",
             "correctValue": "Respuesta exacta esperada, valor numérico o criterio de respuesta correcta",
             "hint": "Pista reflexiva final"
          }
       }
    }
  ]
}

REGLA DE ORO: El arreglo "secuencia_didactica" dentro de "plano_didactico" DEBE contener EXACTAMENTE ${sessionCount} elementos. Sin embargo, el arreglo "mapa_interactivo" debe contener únicamente los primeros 2 elementos (si ${sessionCount} > 2) para optimizar el tamaño de la respuesta. Ambas deben empalmar lógicamente. Ningún valor numérico debe fallar. Retorna SOLO el JSON.
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

          console.log("Raw AI Response completed. Length:", responseText.length, "Finish Reason:", result.response.candidates?.[0]?.finishReason);

          // Extract JSON block if wrapped in text or markdown
          const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                            responseText.match(/```\n([\s\S]*?)\n```/) ||
                            responseText.match(/{[\s\S]*}/);
          if (jsonMatch) {
            responseText = jsonMatch[1] || jsonMatch[0];
          }
          responseText = responseText.trim();

          const repairJson = (jsonStr: string): string => {
            jsonStr = jsonStr.trim();
            const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || 
                              jsonStr.match(/```\n([\s\S]*?)\n```/) ||
                              jsonStr.match(/{[\s\S]*}/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1] || jsonMatch[0];
            }
            jsonStr = jsonStr.trim();

            let repaired = '';
            let inString = false;
            let isEscaped = false;
            
            const contextStack: ('object' | 'array')[] = [];
            let expect: 'value' | 'key_or_close' | 'value_or_close' | 'colon' | 'comma_or_close' | 'key' = 'value';

            let lastKeyStart = -1;
            let lastValueStart = -1;

            for (let i = 0; i < jsonStr.length; i++) {
              const char = jsonStr[i];

              if (inString) {
                if (isEscaped) {
                  repaired += char;
                  isEscaped = false;
                } else if (char === '\\') {
                  repaired += char;
                  isEscaped = true;
                } else if (char === '\n') {
                  repaired += '\\n';
                } else if (char === '\r') {
                  repaired += '\\r';
                } else if (char === '\t') {
                  repaired += '\\t';
                } else if (char === '"') {
                  let nextNonWs = '';
                  for (let j = i + 1; j < jsonStr.length; j++) {
                    if (!/\s/.test(jsonStr[j])) {
                      nextNonWs = jsonStr[j];
                      break;
                    }
                  }

                  let isClosing = false;
                  if (expect === 'key' || expect === 'key_or_close') {
                    if (nextNonWs === ':') {
                      isClosing = true;
                    }
                  } else {
                    if (nextNonWs === '}' || nextNonWs === ']' || nextNonWs === '') {
                      isClosing = true;
                    } else if (nextNonWs === ',') {
                      let nextAfterComma = '';
                      const commaIdx = jsonStr.indexOf(',', i + 1);
                      if (commaIdx !== -1) {
                        for (let j = commaIdx + 1; j < jsonStr.length; j++) {
                          if (!/\s/.test(jsonStr[j])) {
                            nextAfterComma = jsonStr[j];
                            break;
                          }
                        }
                      }
                      const parent = contextStack[contextStack.length - 1];
                      if (parent === 'object') {
                        if (commaIdx !== -1) {
                          const remaining = jsonStr.slice(commaIdx + 1).trim();
                          if (remaining === '' || remaining.startsWith('}') || /^"[a-zA-Z0-9_]+"\s*:/.test(remaining)) {
                            isClosing = true;
                          }
                        } else {
                          isClosing = true;
                        }
                      } else if (parent === 'array') {
                        if (nextAfterComma === '' || nextAfterComma === ']' || /["\d\-\{\[tfn]/.test(nextAfterComma)) {
                          isClosing = true;
                        }
                      } else {
                        isClosing = true;
                      }
                    }
                  }

                  if (isClosing) {
                    inString = false;
                    repaired += char;
                    if (expect === 'key' || expect === 'key_or_close') {
                      expect = 'colon';
                    } else {
                      expect = 'comma_or_close';
                    }
                  } else {
                    repaired += '\\"';
                  }
                } else {
                  repaired += char;
                }
              } else {
                if (char === '"') {
                  inString = true;
                  if (expect === 'key' || expect === 'key_or_close') {
                    lastKeyStart = repaired.length;
                  } else {
                    lastValueStart = repaired.length;
                  }
                  repaired += char;
                } else if (char === '{') {
                  contextStack.push('object');
                  expect = 'key_or_close';
                  lastValueStart = repaired.length;
                  repaired += char;
                } else if (char === '[') {
                  contextStack.push('array');
                  expect = 'value_or_close';
                  lastValueStart = repaired.length;
                  repaired += char;
                } else if (char === '}') {
                  if (contextStack[contextStack.length - 1] === 'object') {
                    contextStack.pop();
                    expect = contextStack.length === 0 ? 'value' : 'comma_or_close';
                  }
                  repaired += char;
                } else if (char === ']') {
                  if (contextStack[contextStack.length - 1] === 'array') {
                    contextStack.pop();
                    expect = contextStack.length === 0 ? 'value' : 'comma_or_close';
                  }
                  repaired += char;
                } else if (char === ':') {
                  if (expect === 'colon') {
                    expect = 'value';
                  }
                  repaired += char;
                } else if (char === ',') {
                  const currentContext = contextStack[contextStack.length - 1];
                  if (currentContext === 'object') {
                    expect = 'key';
                  } else if (currentContext === 'array') {
                    expect = 'value';
                  }
                  repaired += char;
                } else {
                  if (!/\s/.test(char)) {
                    if (expect === 'value' || expect === 'value_or_close') {
                      lastValueStart = repaired.length;
                    }
                  }
                  repaired += char;
                }
              }
            }

            if (inString) {
              repaired += '"';
              if (expect === 'key' || expect === 'key_or_close') {
                expect = 'colon';
              } else {
                expect = 'comma_or_close';
              }
            }

            if (expect === 'colon' && lastKeyStart !== -1) {
              repaired = repaired.slice(0, lastKeyStart).trimEnd();
              if (repaired.endsWith(',')) {
                repaired = repaired.slice(0, -1).trimEnd();
              }
              expect = 'comma_or_close';
            }

            if (expect === 'value') {
              const currentContext = contextStack[contextStack.length - 1];
              if (currentContext === 'object') {
                if (lastKeyStart !== -1) {
                  repaired = repaired.slice(0, lastKeyStart).trimEnd();
                  if (repaired.endsWith(',')) {
                    repaired = repaired.slice(0, -1).trimEnd();
                  }
                }
              } else if (currentContext === 'array') {
                const lastComma = repaired.lastIndexOf(',');
                if (lastComma !== -1 && lastComma >= repaired.length - 5) {
                  repaired = repaired.slice(0, lastComma).trimEnd();
                }
              }
            }

            repaired = repaired.trimEnd();
            if (repaired.endsWith(',')) {
              repaired = repaired.slice(0, -1).trimEnd();
            }

            while (contextStack.length > 0) {
              const open = contextStack.pop();
              if (open === 'object') {
                repaired += '}';
              } else if (open === 'array') {
                repaired += ']';
              }
            }

            return repaired;
          };

          let parsedResponse;
          try {
            parsedResponse = JSON.parse(responseText);
          } catch (initialError: any) {
            console.error("JSON Parse inicial falló:", initialError.message);
            const posMatch = initialError.message.match(/at position (\d+)/) || initialError.message.match(/column (\d+)/);
            if (posMatch) {
              const pos = parseInt(posMatch[1], 10);
              const startPos = Math.max(0, pos - 100);
              const endPos = Math.min(responseText.length, pos + 100);
              console.log(`Contexto original del error inicial (posición ${pos}):`);
              console.log(responseText.substring(startPos, endPos));
              console.log("^".padStart(pos - startPos + 1));
            }
            
            responseText = repairJson(responseText);
            try {
              parsedResponse = JSON.parse(responseText);
            } catch (parseError: any) {
              console.error("JSON Parse secundario falló:", parseError.message);
              // Extract error position from message if possible
              const secPosMatch = parseError.message.match(/at position (\d+)/) || parseError.message.match(/column (\d+)/);
              if (secPosMatch) {
                const pos = parseInt(secPosMatch[1], 10);
                const startPos = Math.max(0, pos - 100);
                const endPos = Math.min(responseText.length, pos + 100);
                console.log(`Contexto alrededor de la posición del error secundario (${pos}):`);
                console.log(responseText.substring(startPos, endPos));
                console.log("^".padStart(pos - startPos + 1));
              }
              throw new Error("La IA retornó una estructura JSON malformada que no se pudo reparar: " + parseError.message);
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
                let chunks: string[] = [];
                if (typeof rawChunks === 'string') {
                    chunks = rawChunks.split(/(?=^##+ )|(?=^\*\*)/gm).map((p: string) => p.trim()).filter(Boolean);
                } else if (Array.isArray(rawChunks)) {
                    if (rawChunks.length === 1 && typeof rawChunks[0] === 'string' && rawChunks[0].includes('##')) {
                        chunks = rawChunks[0].split(/(?=^##+ )|(?=^\*\*)/gm).map((p: string) => p.trim()).filter(Boolean);
                    } else {
                        chunks = rawChunks.map((c: any) => typeof c === 'string' ? c.trim() : String(c)).filter(Boolean);
                    }
                }
                if (chunks.length === 0) {
                    chunks = [nivel.paso_1_inicio?.oraculo || "Explora el mapa."];
                }
                days.push({
                  dayNumber: index + 1,
                  type: nivel.type || "guided_practice",
                  title: nivel.title || nivel.titulo || "Sesión Interactiva",
                  narrative: nivel.narrative || nivel.narrativa || "(Historia AI)",
                  session_start: nivel.session_start || "",
                  session_development: nivel.session_development || "",
                  session_end: nivel.session_end || "",
                  lecturas_sugeridas: sanitizeSuggestedReadings(nivel.lecturas_sugeridas || nivel.lecturas || [], relevantPages),
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

            // Lógica programática para rellenar de forma diferida las sesiones a partir de la 3 en adelante
            if (days.length < sessionCount) {
              const secuenciaDidactica = planoDidactico.secuencia_didactica || [];
              for (let i = days.length; i < sessionCount; i++) {
                const sessionPlan = secuenciaDidactica[i] || (secuenciaDidactica.length > 0 ? secuenciaDidactica[secuenciaDidactica.length - 1] : {});
                days.push({
                  dayNumber: i + 1,
                  type: (i === sessionCount - 1) ? "boss_fight" : "concept_story",
                  title: sessionPlan.titulo || `Sesión ${i + 1}`,
                  narrative: "Generando contenido con IA...",
                  session_start: Array.isArray(sessionPlan.inicio) ? sessionPlan.inicio.join('\n') : (sessionPlan.inicio || ""),
                  session_development: Array.isArray(sessionPlan.desarrollo) ? sessionPlan.desarrollo.join('\n') : (sessionPlan.desarrollo || ""),
                  session_end: Array.isArray(sessionPlan.cierre) ? sessionPlan.cierre.join('\n') : (sessionPlan.cierre || ""),
                  lecturas_sugeridas: [],
                  isGenerating: true,
                  content: {
                    explanation: { chunks: ["Generando contenido con IA..."], analogy: "" },
                    miniGame: {
                      type: "Word Search",
                      question: "Cargando minijuego...",
                      options: [],
                      correctAnswer: "",
                      feedbackSuccess: "¡Correcto!",
                      feedbackError: "Inténtalo de nuevo."
                    },
                    practiceProblem: {
                      statement: "Generando...",
                      correctValue: "",
                      hint: ""
                    }
                  }
                });
              }
            }

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
          const generatedTitle = planoDidactico.encabezado?.proyecto || topic;

          const payload = {
            id: crypto.randomUUID(),
            theme: "custom",
            title: generatedTitle,
            days: days,
            pedagogy: {
              topic: topic,
              pda: officialMatch?.pda || planoDidactico.estructura_curricular?.pda || parsedResponse.metadatos_nem?.pda || "Inferencia didáctica",
              grade: `Fase ${planoDidactico.encabezado?.fase || parsedResponse.metadatos_nem?.fase || "3"}`,
              proposito: planoDidactico.estructura_curricular?.proposito || parsedResponse.metadatos_nem?.proposito || "",
              diagnostico: planoDidactico.diagnostico_pedagogico || parsedResponse.metadatos_nem?.diagnostico || "",
              contenidos: officialMatch?.content || planoDidactico.estructura_curricular?.contenido || parsedResponse.metadatos_nem?.contenidos || topic,
              camposFormativos: officialMatch ? [getCampoFormativo(officialMatch.subject)] : (planoDidactico.estructura_curricular?.campos_formativos || (parsedResponse.metadatos_nem?.campos_formativos ? [parsedResponse.metadatos_nem.campos_formativos] : [])),
              planoOficial: planoDidactico
            },
            createdAt: new Date().toISOString()
          };

          try {
            //@ts-ignore
            await prisma.aIPromptCache.create({
              data: {
                topic: safeCacheKey,
                theme: theme.toLowerCase().trim(),
                response: JSON.stringify({
                  title: payload.title,
                  days: payload.days,
                  pedagogy: payload.pedagogy
                })
              }
            });
          } catch (cacheError) { console.log('Cache save skipped'); }

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

function sanitizeSuggestedReadings(aiReadings: any[], verifiedPages: any[]) {
  if (!Array.isArray(aiReadings) || !Array.isArray(verifiedPages) || verifiedPages.length === 0) {
    return [];
  }
  
  const sanitized: any[] = [];
  
  for (const item of aiReadings) {
    if (!item) continue;
    
    const match = verifiedPages.find(p => {
      const pageNumMatch = Number(p.pageNumber) === Number(item.pagina || item.pageNumber || item.page);
      
      const itemPdf = item.pdfUrl || item.pdf || item.url || '';
      const pdfMatch = p.pdfUrl && itemPdf && p.pdfUrl.toLowerCase().trim() === itemPdf.toLowerCase().trim();
      
      const itemLibro = item.libro || item.book || item.bookTitle || '';
      const titleMatch = p.bookTitle && itemLibro && p.bookTitle.toLowerCase().replace(/[^a-z0-9]/g, '') === itemLibro.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      return pageNumMatch && (pdfMatch || titleMatch);
    });
    
    if (match) {
      sanitized.push({
        libro: match.bookTitle,
        pagina: Number(match.pageNumber),
        tema: item.tema || match.snippet || "Lectura de apoyo",
        pdfUrl: match.pdfUrl
      });
    }
  }
  
  return sanitized;
}

interface PdaItem {
  grade: string;
  subject: string;
  content: string;
  pda: string;
}

function findOfficialPda(topic: string, grade: string): PdaItem | null {
  try {
    const jsonPath = path.join(process.cwd(), 'lib', 'nem_fase6_pda.json');
    if (!fs.existsSync(jsonPath)) {
      return null;
    }
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const pdas: PdaItem[] = JSON.parse(rawData);
    
    let filtered = pdas;
    if (grade) {
      const cleanGrade = grade.toLowerCase();
      if (cleanGrade.includes("secundaria 1") || cleanGrade.includes("1º") || cleanGrade.includes("1°")) {
        filtered = pdas.filter(p => p.grade === "Secundaria 1");
      } else if (cleanGrade.includes("secundaria 2") || cleanGrade.includes("2º") || cleanGrade.includes("2°")) {
        filtered = pdas.filter(p => p.grade === "Secundaria 2");
      } else if (cleanGrade.includes("secundaria 3") || cleanGrade.includes("3º") || cleanGrade.includes("3°")) {
        filtered = pdas.filter(p => p.grade === "Secundaria 3");
      }
    }
    
    const keywords = topic.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2);
      
    if (keywords.length === 0) {
      return null;
    }
    
    let bestMatch: PdaItem | null = null;
    let highestScore = 0;
    
    for (const item of filtered) {
      let score = 0;
      const contentClean = item.content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const pdaClean = item.pda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const subjectClean = item.subject.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      for (const kw of keywords) {
        if (contentClean.includes(kw)) {
          score += 5;
        }
        if (pdaClean.includes(kw)) {
          score += 3;
        }
        if (subjectClean.includes(kw)) {
          score += 1;
        }
      }
      
      if (topic.toLowerCase().trim() === item.subject.toLowerCase().trim()) {
        score += 10;
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }
    
    return highestScore > 0 ? bestMatch : null;
  } catch (err) {
    console.error("Error in findOfficialPda:", err);
    return null;
  }
}

function getCampoFormativo(subject: string): string {
  const clean = subject.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (["espanol", "ingles", "artes"].some(s => clean.includes(s))) {
    return "Lenguajes";
  }
  if (["matematicas", "biologia", "fisica", "quimica", "ciencias"].some(s => clean.includes(s))) {
    return "Saberes y Pensamiento Científico";
  }
  if (["geografia", "historia", "formacion civica", "f.c.e"].some(s => clean.includes(s))) {
    return "Ética, Naturaleza y Sociedades";
  }
  if (["tecnologia", "tutoria", "educacion fisica", "edu.fis"].some(s => clean.includes(s))) {
    return "De lo Humano y lo Comunitario";
  }
  return "Lenguajes";
}
