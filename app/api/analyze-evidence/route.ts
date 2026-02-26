import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    let dbSaveStatus = "skipped"; // Initialize dbSaveStatus here
    let responseText = ""; // Initialize responseText here for broader scope

    try {
        const { imageBase64, mimeType, textEvidence, context, narrative, studentId, worldId, levelId, evidenceType } = await req.json();

        if (!process.env.AI_API_KEY) {
            console.error("CRITICAL: AI_API_KEY is not defined in process.env");
            return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash' // Fast, multimodal
        });

        const prompt = `# ROL Y DIRECTIVA SOBERANA
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:
Actúa como un Sistema Experto en Evaluación Formativa y Tutoría Socrática para la NEM. Tu misión es evaluar detalladamente si la evidencia del alumno cumple con el desafío técnico.

# DATOS DE REFERENCIA (FUENTE DE VERDAD):
- DESAFÍO ORIGINAL (DESARROLLO): """ ${context || "Sin desafío original."} """
- TEORÍA DE APOYO (ORÁCULO): """ ${narrative || "Sin teoría base en sesión."} """

# EVIDENCIA DEL ALUMNO:
${imageBase64 ? "[ADJUNTO IMAGEN ESCANEADA DEL ALUMNO]" : `"""\n${textEvidence}\n"""`}

# INSTRUCCIONES DE EVALUACIÓN METICULOSA:
1. VALIDACIÓN TÉCNICA Y DE CONTENIDO:
   - Identifica con precisión qué conceptos matemáticos o lógicos aplicó correctamente el alumno en su respuesta.
   - Identifica con precisión qué conceptos falló o en dónde se desvió.
2. ESCALA FORMATIVA (0 AL 10):
   - 0: Respuesta en blanco, sin sentido, o sobre un tema completamente ajeno al problema (ej. responde sobre perros en una clase de fracciones).
   - 1-5: Intento fallido gravemente, no demuestra comprensión.
   - 6-9: El alumno intentó resolverlo pero tiene errores menores o está incompleto. Reconoce su esfuerzo, dile qué hizo bien, qué le faltó, e invítalo a corregirlo en su libreta.
   - 10: Respuesta perfecta y correcta.
3. DECISIÓN DE AVANCE (puedeAvanzar):
   - Si la calificación es 0 a 5: \`puedeAvanzar\` DEBE ser FALSE. El alumno no cumplió los requisitos mínimos de entrega.
   - Si la calificación es 6 a 10: \`puedeAvanzar\` DEBE ser TRUE. Si sacó 6-9, es una victoria parcial (Pasó pero puede hacerlo mejor).
4. RETROALIMENTACIÓN SOCRÁTICA: Si hay errores (1-9), genera feedback que obligue al alumno a reflexionar, sin darle nunca la respuesta final.

# FORMATO DE SALIDA (JSON CRUDO Y ESTRICTO):
{
  "evaluacion": {
    "calificacion": 10,
    "puedeAvanzar": true,
    "puntuacion_confianza": 0.9,
    "retroalimentacion": "Excelente. Entendiste el concepto base.",
    "identifica_correcto": "Breve nota sobre lo que hizo bien.",
    "identifica_incorrecto": "Breve nota sobre el error (si lo hay).",
    "emocion_detectada": "Seguro | Frustrado | Indeciso | Motivado",
    "analisis_tecnico": "Breve nota interna sobre qué falló respecto al PDA"
  }
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
            const parsedRaw = JSON.parse(cleanedText);

            // Map the new "Fidelidad NEM Formativa" Format
            const parsedData = {
                grade: parsedRaw.evaluacion?.calificacion ?? 0,
                canAdvance: parsedRaw.evaluacion?.puedeAvanzar ?? false,
                extractedText: parsedRaw.evaluacion?.retroalimentacion ?? "Sin retroalimentación clara.",
                correctIdentified: parsedRaw.evaluacion?.identifica_correcto ?? "",
                incorrectIdentified: parsedRaw.evaluacion?.identifica_incorrecto ?? "",
                topic: parsedRaw.evaluacion?.analisis_tecnico ?? "General",
                emotionDetected: parsedRaw.evaluacion?.emocion_detectada ?? "Indeciso",
                confidenceScore: parsedRaw.evaluacion?.puntuacion_confianza ?? 0.8
            };

            // Para compatibilidad con legacy code, "isCorrect" sigue vivo si puede avanzar
            const isLegacyCorrect = parsedData.canAdvance;

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
                            isCorrect: isLegacyCorrect,
                            grade: parsedData.grade,
                            canAdvance: parsedData.canAdvance,
                            feedback: `Calificación: ${parsedData.grade}/10.\n${parsedData.extractedText}`,
                            topic: parsedData.topic,
                            emotionDetected: parsedData.emotionDetected
                        }
                    });
                    console.log("✅ Auto-logged evidence to DB:", savedEntry.id);
                    dbSaveStatus = "saved:" + savedEntry.id;

                    // AUTO-RESCUE: Continuous Adaptive Difficulty (Feature 5)
                    if (!parsedData.canAdvance) {
                        const parsedLevelId = typeof levelId === 'string' ? parseInt(levelId) : levelId;
                        const recentFails = await prisma.evidenceEntry.findMany({
                            where: {
                                studentId,
                                worldId,
                                levelId: parsedLevelId,
                                canAdvance: false
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
