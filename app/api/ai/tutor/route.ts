import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { problemText, studentAttempt, studentName = 'Estudiante' } = await req.json();

        if (!problemText || !studentAttempt) {
            return NextResponse.json({ error: 'problemText and studentAttempt are required' }, { status: 400 });
        }

        if (!process.env.AI_API_KEY) {
            console.error("CRITICAL: AI_API_KEY is not defined");
            return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Eres un tutor de matemáticas experto, paciente y alentador.
Estás ayudando a un estudiante llamado ${studentName}.

Problema actual: "${problemText}"
Intento u obstáculo del estudiante: "${studentAttempt}"

Tu tarea:
Proporciona una pista útil o guía paso a paso para ayudar al estudiante a resolver el problema por sí mismo.
NO le des la respuesta final directamente.
Usa un tono amable, motivador y claro. Mantén tu respuesta concisa (máximo 2 o 3 oraciones cortas).
`;

        const result = await model.generateContent(prompt);
        const hintText = result.response.text();

        return NextResponse.json({ hint: hintText });

    } catch (error: unknown) {
        console.error('Error in AI Tutor API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
