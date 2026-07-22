
export type Methodology =
  | 'Proyectos Comunitarios'
  | 'Aprendizaje Basado en Indagación (STEAM)'
  | 'Aprendizaje Basado en Problemas (ABP)'
  | 'Aprendizaje Servicio (AS)';

export interface ContentPdaPair {
  asignatura: string;
  contenido: string;
  pda_vinculados: string[];
}

export interface Session {
  numero: number;
  titulo: string;
  duracion: string;
  actividades_inicio: string[];
  actividades_desarrollo: string[];
  actividades_cierre: string[];
  recursos: string[];
  evaluacion_sesion: string;
  paj_vinculado?: string; // Pensamiento de Aprendizaje Justificado
}

export interface Phase {
  nombre: string;
  descripcion: string;
  sesiones: Session[];
}

export interface Bibliography {
  autor: string;
  titulo: string;
  año: string;
  uso: string;
}

export interface Vinculacion {
  campo: string;
  contenido: string;
  pdas: string[];
}

export interface Session {
  numero: number;
  titulo: string;
  duracion: string;
  inicio: string[];
  desarrollo: string[];
  cierre: string[];
  recursos: string[];
  evidencia: string;
}

export interface SecuenciaDidactica {
  fase_nombre: string;
  sesiones: Session[];
}

export interface NewEvaluation {
  tecnica: string;
  instrumento: string;
  evidencia_proceso: string;
  criterios: string[];
}

export interface LessonPlan {
  encabezado: {
    proyecto: string;
    docente: string;
    grado: string;
    fase: string;
    escuela: string;
    metodologia: string;
    num_sesiones: number;
  };
  diagnostico_pedagogico: string;
  estructura_curricular: {
    campos_formativos: string[];
    ejes_articuladores: string[];
    vinculacion: Vinculacion[];
    proposito: string;
  };
  secuencia_didactica: SecuenciaDidactica[];
  evaluacion_formativa: NewEvaluation;
}

export interface PlanningRequest {
  pdfBase64?: string;
  pdfName?: string;
  nombreDocente: string;
  nombreEscuela: string;
  cct?: string;
  zonaEscolar?: string;
  fase: string;
  grado: string;
  metodologia: Methodology;
  contextoAdicional?: string;
  numSesiones: number;
}
