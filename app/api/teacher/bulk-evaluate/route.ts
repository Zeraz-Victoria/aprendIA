import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType, worldId, levelId, fileName } = body;

        console.log(`Evaluando masivamente: ${fileName} - World: ${worldId} - Level: ${levelId}`);

        if (!imageBase64 || !worldId || !levelId) {
            return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
        }

        // 1. Obtener la rúbrica/contenido del nivel de la BD
        const world = await prisma.world.findUnique({ where: { id: worldId } });
        if (!world) {
            return NextResponse.json({ error: "Mundo no encontrado" }, { status: 404 });
        }

        let days = [];
        try {
            days = JSON.parse(world.daysJson || "[]");
        } catch (e) {
            console.error(e);
        }

        const activity = days.find((d: any) => d.dayNumber.toString() === levelId.toString());
        const rubrica = activity?.challenge?.rubric || activity?.pda || activity?.narrative || activity?.content || "Problema de matemáticas/Lógica";

        // 2. Preparar el prompt estricto
        const systemPrompt = `Eres un asistente de evaluación OCR. 
TAREAS:
1. Analiza esta foto de una libreta escolar y EXTRAE el Nombre del Alumno que está escrito a mano (usualmente en la parte superior).
2. EVALÚA el ejercicio comparándolo con la siguiente Rúbrica/Instrucción: [${rubrica}].
3. Asigna una calificación (0-10) y un feedback socrático.

FORMATO RESPUESTA: DEBES responder ÚNICAMENTE con un JSON válido, sin delimitadores de markdown (\`\`\`json) ni texto extra. El formato exacto es:
{
  "nombreEncontradoEnImagen": "Nombre extraído o null si no se entiende",
  "calificacion": <número_del_0_al_10>,
  "feedback": "<feedback socrático para el alumno>",
  "puedeAvanzar": <true o false>
}`;

        // Limpiar el base64 prefix si existe
        let base64Data = imageBase64;
        if (imageBase64.includes(',')) {
            base64Data = imageBase64.split(',')[1];
        }

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType || 'image/jpeg'
            }
        };

        // 3. Llamar a Gemini (Multimodal)
        const result = await model.generateContent([
            systemPrompt,
            imagePart
        ]);

        const responseText = result.response.text();
        let evaluationData;

        try {
            // Limpiar posibles bloques markdown si Gemini los devolvió a pesar de la instrucción
            const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            evaluationData = JSON.parse(cleanJsonString);
        } catch (e) {
            console.error("Error parseando respuesta de Gemini", responseText);
            return NextResponse.json({ error: "Error en el formato de respuesta de IA" }, { status: 500 });
        }

        // 4. Buscar estudiante en la BD por nombre (match flexible)
        let studentId = null;
        let finalGrade = evaluationData.calificacion || 0;

        if (evaluationData.nombreEncontradoEnImagen) {
            const students = await prisma.user.findMany({
                where: { role: 'STUDENT' }
            });

            // Búsqueda LIKE (case insensitive)
            const searchName = evaluationData.nombreEncontradoEnImagen.toLowerCase().trim();
            const matchedStudent = students.find(s => {
                if (!s.name) return false;
                const dbName = s.name.toLowerCase();
                return dbName.includes(searchName) || searchName.includes(dbName);
            });

            if (matchedStudent) {
                studentId = matchedStudent.id;
            }
        }

        // 5. Guardar/Actualizar progreso y evidencia en BD si se encontró el estudiante
        if (studentId) {
            const numericLevelId = parseInt(levelId, 10);

            // Actualizar status de la evidencia (o crearla)
            const existingEvidence = await prisma.evidenceEntry.findFirst({
                where: {
                    studentId: studentId,
                    worldId: worldId,
                    levelId: numericLevelId
                }
            });

            if (existingEvidence) {
                await prisma.evidenceEntry.update({
                    where: { id: existingEvidence.id },
                    data: {
                        status: 'COMPLETED',
                        studentAnswer: "Evidencia revisada por maestro/IA",
                        grade: finalGrade,
                        feedback: evaluationData.feedback || "Revisado",
                        isCorrect: evaluationData.puedeAvanzar,
                        canAdvance: evaluationData.puedeAvanzar
                    }
                });
            } else {
                await prisma.evidenceEntry.create({
                    data: {
                        studentId: studentId,
                        worldId: worldId,
                        levelId: numericLevelId,
                        status: 'COMPLETED',
                        studentAnswer: "Evidencia revisada por maestro/IA",
                        grade: finalGrade,
                        feedback: evaluationData.feedback || "Revisado",
                        isCorrect: evaluationData.puedeAvanzar,
                        canAdvance: evaluationData.puedeAvanzar
                    }
                });
            }

            // Actualizar Progreso si avanzó
            if (evaluationData.puedeAvanzar) {
                const existingProgress = await prisma.progress.findUnique({
                    where: {
                        studentId_worldId_levelId: {
                            studentId: studentId,
                            worldId: worldId,
                            levelId: numericLevelId
                        }
                    }
                });

                if (!existingProgress) {
                    await prisma.progress.create({
                        data: {
                            studentId: studentId,
                            worldId: worldId,
                            levelId: numericLevelId,
                            // grade ya no existe en progress
                        }
                    });
                }

                // Recompensas XP Gamification
                await prisma.user.update({
                    where: { id: studentId },
                    data: {
                        xp: { increment: finalGrade > 8 ? 50 : 25 },
                        gems: { increment: finalGrade > 8 ? 5 : 2 }
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            studentId,
            nombreEncontradoEnImagen: evaluationData.nombreEncontradoEnImagen,
            calificacion: finalGrade,
            feedback: evaluationData.feedback,
            puedeAvanzar: evaluationData.puedeAvanzar
        });

    } catch (error) {
        console.error("Error en bulk-evaluate:", error);
        return NextResponse.json({ error: "Error procesando evaluación masiva" }, { status: 500 });
    }
}
