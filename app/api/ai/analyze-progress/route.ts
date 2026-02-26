import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { studentName, worldTitle, stuckLevelTitle, levelContent } = await req.json();

        if (!studentName || !worldTitle || !stuckLevelTitle) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado en la Nueva Escuela Mexicana (NEM) y Gamificación. Analiza la situación pedagógica de este alumno de forma formativa.
Alumno: ${studentName}
Aventura de Aprendizaje: "${worldTitle}"
Nivel en el que se atascó: "${stuckLevelTitle}"
Contenido del nivel: ${JSON.stringify(levelContent, null, 2)}

Basado en el nivel donde se ha atascado el alumno, proporciona:
1. Un diagnóstico situado breve (2 líneas) sobre la posible barrera de aprendizaje o bloqueo conceptual.
2. Dos recomendaciones didácticas puntuales, cortas y basadas en metodologías sociocríticas (ABP, Indagación, etc.) para que el docente pueda intervenir.
3. Un tema específico, en una línea, sugerido para crear una misión de refuerzo gamificada (ej. "Refuerzo lúdico de fracciones equivalentes mediante el Oráculo").

Devuelve la respuesta estrictamente en este formato JSON:
{
  "diagnosis": "...",
  "recommendations": [
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ],
  "suggestedMissionTopic": "..."
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extraer JSON del bloque de código si Gemini lo rodea de ```json ... ```
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
        const finalJsonString = jsonMatch ? jsonMatch[1] : responseText;

        const analysisData = JSON.parse(finalJsonString);
        return NextResponse.json(analysisData);

    } catch (error) {
        console.error("Error analyzing progress:", error);
        return NextResponse.json(
            { error: "Error de IA al analizar el progreso." },
            { status: 500 }
        );
    }
}
