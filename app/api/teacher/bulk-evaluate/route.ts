import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        // Initialize Gemini inside the handler to ensure env vars are loaded in serverless context
        const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';
        if (!apiKey) {
            console.error("CRITICAL: GEMINI_API_KEY or AI_API_KEY is not set in environment variables.");
            return NextResponse.json({ error: "Configuración del servidor incompleta (API Key faltante)" }, { status: 500 });
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        const systemPrompt = `Eres un asistente de evaluación OCR estricto. 
TAREAS:
1. Analiza de esta foto el Nombre del Alumno escrito a mano. Identifícalo de la mejor forma posible.
2. EVALÚA el ejercicio comparándolo con la instrucción: [${rubrica}].
3. Asigna una calificación (0-10) y un feedback.

CRÍTICO: TU ÚNICA SALIDA DEBE SER EXCLUSIVAMENTE UN RAW JSON VÁLIDO. SIN TEXTO ANTES NI DESPUÉS. SIN DELIMITADORES MARKDOWN COMO \`\`\`json.
Ejemplo exacto de lo único que debes devolver:
{"nombreAlumno": "Maria Lopez", "calificacion": 10, "feedback": "Excelente trabajo resolviendo las sumas.", "puedeAvanzar": true}`;

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
            let cleanJsonString = responseText.trim();
            if (cleanJsonString.startsWith('```json')) {
                cleanJsonString = cleanJsonString.substring(7);
            }
            if (cleanJsonString.startsWith('```')) {
                cleanJsonString = cleanJsonString.substring(3);
            }
            if (cleanJsonString.endsWith('```')) {
                cleanJsonString = cleanJsonString.substring(0, cleanJsonString.length - 3);
            }
            cleanJsonString = cleanJsonString.trim();

            console.log("------------------------");
            console.log("GEMINI RAW RESPONSE:\n", responseText);
            console.log("CLEANED JSON:\n", cleanJsonString);

            evaluationData = JSON.parse(cleanJsonString);
            console.log("PARSED JSON OBJECT:\n", evaluationData);
        } catch (e) {
            console.error("Error parseando respuesta de Gemini", responseText);
            return NextResponse.json({ error: "Error en el formato de respuesta de IA", raw: responseText }, { status: 500 });
        }

        // 4. Buscar estudiante en la BD por nombre (match flexible)
        let studentId = null;
        let finalGrade = evaluationData.calificacion || 0;
        let matchedStudentName = null;

        if (evaluationData.nombreAlumno) {
            const students = await prisma.user.findMany({
                where: { role: 'STUDENT' }
            });

            // Función para normalizar texto (quitar acentos y pasar a minúsculas)
            const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const searchName = normalizeStr(evaluationData.nombreAlumno);

            const matchedStudent = students.find(s => {
                if (!s.name) return false;
                const dbName = normalizeStr(s.name);
                // Búsqueda cruzada simple
                return dbName.includes(searchName) || searchName.includes(dbName);
            });

            if (matchedStudent) {
                studentId = matchedStudent.id;
                matchedStudentName = matchedStudent.name;
                console.log(`¡Match encontrado en DB! ID: ${studentId}, Nombre original: ${matchedStudentName}`);
            } else {
                console.log(`No se encontró estudiante para el nombre: ${evaluationData.nombreAlumno}`);
            }
        } else {
            console.log("Gemini no devolvió un nombreAlumno en el JSON.");
        }

        // 5. Guardar/Actualizar progreso y evidencia en BD si se encontró el estudiante
        if (studentId) {
            console.log(`Procediendo a insertar evidencia para: studentId=${studentId}, worldId=${worldId}, levelId=${levelId}`);
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
                console.log(`Actualizando evidencia existente: ${existingEvidence.id}`);
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
                console.log(`Creando nueva evidencia...`);
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
                console.log('Evidencia insertada con éxito en EvidenceEntry.');
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
                console.log('XP/Gemas incrementadas para el alumno exitosamente.');
            }
        } else {
            console.log('Alerta: No se pudo guardar la evidencia porque studentId es NULL.');
        }

        return NextResponse.json({
            success: true,
            archivo: fileName, // Retornar el nombre del archivo para feedback en UI
            studentId,
            status: studentId ? 'success' : 'not_found',
            nombreEncontradoEnImagen: evaluationData.nombreAlumno,
            alumno: matchedStudentName || evaluationData.nombreAlumno,
            calificacion: finalGrade,
            feedback: evaluationData.feedback,
            puedeAvanzar: evaluationData.puedeAvanzar
        });

    } catch (error: any) {
        console.error("Error en bulk-evaluate:", error);
        return NextResponse.json({
            error: "Error procesando evaluación masiva",
            details: error.message || String(error),
            stack: error.stack
        }, { status: 500 });
    }
}
