import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    let dbSaveStatus = "skipped"; // Initialize dbSaveStatus here
    let responseText = ""; // Initialize responseText here for broader scope

    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { imageBase64, mimeType, textEvidence, context, narrative, studentId, worldId, levelId, evidenceType } = await req.json();

        // Verify student and world belong to the school
        if (studentId) {
            const student = await prisma.user.findUnique({ where: { id: studentId, schoolId } });
            if (!student) return NextResponse.json({ error: "Student not found in your school" }, { status: 404 });
        }

        if (worldId) {
            const world = await prisma.world.findUnique({ where: { id: worldId, schoolId } });
            if (!world) return NextResponse.json({ error: "World not found in your school" }, { status: 404 });
        }

        // Tarea 2: Bloqueo Real de Respuestas Vacías (Hard Stop)
        if (!imageBase64 && (!textEvidence || textEvidence.trim().length === 0)) {
            return NextResponse.json({ success: false, message: "No puedes avanzar sin enviar una respuesta válida." }, { status: 400 });
        }

        if (!process.env.AI_API_KEY) {
            console.error("CRITICAL: AI_API_KEY is not defined in process.env");
            return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash' // Fast, multimodal
        });

        let instruccionFiel = "Sin desafío original.";
        let respuestaCorrecta = "Sin rúbrica definida.";

        try {
            if (context) {
                const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;
                instruccionFiel = parsedContext.reto_gameplay?.instruccion_fiel || parsedContext.instruccion_fiel || parsedContext.statement || context;
                respuestaCorrecta = parsedContext.reto_gameplay?.respuesta_correcta || parsedContext.respuesta_correcta || parsedContext.correctValue || "Sin rúbrica definida.";
            }
        } catch (e) {
            instruccionFiel = context || "Sin desafío original.";
        }

        const prompt = `Eres un maestro estricto, analítico y justo evaluando la evidencia de un alumno. 

CONTEXTO DE EVALUACIÓN:
- Reto Original: ${instruccionFiel}
- Rúbrica/Respuesta Esperada: ${respuestaCorrecta}

REGLAS DE EVALUACIÓN (INQUEBRANTABLES):
1. ANÁLISIS REAL: Compara el trabajo enviado por el alumno CONTRA la Rúbrica Esperada. No seas condescendiente. 
2. CALIFICACIÓN (0-10): Asigna una nota numérica entera. 
   - 10: Perfecto.
   - 6 a 9: Aceptable, pero con errores o áreas de mejora.
   - 0 a 5: Incorrecto, incompleto, irrelevante o imagen borrosa/vacía.
3. FEEDBACK SOCRÁTICO: Tu retroalimentación debe mencionar exactamente qué hizo bien y en qué falló. Si reprobó (< 6), dale una pista clara de su error para que lo intente de nuevo, pero NO le des la respuesta directa.
4. ESTRICTAMENTE PROHIBIDO dar 10 si falta información pedida en el reto o si la respuesta es puro texto sin sentido.

# EVIDENCIA DEL ALUMNO:
${imageBase64 ? "[ADJUNTO IMAGEN ESCANEADA DEL ALUMNO]" : `"""\n${textEvidence}\n"""`}

FORMATO DE SALIDA ESPERADO (JSON ESTRICTO):
{
  "calificacion": 10,
  "feedback": "Tu explicación analítica...",
  "puedeAvanzar": true
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
                grade: parsedRaw.calificacion ?? 0,
                canAdvance: parsedRaw.puedeAvanzar ?? false,
                isCorrect: parsedRaw.puedeAvanzar ?? false,
                extractedText: parsedRaw.feedback ?? "Sin retroalimentación clara.",
                correctIdentified: "", // Fallbacks since we simplified the JSON
                incorrectIdentified: "", // Fallbacks since we simplified the JSON
                topic: "General", // Fallbacks since we simplified the JSON
                emotionDetected: "Indeciso", // Fallbacks since we simplified the JSON
                confidenceScore: 0.9 // Fallbacks since we simplified the JSON
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
