import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkUserSubscriptionAccess } from '@/lib/subscription';
import { EJES_ARTICULADORES_NEM } from '@/components/eduplan/constants';
import { findRelevantTextbookPages } from '@/lib/textbooks-index';
import { findRelevantContenidosAndPDA } from '@/lib/contenidos-index';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const userId = (session.user as any).id;
        const schoolId = (session.user as any).schoolId;

        const subCheck = await checkUserSubscriptionAccess(userId, schoolId);
        if (!subCheck.allowed) {
            return NextResponse.json({ error: subCheck.reason, subscriptionExpired: true }, { status: 402 });
        }

        const params = await req.json();
        const { nombreDocente, nombreEscuela, fase, grado, metodologia, contextoAdicional, numSesiones = 5 } = params;

        if (!nombreDocente?.trim() || !nombreEscuela?.trim() || !grado?.trim()) {
            return NextResponse.json({ error: 'El docente, la escuela y el grado son obligatorios.' }, { status: 400 });
        }

        if (!process.env.AI_API_KEY) {
            return NextResponse.json({ error: 'Clave de API de IA no configurada en el servidor.' }, { status: 500 });
        }

        // 1. Buscar Contenidos y PDA oficiales del documento Excel indexado
        const matchingContenidosPDA = findRelevantContenidosAndPDA(contextoAdicional || metodologia || '', 6);
        const contenidosPromptSnippet = matchingContenidosPDA.length > 0
            ? `CONTENIDOS Y PDA OFICIALES DEL PROGRAMA SINTÉTICO (EXTRAÍDOS DEL DOCUMENTO OFICIAL FASE 6 / ${grado}):\n` +
              matchingContenidosPDA.map((item, idx) => 
                `${idx + 1}. [${item.campo_formativo} - ${item.materia}]\n   - CONTENIDO: "${item.contenido}"\n   - PDA: "${item.pda}"`
              ).join('\n')
            : '';

        // 2. Buscar recomendaciones de libros de texto indexados
        const recommendedBooks = findRelevantTextbookPages(contextoAdicional || metodologia || 'Aprendizaje', grado, 4);
        const booksPromptSnippet = recommendedBooks.length > 0
            ? `LIBROS DE TEXTO DE LA NEM INDEXADOS RECOMENDADOS PARA ESTE GRADO:\n` +
              recommendedBooks.map(b => `- Libro: "${b.bookTitle}" (${b.grade}), Página ${b.page}: "${b.snippet.substring(0, 150)}..."`).join('\n')
            : '';

        const prompt = `
# PERFIL: DOCTOR EN PEDAGOGÍA Y ESPECIALISTA DE ÉLITE NEM 2022
Tu misión es generar un plano didáctico integral (Planeación NEM 2022) en formato JSON estricto.

SOLICITUD:
- Grado/Fase: ${grado} / ${fase || 'NEM'}
- Metodología: ${metodologia}
- Número de Sesiones: ${numSesiones}
- Problemática/Contexto: ${contextoAdicional || 'Desarrollo de competencias y pensamiento crítico'}
- Escuela: ${nombreEscuela} | Docente: ${nombreDocente}

${contenidosPromptSnippet}

${booksPromptSnippet}

### ⚠️ INSTRUCCIÓN OBLIGATORIA SOBRE CONTENIDOS Y PDA:
En la sección "vinculacion", DEBES UTILIZAR prioritariamente los Contenidos y PDA oficiales extraídos arriba que tengan relación directa con la problemática expresada por el docente.

### ⚠️ EJES ARTICULADORES VÁLIDOS (LISTA CERRADA — NO INVENTES OTROS):
Para el campo "ejes_articuladores", SOLO puedes usar entre 1 y 4 de esta lista exacta:
${EJES_ARTICULADORES_NEM.map((e, i) => `${i + 1}. "${e}"`).join('\n')}

ESTRUCTURA JSON REQUERIDA (DEVUELVE ÚNICAMENTE UN JSON VÁLIDO):
{
  "encabezado": {
    "proyecto": "Proyecto Didáctico Integral de ${grado}",
    "docente": "${nombreDocente}",
    "escuela": "${nombreEscuela}",
    "grado": "${grado}",
    "fase": "${fase || ''}",
    "metodologia": "${metodologia}",
    "num_sesiones": ${numSesiones}
  },
  "diagnostico_pedagogico": "Análisis sociocrítico articulando la problemática del entorno escolar con los objetivos de aprendizaje de la Nueva Escuela Mexicana.",
  "estructura_curricular": {
    "campos_formativos": ["Lenguajes", "Saberes y Pensamiento Científico"],
    "ejes_articuladores": ["Pensamiento Crítico", "Inclusión"],
    "proposito": "Promover aprendizajes significativos y comunitarios vinculados a la realidad de los estudiantes de ${grado}.",
    "vinculacion": [
      {
        "campo": "Lenguajes",
        "contenido": "Contenido oficial seleccionado del catálogo",
        "pdas": ["PDA oficial seleccionado del catálogo"]
      }
    ]
  },
  "secuencia_didactica": [
    {
      "fase_nombre": "Momento 1: Identificación y Planeación",
      "sesiones": [
        {
          "numero": 1,
          "titulo": "Exploración e Indagación de Saberes Previos",
          "duracion": "50 min",
          "inicio": ["Planteamiento de la situación detonadora y diálogo directo con los alumnos."],
          "desarrollo": ["Modelaje Docente: Presentación del concepto clave en el pizarrón.", "Acción del Alumno: Trabajo en comunidades de aprendizaje y análisis de casos."],
          "cierre": ["Síntesis del aprendizaje y reflexión metacognitiva."],
          "recursos": ["Cuaderno de trabajo, libros de texto de ${grado}, material didáctico."],
          "evidencia": "Registro escrito o gráfico en el cuaderno."
        }
      ]
    }
  ],
  "evaluacion_formativa": {
    "tecnica": "Observación sistemática y análisis de desempeño",
    "instrumento": "Rúbrica holística y lista de cotejo",
    "evidencia_proceso": "Portafolio de evidencias formativo",
    "criterios": ["Comprensión del concepto central", "Participación colaborativa en clase"]
  },
  "libros_recomendados": [
    {
      "libro": "Nombre del Libro de Texto",
      "grado": "${grado}",
      "pagina": 45,
      "extracto": "Resumen o justificación del uso de esta página."
    }
  ]
}
`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const cleanedText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const plan = JSON.parse(cleanedText);

        // Si la IA omitió libros_recomendados o vino vacío, inyectar los libros encontrados por el servidor
        if (!plan.libros_recomendados || plan.libros_recomendados.length === 0) {
            plan.libros_recomendados = recommendedBooks.map(b => ({
                libro: b.bookTitle,
                grado: b.grade,
                pagina: b.page,
                extracto: b.snippet.substring(0, 180) + '...'
            }));
        }

        return NextResponse.json({ success: true, plan });
    } catch (error: any) {
        console.error("Error al generar planeación EduPlan:", error);
        return NextResponse.json(
            { error: error?.message || "Ocurrió un error al generar la planeación." },
            { status: 500 }
        );
    }
}
