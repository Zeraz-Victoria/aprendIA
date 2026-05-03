import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { trackAICall } from "@/lib/ai-tracker";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { studentId, studentName, reportType = 'teacher', worldFilter } = await req.json();

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        // Fetch all evidence entries for this student
        const entries = await prisma.evidenceEntry.findMany({
            where: { 
                studentId,
                ...(worldFilter ? { worldId: worldFilter } : {})
            },
            orderBy: { createdAt: "desc" },
            take: 50, // Last 50 entries max
            include: { world: { select: { title: true, theme: true } } }
        });

        if (entries.length === 0) {
            return NextResponse.json({
                report: `No se encontraron evidencias registradas para ${studentName || "este alumno"}. Aún no hay datos suficientes para generar un reporte pedagógico.`
            });
        }

        // Build a summary of the evidence data for the AI
        const correctCount = entries.filter(e => e.isCorrect).length;
        const incorrectCount = entries.length - correctCount;
        const topics = [...new Set(entries.map(e => e.topic).filter(Boolean))];
        const emotions = entries.map(e => e.emotionDetected).filter(Boolean);
        const emotionSummary = emotions.reduce((acc: Record<string, number>, e) => {
            acc[e as string] = (acc[e as string] || 0) + 1;
            return acc;
        }, {});

        // Calculate average grade from evidence
        const gradesArr = entries.map(e => e.grade).filter((g): g is number => g !== null && g !== undefined);
        const avgGrade = gradesArr.length > 0 ? (gradesArr.reduce((s, g) => s + g, 0) / gradesArr.length).toFixed(1) : 'N/A';

        const evidenceSummary = entries.slice(0, 20).map((e, i) => {
            const feedbackLines = (e.feedback || '').split('\n').filter(l => l.trim());
            const category = feedbackLines[0] || 'Sin categoría';
            return `${i + 1}. [Calificación: ${e.grade ?? 'N/A'}/10 - ${category}] Tema: ${e.topic || 'Desconocido'} | Feedback: "${(e.feedback || '').substring(0, 200)}"`;
        }).join('\n');

        const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
        if (!apiKey) throw new Error('API Key missing');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `# ROL Y DIRECTIVA SOBERANA
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:
Actúa como un Asesor Pedagógico Senior especializado en Evaluación Formativa bajo el marco de la Nueva Escuela Mexicana (NEM). Tu misión es traducir las métricas de aprendizaje del estudiante en reportes accionables, empáticos y técnicos, sin inventar datos que no estén en el historial.

# DATOS DEL ESTUDIANTE (FUENTE DE VERDAD):
- ALUMNO: ${studentName || "Alumno"}
- FASE Y PDA: Fase NEM a inferir - Temas abordados: ${topics.join(', ') || 'Sin datos'}
- MÉTRICAS DE DESEMPEÑO: ${correctCount} aciertos de ${entries.length} intentos (${Math.round(correctCount / (entries.length || 1) * 100)}%). Promedio de calificación: ${avgGrade}/10. Detalle: ${evidenceSummary}
- EMOCIONES PREDOMINANTES: ${Object.entries(emotionSummary).map(([k, v]) => `${k}: ${v} veces`).join(', ') || 'Sin datos'}
- TIPO DE REPORTE SOLICITADO: ${reportType === 'parent' ? 'PADRE' : 'DOCENTE'}

# INSTRUCCIONES DE REDACCIÓN SEGÚN EL TIPO:

SI EL TIPO ES "PADRE":
1. TONO: Cálido, empático, motivador y sin jerga técnica.
2. ESTRUCTURA:
   - Saludo personalizado.
   - Fortalezas: Qué hizo bien el alumno basándose en sus aciertos.
   - Área de oportunidad: Menciona sutilmente dónde se le dificultó, sin usar la palabra "error" o "reprobado".
   - Actividad en casa: Sugiere UNA actividad cotidiana (ej. contar el cambio en la tienda, leer un cartel) que refuerce el PDA.
   - Cierre motivador.

SI EL TIPO ES "DOCENTE":
1. TONO: Técnico, analítico, centrado en metodologías sociocríticas (ABP, Proyectos Comunitarios).
2. ESTRUCTURA:
   - Resumen de Progreso: Nivel de asimilación del PDA.
   - Barreras de Aprendizaje: Análisis de los errores recurrentes basados en el historial.
   - Recomendación Didáctica: Sugerencia de intervención pedagógica para la siguiente sesión (ej. "usar material concreto para explicar el valor posicional").
   - Estado Emocional: Cómo influyó la emoción detectada en su desempeño.

# FORMATO DE SALIDA (JSON CRUDO - SIN MARCADORES MARKDOWN):
{
  "destinatario": "${reportType === 'parent' ? 'PADRE' : 'DOCENTE'}",
  "alumno": "${studentName || 'Alumno'}",
  "reporte_formateado": {
    "titulo": "...",
    "cuerpo_texto": "...",
    "sugerencia_accionable": "...",
    "nivel_dominio_pda": "En desarrollo | Logrado | Requiere apoyo"
  }
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Increment API calls
        const userId = (session.user as any).id;
        const schoolId = (session.user as any).schoolId;
        if (userId) {
            await trackAICall(userId, schoolId);
        }

        let finalReport = "";
        try {
            const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
            const parsed = JSON.parse(cleanText);

            // Reconstruct a beautiful Markdown string for the frontend
            finalReport = `### ${parsed.reporte_formateado?.titulo || "Reporte de Evaluación Formativa"}\n\n`;

            if (reportType === 'teacher') {
                finalReport += `**Estado del PDA:** ${parsed.reporte_formateado?.nivel_dominio_pda || 'En proceso'}\n\n`;
            }

            finalReport += `${parsed.reporte_formateado?.cuerpo_texto || "El alumno ha completado sus actividades."}\n\n`;

            finalReport += `${reportType === 'parent' ? '💡 **Para hacer en casa:**' : '📋 **Recomendación didáctica:**'} ${parsed.reporte_formateado?.sugerencia_accionable || "Sigue animándolo a aprender."}\n`;

        } catch (e) {
            console.error("Failed to parse report JSON, falling back to raw text:", e);
            finalReport = text; // Fallback to raw output if parse fails
        }

        return NextResponse.json({ report: finalReport });
    } catch (error) {
        console.error("Report generation error:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
