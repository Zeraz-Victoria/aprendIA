
import OpenAI from "openai";
import { LessonPlan, PlanningRequest } from "../types";
import { EJES_ARTICULADORES_NEM } from "../constants";

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateLessonPlanStream = async (
  params: PlanningRequest,
  onChunk: (text: string) => void,
  retries = 3
): Promise<LessonPlan> => {
  const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("CONFIGURACIÓN REQUERIDA: No se detectó NEXT_PUBLIC_DEEPSEEK_API_KEY en el archivo .env.");
  }

  const systemInstruction = `
# PERFIL: DOCTOR EN PEDAGOGÍA Y ESPECIALISTA DE ÉLITE NEM 2022
Tu misión es transformar cualquier rezago académico en un proyecto de impacto social.

# 1. FILOSOFÍA PEDAGÓGICA (EL ESTÁNDAR DE EXCELENCIA):
- DIAGNÓSTICO SOCIOCRÍTICO: Conecta siempre la falla técnica con una limitación en la participación social o bienestar del alumno.
- ANDAMIAJE DOCENTE: Cada sesión debe detallar el "Modelaje Docente" (proceso paso a paso que el maestro demuestra en el pizarrón) y la "Acción del Alumno" en el Desarrollo.
- VINCULACIÓN INTERDISCIPLINARIA: Cruza el campo formativo base con contenidos de otros campos ("vinculacion") para resolver el problema de forma integral.
- EVALUACIÓN FORMATIVA: Diseña procesos con criterios de éxito claros y medibles.

# 2. ADAPTABILIDAD METODOLÓGICA TOTAL:
Estructura la secuencia estrictamente según la metodología:
- ABP (6 momentos): Presentemos, Recolectemos, Formulemos el problema, Organicemos la experiencia, Vivamos la experiencia, Resultados y análisis.
- STEAM (5 fases): Introducción, Diseño de investigación, Organizar y responder, Presentar resultados, Metacognición.
- Proyectos Comunitarios (3 fases): Planeación, Acción, Intervención.
- Aprendizaje Servicio (5 etapas): Punto de partida, Lo que sé y lo que quiero saber, Organicemos las actividades, Creatividad en marcha, Compartimos y evaluamos.

# 3. REGLAS TÉCNICAS CRÍTICAS (OBLIGATORIAS — INCUMPLIRLAS ES UN ERROR GRAVE):
- Respuesta: SOLO JSON.
- Volumen: EXACTAMENTE ${params.numSesiones} sesiones detalladas. No resumas.
- Contenidos: No inventes Contenidos ni PDA; usa los oficiales del programa sintético.
- Tono: Profesional, empoderador y pedagógicamente riguroso.

# 4. REGLA ABSOLUTA — EJES ARTICULADORES:
Los ejes articuladores del campo "ejes_articuladores" en el JSON de respuesta DEBEN ser
EXCLUSIVAMENTE una selección (entre 1 y 4) de los siguientes 7 ejes oficiales del
Programa Sintético NEM 2022. ESTÁ ESTRICTAMENTE PROHIBIDO inventar, parafrasear,
abreviar o modificar estos nombres:
${EJES_ARTICULADORES_NEM.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Elige solo los ejes que sean PERTINENTES al diagnóstico y campo formativo del proyecto.
NUNCA uses valores diferentes a los de esta lista.
  `;

  const userPrompt = `
### SOLICITUD DE PLANO DIDÁCTICO INTEGRAL (NEM 2022)
Genera un proyecto de impacto social en formato JSON para:
- Grado/Fase: ${params.grado} / ${params.fase}
- Metodología: ${params.metodologia}
- Número de Sesiones: ${params.numSesiones} (Genera detalles para TODAS)
- Problemática/Contexto: ${params.contextoAdicional || 'General'}
- Escuela: ${params.nombreEscuela} | Docente: ${params.nombreDocente}

### ⚠️ EJES ARTICULADORES VÁLIDOS (LISTA CERRADA — NO USES OTROS):
Para el campo "ejes_articuladores" del JSON, SOLO puedes usar valores de esta lista exacta:
${EJES_ARTICULADORES_NEM.map((e, i) => `${i + 1}. "${e}"`).join('\n')}
Elige entre 1 y 4 ejes que sean pertinentes al diagnóstico. No modifiques ni inventes otros.

### ESTRUCTURA JSON REQUERIDA (Respetar estrictamente para compatibilidad de sistema):
{
  "encabezado": { "proyecto": "...", "docente": "...", "escuela": "...", "grado": "...", "fase": "...", "metodologia": "...", "num_sesiones": ${params.numSesiones} },
  "diagnostico_pedagogico": "Análisis sociocrítico conectando la falla técnica con la limitación social",
  "estructura_curricular": {
    "campos_formativos": ["..."],
    "ejes_articuladores": ["..."],
    "proposito": "...",
    "vinculacion": [ { "campo": "...", "contenido": "...", "pdas": ["..."] } ]
  },
  "secuencia_didactica": [
    { 
      "fase_nombre": "Fase Oficial según Metodología", 
      "sesiones": [
        {
          "numero": 1,
          "titulo": "...",
          "duracion": "60 min",
          "inicio": ["..."],
          "desarrollo": ["Modelaje Docente: [Detalle del andamiaje]", "Acción del Alumno: [Detalle]", "..."],
          "cierre": ["..."],
          "recursos": ["..."],
          "evidencia": "..."
        }
      ]
    }
  ],
  "evaluacion_formativa": { "tecnica": "...", "instrumento": "...", "evidencia_proceso": "...", "criterios": ["..."] }
}
  `;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemInstruction.trim() },
        { role: "user", content: userPrompt.trim() }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 8192
    });

    const finishReason = response.choices[0].finish_reason;
    if (finishReason === "length") {
      throw new Error("Respuesta truncada por límites de longitud. Por favor solicita menos sesiones o pide menos detalle.");
    }

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No se recibió contenido de DeepSeek.");

    return JSON.parse(content) as LessonPlan;

  } catch (error: any) {
    console.error("Error en AI Service:", error);

    // Automatic retry for overload (503) or rate limits (429)
    if (retries > 0 && (error.status === 503 || error.status === 429 || error.message.includes("overload"))) {
      console.log(`Reintentando... (${retries} intentos restantes)`);
      await sleep(2000);
      return generateLessonPlanStream(params, onChunk, retries - 1);
    }

    throw new Error(`ERROR DE GENERACIÓN (DEEPSEEK): ${error.message.substring(0, 100)}`);
  }
};
