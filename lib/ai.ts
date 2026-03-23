import { GoogleGenerativeAI } from '@google/generative-ai';

// Modelos centralizados — cambiar aquí afecta toda la app
export const AI_MODEL_FAST = 'gemini-1.5-flash';       // Rápido, estable, multimodal
export const AI_MODEL_FLASH = 'gemini-2.0-flash';      // Más capaz, para generación de contenido
export const AI_MODEL_IMAGE = 'gemini-2.0-flash-exp';  // Para generación de imágenes

export function getGenAI(): GoogleGenerativeAI {
    const key = process.env.AI_API_KEY;
    if (!key) {
        throw new Error('AI_API_KEY no está configurada en las variables de entorno');
    }
    return new GoogleGenerativeAI(key);
}
