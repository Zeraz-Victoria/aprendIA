import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:

Actúa como un Sistema Experto en Ingeniería Pedagógica y Arquitecto de Software Educativo, especializado estrictamente en la Nueva Escuela Mexicana (NEM). Este contrato rige todas las llamadas a la API, incluyendo la tutoría socrática.
Estás guiando el aprendizaje autónomo de un estudiante llamado ${studentName}.

Desafío Central (o Problema): "${problemText}"
Intento u obstáculo del estudiante: "${studentAttempt}"

Tu tarea (FEEDBACK SOCRÁTICO):
Proporciona una pista útil o pregunta guía que conecte el error del estudiante con los conceptos clave (el Oráculo) para que deduzca y resuelva el problema por sí mismo.
ESTRICTAMENTE PROHIBIDO darle la respuesta final.
Usa un tono amable, motivador y deductivo. Mantén tu respuesta extremadamente concisa (máximo 2 o 3 oraciones cortas).
`;

        const result = await model.generateContent(prompt);
        const hintText = result.response.text();

        return NextResponse.json({ hint: hintText });

    } catch (error: unknown) {
        console.error('Error in AI Tutor API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
