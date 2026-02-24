import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { theme, topic, difficulty = "Básico" } = await req.json();

    if (!theme || !topic) {
      return NextResponse.json({ error: 'theme and topic are required' }, { status: 400 });
    }

    if (!process.env.AI_API_KEY) {
      console.error("CRITICAL: AI_API_KEY is not defined");
      return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Actúa como un diseñador instruccional experto en gamificación y pedagogía infantil.
Tu objetivo es crear una "Aventura de Aprendizaje" de 3 días (niveles) que conecte el aprendizaje esperado de CUALQUIER materia (Matemáticas, Español, Historia, Formación Cívica y Ética, etc.) con el mundo real, usando el Aprendizaje Basado en Retos.

CONTEXTO DE LA MISIÓN:
- Tema narrativo (Ambientación): ${theme}
- Aprendizaje Esperado / Tema Educativo: ${topic}
- Dificultad general: ${difficulty}

REGLAS DE DISEÑO PEDAGÓGICO:
1. Día 1 (Explicación): Usa la técnica del "Descubrimiento Guiado". La narrativa debe presentar una situación en el tema de [${theme}] donde los personajes descubren por qué necesitan saber sobre [${topic}]. La explicación y la analogía deben ser muy claras para un niño.
2. Día 2 (Práctica Guiada): El problema debe requerir aplicar lo aprendido para avanzar. Formula UNA SOLA PREGUNTA DIRECTA EN EL DESAFÍO, sin sub-incisos. Si la respuesta es abierta o de texto, que la "correctValue" sea una palabra clave. La pista (hint) debe ser una pregunta socrática que lo guíe, sin darle la respuesta.
3. Día 3 (Jefe Final): El problema debe requerir "Pensamiento Crítico" o integrar lo aprendido. La narrativa debe ser épica y hacer sentir al alumno que su respuesta salva el día. MANTÉN UN SOLO DESAFÍO FINAL CLARO.

REGLAS DE FORMATO (CRÍTICO):
- Devuelve estrictamente un arreglo JSON valido con esta estructura, sin formato markdown (\`\`\`json):
[
  {
    "dayNumber": 1,
    "type": "concept_story",
    "title": "Un título genial basado en la ambientación",
    "narrative": "Una historia inmersiva donde surge la necesidad de aprender este tema...",
    "content": { "explanation": { "chunks": ["Explicación del concepto 1", "Explicación del concepto 2"], "analogy": "Una analogía útil y aplicable al mundo real" } }
  },
  {
    "dayNumber": 2,
    "type": "guided_practice",
    "title": "El Primer Reto",
    "narrative": "Alguien necesita tu ayuda para resolver un problema de este tema...",
    "content": { "practiceProblem": { "statement": "Pregunta clara", "correctValue": "Respuesta correcta exacta o palabra clave", "hint": "Pista socrática que hace pensar" } }
  },
  {
    "dayNumber": 3,
    "type": "boss_fight",
    "title": "El Gran Desafío",
    "originalProblemText": "El desafío más difícil inserto en el clímax de la historia...",
    "hints": ["Pista inicial suave", "Pista más reveladora"]
  }
]
`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    console.log("Raw AI Response:", responseText); // Debugging log

    // Clean up markdown if the model hallucinated it
    responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();

    // A robust function to escape quotes used inside string values but preserve structural JSON quotes
    const escapeUnsafeQuotes = (jsonStr: string) => {
      let isInsideString = false;
      let result = '';

      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        const prevChar = i > 0 ? jsonStr[i - 1] : '';

        if (char === '"' && prevChar !== '\\\\') {
          // Look behind for : { [ , or look ahead for : } ] , to detect structural boundaries
          const prevNonSpace = jsonStr.substring(0, i).trim().slice(-1);
          const nextNonSpaceIndex = jsonStr.substring(i + 1).search(/[^\\s]/);
          const nextNonSpace = nextNonSpaceIndex !== -1 ? jsonStr[i + 1 + nextNonSpaceIndex] : '';

          const isStartOfString = /[:\\[\\{,]/.test(prevNonSpace);
          const isEndOfString = /[:\\]\\},]/.test(nextNonSpace);

          if (isStartOfString || isEndOfString) {
            isInsideString = !isInsideString;
            result += char;
          } else {
            // It's an inner quote inside a string value
            result += '\\\\"';
          }
        } else {
          result += char;
        }
      }
      return result;
    };

    responseText = escapeUnsafeQuotes(responseText);

    let days;
    try {
      days = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", parseError);
      console.error("Attempted to parse:", responseText);
      // Fallback robust json parsing (e.g., trying to fix trailing commas or common issues)
      // If it still fails, return a 500 so the client knows exactly why
      return NextResponse.json({ error: 'AI returned malformed JSON structure', raw: responseText }, { status: 500 });
    }

    return NextResponse.json({
      id: crypto.randomUUID(),
      theme: "custom", // Internal enum mapping could go here
      title: `Aventura de ${topic}`,
      days: days,
      createdAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error in AI Generator API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
