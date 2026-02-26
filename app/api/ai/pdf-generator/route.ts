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
      }
    });

    const isDemo = file.name === "examen_demo.pdf";
    const prompt = `
# ROL
Actúa como un Analista de Datos Pedagógicos experto en la NEM. Tu función es desglosar documentos de planeación educativa en fragmentos técnicos sin alterar el contenido original.

# OBJETIVO
Extraer cada sesión detallada en el documento y organizarla en un esquema JSON. Debes anonimizar datos personales (nombres de docentes o escuelas) y usar etiquetas genéricas.

${isWord ? `He extraído el siguiente texto de una planeación docente en Word:\n\n--- INICIO --- \n${extractedWordText.substring(0, 40000)}\n--- FIN ---\n` : "He adjuntado a este mensaje un documento PDF con una planeación docente completa.\n"}

# REGLAS DE EXTRACCIÓN (FIDELIDAD TOTAL):
1. IDENTIFICACIÓN CURRICULAR: Extrae la Fase (1 a 6), el Campo Formativo, los PDA y la Metodología (ABP, STEAM, Proyectos Comunitarios o Servicio).
2. SEGMENTACIÓN POR SESIÓN: Por cada sesión o día encontrado en el texto, extrae palabra por palabra:
   - TÍTULO: El nombre de la actividad.
   - TEXTO_BRUTO_SESION: Copia textualmente todo el contenido que pertenece a esa sesión (Inicio, Desarrollo y Cierre juntos), sin omitir detalles. Asegúrate de incluirlo en un solo string largo.
71. PROHIBICIÓN DE RESUMEN O RELLENO: No incluyas descripciones largas. Usa textos concisos.
72. CRÍTICO: Para evitar el truncamiento de datos, tu respuesta debe ser EXTREMADAMENTE MINIMALISTA. Genera solo el array de objetos con "id", "titulo" y "tipo". NO incluyas descripciones largas ni resúmenes en este paso. Asegúrate de cerrar correctamente el array "]" y la llave final "}" del JSON.

# FORMATO DE SALIDA (JSON CRUDO):
{
  "datos_generales": {
    "titulo_proyecto": "",
    "fase": "",
    "metodologia": "",
    "campo_formativo": "",
    "pda_listado": []
  },
  "sesiones_extraidas": [
    {
      "numero": 1,
      "titulo": "",
      "texto_bruto_sesion": "",
      "recursos_mencionados": []
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
      console.error("Initial JSON parse failed, attempting strict extraction:", e);
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          p = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON object found in response");
        }
      } catch (e2) {
        console.error("Strict JSON extraction failed:", e2);
        return NextResponse.json({ error: 'AI returned malformed JSON', raw: responseText }, { status: 500 });
      }
    }

    console.log("Successfully parsed Data Analyst extraction.");

    // Map the new "sesiones_extraidas" format into what the frontend expects
    const extractedDays = p.sesiones_extraidas || [];
    const mappedDays = extractedDays.map((s: any, index: number) => {
      const isLast = index === extractedDays.length - 1; // Boss Fix: Only the last day is the boss
      return {
        dayNumber: s.numero,
        type: isLast ? "boss_fight" : "guided_practice", // Determine type based on being actual last
        title: s.titulo,
        session_start: s.texto_bruto_sesion, // Store the entire raw text here temporarily to pass to Endpoint 2
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
