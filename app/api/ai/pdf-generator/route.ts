import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as mammoth from 'mammoth';

// Allow this route up to 60 seconds to finish (vital for Vercel + slow AI generation)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!process.env.AI_API_KEY) {
      console.error("CRITICAL: AI_API_KEY is not defined");
      return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
    }

    console.log("Reading buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const isWord = file.name.endsWith('.docx') || file.name.endsWith('.doc');
    let extractedWordText = "";

    if (isWord) {
      console.log("Word document detected. Extracting text via mammoth...");
      const result = await mammoth.extractRawText({ buffer });
      extractedWordText = result.value;
    }

    if (file.name === "examen_demo.pdf") {
      console.log("Demo PDF detected. We will instruct the AI to generate a dummy 5-session map.");
    }

    console.log("Sending prompt to Gemini...");
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1, // Low temperature for consistent formatting
        responseMimeType: "application/json",
      }
    });

    const isDemo = file.name === "examen_demo.pdf";
    const prompt = `
# ROL
Eres un Analista de Datos Pedagógicos experto en la Nueva Escuela Mexicana (NEM). Tu función es desglosar documentos de planeación educativa en fragmentos técnicos detallados sin alterar el contenido original.

# OBJETIVO
Extraer CADA sesión del documento y organizarla en un esquema JSON. Debes capturar la mayor cantidad posible de información pedagógica por sesión para que otro sistema pueda generar contenido de aprendizaje autónomo de alta calidad.

${isWord ? `He extraído el siguiente texto de una planeación docente en Word:\n\n--- INICIO --- \n${extractedWordText.substring(0, 50000)}\n--- FIN ---\n` : "He adjuntado a este mensaje un documento PDF con una planeación docente completa.\n"}

# REGLAS DE EXTRACCIÓN:
1. IDENTIFICACIÓN CURRICULAR: Extrae la Fase (1 a 6), el Campo Formativo, los PDA y la Metodología (ABP, STEAM, Proyectos Comunitarios o Servicio).
2. SEGMENTACIÓN DE SESIONES: Para cada sesión extrae:
   - titulo: Un título descriptivo y atractivo
   - resumen_didactico: Resumen DETALLADO (3-5 oraciones) que capture: el concepto central, las actividades planificadas, los materiales mencionados, y el objetivo de aprendizaje. Este resumen es CRÍTICO para la calidad del contenido generado — entre más detallado, mejor.
   - tipo_sesion: Clasifica como "teoria" (explicación de conceptos), "practica" (ejercicios/problemas) o "evaluacion" (examen/proyecto final)
   - recursos_mencionados: Lista de todos los materiales, textos, o recursos que el docente planea usar
3. GARANTÍA JSON: Retorna JSON puro sin bloque markdown. Respeta TODAS las propiedades.
4. NO anonimices los contenidos pedagógicos — solo datos personales.

# FORMATO DE SALIDA (JSON):
{
  "datos_generales": {
    "titulo_proyecto": "Título completo del proyecto o unidad",
    "fase": "1-6",
    "metodologia": "ABP|STEAM|Proyectos Comunitarios|Otro",
    "campo_formativo": "Campo formativo principal",
    "pda_listado": ["PDA 1", "PDA 2"]
  },
  "sesiones_extraidas": [
    {
      "numero": 1,
      "titulo": "Título descriptivo de la sesión",
      "resumen_didactico": "Resumen detallado de 3-5 oraciones con concepto, actividades y objetivo",
      "tipo_sesion": "teoria|practica|evaluacion",
      "recursos_mencionados": ["recurso 1", "recurso 2"]
    }
  ]
}
`;

    const isPdf = !isWord && !isDemo;
    const requestOptions = isPdf ? [
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      }
    ] : prompt;

    const result = await model.generateContent(requestOptions);
    let responseText = result.response.text();
    const candidate = result.response.candidates?.[0];
    const finishReason = candidate?.finishReason || 'UNKNOWN';
    console.log(`Received response from Gemini. Finish Reason: ${finishReason}, Length: ${responseText.length}`);

    // Strict JSON stripping
    responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();

    let p: any = {};
    try {
      p = JSON.parse(responseText);
    } catch (e) {
      console.warn("Initial JSON parse failed, attempting strict extraction & rescue:", e);

      // JSON AST Balancer 
      function repairJson(jsonStr: string) {
        let inString = false;
        let isEscaped = false;
        let stack = [];
        let repaired = "";

        for (let i = 0; i < jsonStr.length; i++) {
          let char = jsonStr[i];
          repaired += char;

          if (inString) {
            if (isEscaped) {
              isEscaped = false;
            } else if (char === '\\') {
              isEscaped = true;
            } else if (char === '"') {
              inString = false;
            }
          } else {
            if (char === '"') {
              inString = true;
            } else if (char === '{' || char === '[') {
              stack.push(char);
            } else if (char === '}' || char === ']') {
              stack.pop();
            }
          }
        }

        if (inString) repaired += '"';

        // Remove trailing commas before adding brackets
        repaired = repaired.replace(/,\s*$/g, '');

        while (stack.length > 0) {
          let char = stack.pop();
          if (char === '{') repaired += '}';
          if (char === '[') repaired += ']';
        }

        // Clean trailing commas right before closing brackets
        for (let i = 0; i < 3; i++) {
          repaired = repaired.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
        }

        return repaired;
      }

      try {
        const repairedRaw = repairJson(responseText);
        p = JSON.parse(repairedRaw);
      } catch (e2) {
        console.error("Advanced JSON extraction failed after AST rescue:", e2);
        return NextResponse.json({ error: 'AI returned malformed JSON even after rescue', raw: responseText }, { status: 500 });
      }
    }

    console.log("Successfully parsed Data Analyst extraction.");

    const extractedDays = p.sesiones_extraidas || [];
    const mappedDays = extractedDays.map((s: any, index: number) => {
      const isLast = index === extractedDays.length - 1;
      // Determine type from AI classification
      let dayType = "guided_practice";
      if (s.tipo_sesion === "teoria") {
        dayType = "concept_story";
      } else if (s.tipo_sesion === "evaluacion") {
        dayType = isLast ? "boss_fight" : "guided_practice";
      }

      // Force last module to be boss_fight if it wasn't already assigned
      if (isLast && dayType !== "boss_fight") {
        dayType = "boss_fight";
      }
      return {
        dayNumber: s.numero,
        type: dayType,
        title: s.titulo,
        session_start: s.resumen_didactico || "",
        session_development: "",
        session_end: "",
        narrative: "(Generando contenido con IA...)",
        content: { practiceProblem: { statement: "(Problema en construcción...)", correctValue: "", hint: "" } },
        isGenerating: true,
        isFinalBoss: isLast
      };
    });

    return NextResponse.json({
      id: crypto.randomUUID(),
      theme: p.datos_generales?.metodologia || "aventura",
      title: p.datos_generales?.titulo_proyecto || "Aventura Generada",
      pedagogy: {
        topic: p.datos_generales?.campo_formativo || "General",
        pda: (p.datos_generales?.pda_listado || []).join(', '),
        grade: `Fase ${p.datos_generales?.fase || "?"}`
      },
      days: mappedDays,
      createdAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in PDF Generator API:', error.stack || error.message || error);

    // Check if it's a content policy rejection
    const errorMessage = error.message || "";
    if (errorMessage.includes("Candidate was blocked due to SAFETY")) {
      return NextResponse.json({ error: 'Gemini bloqueó el contenido por políticas de seguridad.' }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to process PDF and generate world',
      details: errorMessage
    }, { status: 500 });
  }
}
