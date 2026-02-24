import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { imageBase64, mimeType, textEvidence, context, studentId, worldId, levelId } = await req.json();

        if (!imageBase64 && !textEvidence) {
            return NextResponse.json({ error: 'Debes enviar texto o una imagen como evidencia' }, { status: 400 });
        }

        if (!process.env.AI_API_KEY) {
            console.error("CRITICAL: AI_API_KEY is not defined in process.env");
            return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash' // Fast, multimodal
        });

        const prompt = `# ROL
Eres un evaluador académico dentro de una plataforma educativa gamificada para alumnos de primaria y secundaria. Tu trabajo es revisar la evidencia que envía un alumno y determinar si resuelve correctamente el problema asignado. Siempre respondes con un tono amable y motivador, como un mentor o guía.

# PROBLEMA ASIGNADO AL ALUMNO
"""
${context || "No se proporcionó contexto del problema."}
"""

# EVIDENCIA ENVIADA POR EL ALUMNO
${imageBase64 ? "Se adjuntó una IMAGEN. Analiza todo lo visible: texto manuscrito, diagramas, operaciones, redacción, dibujos, tablas, etc." : `El alumno escribió lo siguiente:\n"""\n${textEvidence}\n"""`}

# INSTRUCCIONES DE EVALUACIÓN (sigue estos 3 pasos en orden)

## PASO 1 — Identificar la materia
Lee el "PROBLEMA ASIGNADO" y determina de qué materia se trata. Puede ser: matemáticas, español, gramática, ortografía, redacción, ciencias, historia, lógica, u otra. NO asumas que todo es de matemáticas.

## PASO 2 — Verificar relevancia
Determina si la evidencia del alumno tiene relación con el problema asignado.
- Si la imagen muestra algo que NO tiene relación (una pared, un teclado, una selfie, etc.), marca como INCORRECTA.
- Si el texto es basura, vacío o sin sentido ("asdasd", "no sé", "ayuda", "hola"), marca como INCORRECTA.
- Si la evidencia SÍ intenta resolver el problema, pasa al Paso 3.

## PASO 3 — Evaluar calidad de la respuesta
Evalúa si la respuesta del alumno resuelve correctamente el problema asignado:
- ¿La respuesta es completa o le faltan partes importantes?
- ¿El procedimiento o razonamiento es correcto?
- ¿El resultado final es acertado?
Solo marca como CORRECTA si la respuesta aborda el problema de manera sustancial y correcta.

# FORMATO DE RESPUESTA
Devuelve ÚNICAMENTE un objeto JSON crudo (sin bloques de código markdown) con exactamente estos campos:

{
  "studentName": "Nombre del alumno si es legible (null si no se encuentra)",
  "confidenceScore": 0.85,
  "topic": "Tema específico evaluado, ej: 'Signos de puntuación', 'Suma de fracciones', 'Redacción argumentativa'. Si es irrelevante: 'Evidencia Irrelevante/Trampa'",
  "isCorrect": true,
  "extractedText": "Retroalimentación personalizada: si fue irrelevante, pide amablemente que suba evidencia real. Si fue un intento honesto, describe qué hizo el alumno, qué hizo bien, y qué puede mejorar. Sé específico al tema.",
  "emotionDetected": "Una de: 'Seguro', 'Motivado', 'Frustrado', 'Indeciso', 'Despistado'"
}`;


        let result;
        if (imageBase64 && mimeType) {
            const imageParts = [
                {
                    inlineData: {
                        data: imageBase64.split(',')[1] || imageBase64,
                        mimeType
                    },
                },
            ];
            result = await model.generateContent([prompt, ...imageParts]);
        } else {
            result = await model.generateContent(prompt);
        }

        const responseText = result.response.text();

        try {
            // Clean up markdown if the model hallucinated it
            const cleanedText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
            const parsedData = JSON.parse(cleanedText);

            // Persist the AI Analysis in the Database for the Teacher's dossier
            let dbSaveStatus = "skipped";
            if (studentId && worldId && levelId !== undefined) {
                try {
                    const savedEntry = await prisma.evidenceEntry.create({
                        data: {
                            studentId,
                            worldId,
                            levelId: typeof levelId === 'string' ? parseInt(levelId) : levelId,
                            studentAnswer: textEvidence || "IMAGEN ADJUNTA ESCANEADA",
                            isCorrect: parsedData.isCorrect || false,
                            feedback: parsedData.extractedText || "Sin retroalimentación clara.",
                            topic: parsedData.topic,
                            emotionDetected: parsedData.emotionDetected
                        }
                    });
                    console.log("✅ Auto-logged evidence to DB:", savedEntry.id);
                    dbSaveStatus = "saved:" + savedEntry.id;
                } catch (dbErr: any) {
                    console.error("❌ Failed to save EvidenceEntry to Database:", dbErr?.message || dbErr);
                    dbSaveStatus = "error:" + (dbErr?.message || "unknown");
                }
            } else {
                console.log("⏭️ Skipping DB save: Missing studentId, worldId, or levelId:", { studentId, worldId, levelId });
            }

            return NextResponse.json(parsedData);
        } catch {
            console.error("Failed to parse Gemini response as JSON:", responseText);
            return NextResponse.json({ error: 'Failed to parse AI response', rawOutput: responseText }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error('Error in analyze-evidence API:', error);

        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
            console.error(error.stack);
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
