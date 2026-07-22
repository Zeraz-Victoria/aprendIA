export enum RiskLevel {
  BAJO = 'Bajo',
  MEDIO = 'Medio',
  ALTO = 'Alto'
}

export enum ReportRole {
  DOCENTE = 'Docente',
  DIRECTOR = 'Director',
  TUTOR = 'Tutor',
  ALUMNO = 'Alumno',
  APOYO = 'Personal de Apoyo',
  OTRO = 'Otro'
}

export enum LocationType {
  AULA = 'Aula',
  PATIO = 'Patio/Receso',
  BANOS = 'Baños',
  ENTRADA = 'Entrada/Salida',
  REDES = 'Redes Sociales',
  OTRO = 'Otro'
}

export interface IncidentData {
  reporter: ReportRole;
  location: LocationType;
  date: string;
  time: string;
  state: string;
  description: string;
  involvedPersons: string;
}

export interface ActionStep {
  role: string;
  actions: string[];
}

export interface LegalReference {
  document: string;
  article: string;
  description: string;
}

export interface AnalysisResult {
  classification: string;
  riskLevel: RiskLevel;
  actionPlan: ActionStep[];
  legalBasis: LegalReference[];
  requiredDocuments: string[];
  consideredDocuments: string[];
  canalizationBody?: string | null;
  disciplinaryMeasures: string[]; // Medidas formativas/sanciones
  finalAgreements: string[]; // Acuerdos de padres y alumnos
}