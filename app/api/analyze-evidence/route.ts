import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { imageBase64, mimeType, textEvidence, context, narrative, studentId, worldId, levelId } = await req.json();

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
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:

Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado estrictamente en la Nueva Escuela Mexicana (NEM). Este contrato rige todas las llamadas a la API, incluyendo el análisis de evidencias. Tu misión es evaluar formativamente si la evidencia del estudiante cumple el desafío técnico planteado en la planeación.

# DESAFÍO TÉCNICO A EVALUAR (LA TAREA):
"""
${context || "Sin contexto de tarea."}
"""

# CONTEXTO NARRATIVO (LA AMBIENTACIÓN):
"""
${narrative || "Sin contexto narrativo."}
"""

# EVIDENCIA O RESPUESTA DEL ALUMNO:
${imageBase64 ? "Analiza la IMAGEN adjunta." : `"""\n${textEvidence}\n"""`}

# INSTRUCCIONES DE EVALUACIÓN SOBERANAS:
1. COMPARACIÓN OBLIGATORIA: Tu fuente de verdad es el 'DESAFÍO TÉCNICO'. Debes validar si el alumno ejecutó la instrucción específica del docente (ej. resolvió la división, usó comas, identificó el signo).
2. PROHIBICIÓN DE REPETICIÓN: No repitas el texto del problema ni el contexto narrativo en el feedback. Tu tarea es EVALUAR el desempeño, no describir la escena.
3. CRITERIO NEM: Si la respuesta es incorrecta, usa una pista socrática que lo remita a la lógica del error (ej. "Revisa qué pasó con el punto decimal") en lugar de darle la solución.
4. RELEVANCIA: Si la evidencia es una imagen en blanco, texto basura o algo ajeno al desafío, marca 'isCorrect: false'.

Devuelve SÓLO este JSON crudo:
{
  "studentName": "...",
  "confidenceScore": 0.9,
  "topic": "...",
  "isCorrect": true,
  "extractedText": "Feedback evaluativo corto y socrático. Máximo 2 oraciones.",
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

                    // AUTO-RESCUE: Continuous Adaptive Difficulty (Feature 5)
                    if (!parsedData.isCorrect) {
                        const parsedLevelId = typeof levelId === 'string' ? parseInt(levelId) : levelId;
                        const recentFails = await prisma.evidenceEntry.findMany({
                            where: {
                                studentId,
                                worldId,
                                levelId: parsedLevelId,
                                isCorrect: false
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 2 // We just added one above, so this will return at least 1. If it returns 3 (including the current), it means 3 strikes.
                        });

                        // 3 fails means 1 just inserted + 2 previous
                        if (recentFails.length >= 2) {
                            // Check if a rescue mission already exists for this level to avoid spamming
                            const existingMission = await prisma.studentMission.findUnique({
                                where: { studentId_worldId: { studentId, worldId } }
                            });

                            const days = existingMission ? JSON.parse(existingMission.daysJson) : [];
                            const alreadyHasRescue = days.find((d: any) => d.insertAfterDay === parsedLevelId);

                            if (!alreadyHasRescue && process.env.AI_API_KEY) {
                                console.log(`🚀 [Adaptive AI] Student ${studentId} failed 3 times on level ${parsedLevelId}. Generating Rescue Mission...`);

                                const rescuePrompt = `
Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado en la Nueva Escuela Mexicana (NEM) y Gamificación de alta fidelidad.
El estudiante falló en el siguiente concepto repetidamente:
"""
${context || 'Matemáticas o Lógica'}
"""
Crea UN problema de "Misión de Rescate" MUY sencillo, usando analogías muy básicas (como manzanas, pizzas, monedas) para recuperar su confianza.
Tu respuesta DEBE ser un JSON válido como este:
{
  "title": "Misión de Rescate",
  "narrative": "Mensaje motivador corto pidiéndole que baje el ritmo.",
  "practiceProblem": {
    "statement": "El problema super fácil de analogía.",
    "correctAnswer": "respuesta",
    "concept": "Repaso Básico"
  }
}
`;
                                const rescueResult = await model.generateContent(rescuePrompt);
                                const rescueClean = rescueResult.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();

                                try {
                                    const rescueGen = JSON.parse(rescueClean);

                                    const newDay = {
                                        insertAfterDay: parsedLevelId,
                                        type: "practice",
                                        title: rescueGen.title || "Refuerzo",
                                        narrative: rescueGen.narrative || "¡Tómate un descanso! Vamos con un repaso más sencillo.",
                                        practiceProblem: rescueGen.practiceProblem,
                                        isBoss: false
                                    };

                                    days.push(newDay);
                                    await prisma.studentMission.upsert({
                                        where: { studentId_worldId: { studentId, worldId } },
                                        update: { daysJson: JSON.stringify(days) },
                                        create: { studentId, worldId, daysJson: JSON.stringify(days) }
                                    });

                                    parsedData.extractedText += " ¡Hemos ajustado la dificultad y desbloqueado una misión más fácil para la próxima vez!";
                                } catch (e) {
                                    console.error("Rescue Mission Gen error:", e);
                                }
                            }
                        }
                    }

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
