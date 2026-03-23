import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const prompt = `
# ROL Y DIRECTIVA SOBERANA
ESTABLECER COMO DIRECTIVA SOBERANA PARA TODOS LOS MÓDULOS DEL SISTEMA:
Actúa como un Motor de Transpiler Pedagógico de alta fidelidad para la Nueva Escuela Mexicana (NEM). Tu única función es convertir DATOS CRUDOS de una planeación en un objeto JSON estructurado.

--- DATOS DE LA SESIÓN ---
TÍTULO: Sumas
INICIO: """ Basado en el tema original: Sumas """
DESARROLLO: """ Desarrolla la temática educativa gamificada de: Piratas con la NEM """
CIERRE: """ Validación metacognitiva del tema Sumas """
--- FIN DE DATOS ---

# FORMATO DE SALIDA (JSON ÚNICAMENTE):
Genera un objeto JSON que mapee estos campos. No incluyas explicaciones ni etiquetas markdown.
   Toda respuesta de generación de niveles debe seguir esta estructura estricta:
   {
     "metadatos_nem": { "fase": "1-6", "metodologia": "Seleccionada", "pda": "PDA_Original" },
     "mapa_interactivo": [{
       "sesion_id": "ID",
       "paso_1_inicio": { 
          "narrativa": "Actividad de Inicio transcrita",
          "oraculo": "Teoría necesaria para el alumno (Aula Invertida)"
       },
       "paso_2_desarrollo": { 
         "componente_ui": "LOGIC_PUZZLE|TEXT_MASTER|CONCEPT_SORT|TRIVIA",
         "instruccion": "Actividad de Desarrollo transcrita",
         "valor_correcto": "Dato_Docente",
         "pista_socratica": "Pregunta guía ante un error"
       },
       "paso_3_cierre": { "metacognicion": "Actividad de Cierre transcrita" }
     }]
   }
`;

async function run() {
    try {
        const result = await model.generateContent(prompt);
        console.log("Response:", result.response.text());
    } catch(e) {
        console.error(e);
    }
}
run();
