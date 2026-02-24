import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { studentId, studentName } = await req.json();

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        // Fetch all evidence entries for this student
        const entries = await prisma.evidenceEntry.findMany({
            where: { studentId },
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

        const evidenceSummary = entries.slice(0, 20).map((e, i) => (
            `${i + 1}. [${e.isCorrect ? 'CORRECTO' : 'INCORRECTO'}] Tema: ${e.topic || 'Desconocido'} | Respuesta: "${(e.studentAnswer || '').substring(0, 100)}" | Feedback IA: "${(e.feedback || '').substring(0, 150)}" | Emoción: ${e.emotionDetected || 'N/A'}`
        )).join('\n');

        const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || "");
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `# ROL
Eres un asesor pedagógico experto que genera reportes para docentes de primaria y secundaria.

# DATOS DEL ALUMNO
- Nombre: ${studentName || "Alumno"}
- Total de evidencias registradas: ${entries.length}
- Respuestas correctas: ${correctCount} (${Math.round(correctCount / entries.length * 100)}%)
- Respuestas incorrectas: ${incorrectCount}
- Temas abordados: ${topics.join(', ') || 'Sin datos'}
- Emociones detectadas: ${Object.entries(emotionSummary).map(([k, v]) => `${k}: ${v} veces`).join(', ') || 'Sin datos'}

# DETALLE DE EVIDENCIAS (últimas ${Math.min(entries.length, 20)}):
${evidenceSummary}

# INSTRUCCIONES
Genera un reporte pedagógico COMPLETO y ESTRUCTURADO en formato Markdown con las siguientes secciones:

## 📊 Resumen de Rendimiento
Un párrafo breve con datos duros (porcentaje de acierto, cantidad de intentos, tendencia).

## 💪 Fortalezas Identificadas
Lista de 2-4 fortalezas basadas en las evidencias reales del alumno.

## ⚠️ Áreas de Oportunidad
Lista de 2-4 áreas donde el alumno necesita refuerzo, basadas en sus errores reales.

## 🎯 Recomendaciones para el Docente
3-5 acciones concretas y prácticas que el docente puede implementar en clase.

## 📝 Calificación Sugerida (0-10)
Una calificación numérica con justificación breve.

Sé específico, usa los datos reales del alumno, no inventes datos. Escribe en español.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return NextResponse.json({ report: text });
    } catch (error) {
        console.error("Report generation error:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
