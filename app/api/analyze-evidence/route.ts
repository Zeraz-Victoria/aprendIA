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
Eres un tutor amable y conciso. Evalúa si la respuesta del estudiante resuelve el problema.

# PROBLEMA:
"""
${context || "Sin contexto."}
"""

# EVIDENCIA O RESPUESTA DEL ALUMNO:
${imageBase64 ? "Analiza la IMAGEN." : `"""\n${textEvidence}\n"""`}

# INSTRUCCIONES RÁPIDAS:
1. Relevancia: Si es irrelevante, basura, o no tiene sentido, es INCORRECTO.
2. Calidad: ¿El razonamiento o resultado aborda correcta y sustancialmente el problema?
3. Retroalimentación (CRÍTICO): Máximo 2 oraciones cortas.

Devuelve SÓLO este JSON crudo:
{
  "studentName": "Nombre legible o null",
  "confidenceScore": 0.9,
  "topic": "Tema clave corto",
  "isCorrect": true,
  "extractedText": "Feedback motivador y corto (máx 20 palabras).",
  "emotionDetected": "Seguro/Motivado/Frustrado/Indeciso/Despistado"
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
