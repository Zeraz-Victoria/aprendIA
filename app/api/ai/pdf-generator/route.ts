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
Eres un experto en diseño instruccional y pedagogía, especializado en la Nueva Escuela Mexicana.
${isDemo ? "REGLA: Este es un archivo de DEMOSTRACIÓN. Invéntate tú mismo un JSON válido de 5 días de aventuras matemáticas básicas sobre 'Fracciones' para Jimena." :
        (isWord ? `He extraído el siguiente texto de una planeación docente en Word:\n\n--- INICIO --- \n${extractedWordText.substring(0, 40000)}\n--- FIN ---\n\nCon base en TODA esta planeación, debes generar una aventura educativa interactiva de matemáticas para niños.`
          : "He adjuntado a este mensaje un documento PDF con una planeación docente completa.\nCon base en TODA la planeación adjunta, debes generar una aventura educativa interactiva de matemáticas para niños.")}

Usa tu mejor juicio para determinar el tema central establecido por el docente, el nivel de dificultad, los objetivos de aprendizaje (PDA, Ejes) y el GRADO ESCOLAR o edad de los alumnos.

REGLA DE ORO, ABSOLUTAMENTE CRÍTICA: La aventura DEBE tener TANTOS DÍAS como SESIONES O ACTIVIDADES vengan detalladas en la planeación.
PROHIBIDO RESUMIR EN 2 O 3 DÍAS. Si la planeación tiene 5 sesiones, el arreglo "days" DEBE tener 5 objetos. Si la planeación tiene 15 sesiones, el arreglo "days" DEBE tener 15 objetos. Cuenta las sesiones antes de generar el JSON y no te detengas hasta incluirlas todas.

Mapea cada sesión de la planeación según su tipo de actividad a uno de los siguientes formatos:
1. "concept_story" para sesiones de "Inicio", teoría o introducción.
2. "guided_practice" para sesiones de "Desarrollo", "Manos a la obra" o práctica.
3. "boss_fight" para sesiones de "Cierre" o evaluación final.

IMPORTANTE FINAL: Genera un objeto en el arreglo "days" por CADA sesión que encuentres en el documento. No te detengas en el día 2; si hay 15 sesiones, genera 15 días.
¡ATENCIÓN! NO GENERES HISTORIAS NI CONTENIDO LARGO EN ESTE PASO. SOLO QUEREMOS EL ESQUELETO (Títulos y Tipos).

La salida DEBE SER ESTRICTAMENTE UN OBJETO JSON VÁLIDO con la siguiente estructura, sin texto antes ni después, sin comentarios:
{
  "title": "Un título genial para la aventura basado en la planeación completa",
  "theme": "detective",
  "pedagogy": {
    "topic": "El tema principal matemático identificado",
    "pda": "El PDA principal extraído o inferido",
    "ejes": ["Eje 1", "Eje 2"],
    "grade": "El grado escolar, nivel cognitivo o edad sugerida de los niños según el documento (ej. 3ro de Primaria)"
  },
  "days": [
    {
      "dayNumber": 1,
      "type": "concept_story",
      "title": "Primera sesión"
    },
    {
      "dayNumber": 2, 
      "type": "guided_practice",
      "title": "Práctica central"
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

    let generatedData;
    try {
      generatedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON: Finish Reason", finishReason);

      try {
        require('fs').writeFileSync(process.cwd() + '/debug-failed-json.txt', `FINISH REASON: ${finishReason}\n\n` + responseText);
      } catch (e) { }

      // Auto-Rescue Mechanism: Sometimes Gemini stops generating exactly on the last string quote.
      try {
        console.log("Attempting to auto-close truncated JSON...");
        let rescued = responseText;
        if (rescued.lastIndexOf('"') > rescued.lastIndexOf('}')) {
          rescued += '"'; // close open string
        }
        if (rescued.includes('"days": [')) {
          rescued += '}]}'
        } else {
          rescued += '}'
        }

        // Final aggressive clean
        rescued = rescued.replace(/,\s*([}\]])/g, '$1'); // remove trailing commas
        generatedData = JSON.parse(rescued);
        console.log("Successfully rescued JSON data automatically.");
      } catch (e) {
        throw new Error(`Estructura JSON inválida. El servidor de IA cortó la respuesta prematuramente (Motivo: ${finishReason}).`);
      }
    }

    console.log("Successfully parsed skeleton data.");

    // Fill the missing fields with temporary empty states so the frontend type checker doesn't panic
    const skeletonDays = generatedData.days.map((day: any) => {
      let emptyContent: any = {};
      if (day.type === 'concept_story') {
        emptyContent = { explanation: { chunks: ["(Narrativa en construcción...)"], analogy: "" } };
      } else if (day.type === 'guided_practice') {
        emptyContent = { practiceProblem: { statement: "(Problema en construcción...)", correctValue: "", hint: "" } };
      } else if (day.type === 'boss_fight') {
        emptyContent = { originalProblemText: "(Examen en construcción...)", solvedVariations: [] };
      }

      return {
        ...day,
        narrative: "(Pensando la historia...)",
        content: emptyContent,
        isGenerating: true // Custom flag so the frontend knows this day needs its content generated
      };
    });

    return NextResponse.json({
      id: crypto.randomUUID(),
      theme: generatedData.theme || "detective",
      title: generatedData.title || `Aventura de la Planeación`,
      pedagogy: generatedData.pedagogy,
      days: skeletonDays,
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
