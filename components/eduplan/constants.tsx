
import { Methodology } from './types';

export interface FaseConfig {
  id: string;
  nombre: string;
  grados: string[];
}

export const FASES_NEM: FaseConfig[] = [
  { id: 'Fase 1', nombre: 'Fase 1: Educación Inicial', grados: ['Educación Inicial'] },
  { id: 'Fase 2', nombre: 'Fase 2: Educación Preescolar', grados: ['1° Preescolar', '2° Preescolar', '3° Preescolar'] },
  { id: 'Fase 3', nombre: 'Fase 3: Educación Primaria', grados: ['1° Primaria', '2° Primaria'] },
  { id: 'Fase 4', nombre: 'Fase 4: Educación Primaria', grados: ['3° Primaria', '4° Primaria'] },
  { id: 'Fase 5', nombre: 'Fase 5: Educación Primaria', grados: ['5° Primaria', '6° Primaria'] },
  { id: 'Fase 6', nombre: 'Fase 6: Educación Secundaria', grados: ['1° Secundaria', '2° Secundaria', '3° Secundaria'] },
];

// Helper para obtener todos los grados y su fase de forma plana
export const GRADOS_FLAT = FASES_NEM.flatMap(fase => 
  fase.grados.map(grado => ({
    grado,
    faseId: fase.id,
    faseNombre: fase.nombre
  }))
);

export const METODOLOGIAS: Methodology[] = [
  'Proyectos Comunitarios',
  'Aprendizaje Basado en Indagación (STEAM)',
  'Aprendizaje Basado en Problemas (ABP)',
  'Aprendizaje Servicio (AS)'
];

// Los 7 ejes articuladores oficiales del Programa Sintético NEM 2022.
// La IA SOLO puede elegir de esta lista. No puede inventar ni modificar ninguno.
export const EJES_ARTICULADORES_NEM: string[] = [
  "Inclusión",
  "Pensamiento Crítico",
  "Interculturalidad Crítica",
  "Igualdad de Género",
  "Vida Saludable",
  "Apropiación de las Culturas a través de la Lectura y la Escritura",
  "Artes y Experiencias Estéticas"
];

export const MARCO_PEDAGOGICO = {
  'Proyectos Comunitarios': {
    enfoque: 'Exploración del entorno social y resolución de problemas de la comunidad.',
    fases: ['1. Planeación (Identificación y recuperación)', '2. Acción (Acercamiento y producciones)', '3. Intervención (Difusión y seguimiento)']
  },
  'Aprendizaje Basado en Indagación (STEAM)': {
    enfoque: 'Ciencia, Tecnología, Ingeniería, Artes y Matemáticas bajo indagación científica.',
    fases: ['1. Introducción al tema', '2. Diseño de investigación', '3. Respuesta a preguntas', '4. Comunicación y aplicación', '5. Reflexión sobre el proceso']
  },
  'Aprendizaje Basado en Problemas (ABP)': {
    enfoque: 'Situaciones problema reales para movilizar conocimientos y pensamiento crítico.',
    fases: ['Presentamos', 'Recolectamos', 'Formulamos el problema', 'Organicemos la experiencia', 'Vivamos la experiencia', 'Resultados y análisis']
  },
  'Aprendizaje Servicio (AS)': {
    enfoque: 'Aprendizaje combinado con compromiso social y servicio solidario.',
    fases: ['1. Punto de partida', '2. Lo que sé y lo que quiero saber', '3. Organicemos las actividades', '4. Creatividad en marcha', '5. Compartimos y evaluamos']
  }
};
