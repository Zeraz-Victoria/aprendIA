import { RiskLevel, ActionStep, LegalReference } from './types';

export const MEXICO_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

// Base normativa completa para referencia (Base de Conocimiento del Sistema)
export const LEGAL_FRAMEWORK = {
  // --- NIVEL CONSTITUCIONAL Y SUPREMO ---
  CONST: 'Constitución Política de los Estados Unidos Mexicanos (Arts. 1, 3, 4 y 31 Fracc. I)',
  INTL: 'Convención sobre los Derechos del Niño y Tratados Internacionales de DDHH',

  // --- LEYES GENERALES (FEDERALES) ---
  LGE: 'Ley General de Educación (Vigente)',
  LGDNNA: 'Ley General de los Derechos de Niñas, Niños y Adolescentes',
  LGSCMM: 'Ley General del Sistema para la Carrera de las Maestras y los Maestros',
  LMEJOREDU: 'Ley Reglamentaria del Art. 3° en materia de Mejora Continua de la Educación',
  LGAMVLV: 'Ley General de Acceso de las Mujeres a una Vida Libre de Violencia',
  LGIN: 'Ley General para la Inclusión de las Personas con Discapacidad',
  LFRSP: 'Ley Federal de Responsabilidades de los Servidores Públicos',

  // --- NORMATIVA ESTATAL (VERACRUZ) ---
  LEEV: 'Ley de Educación del Estado de Veracruz de Ignacio de la Llave',
  L303: 'Ley No. 303 Contra el Acoso Escolar para el Estado de Veracruz',
  L573: 'Ley No. 573 de los Derechos de NNA del Estado de Veracruz',
  CPV: 'Código Penal para el Estado de Veracruz',
  LRESP_SERV_VER: 'Ley de Responsabilidades Administrativas para el Estado de Veracruz',

  // --- REGLAMENTOS Y ACUERDOS ---
  RAPF: 'Reglamento de Asociaciones de Padres de Familia',
  RCGTSEP: 'Reglamento de las Condiciones Generales de Trabajo del Personal de la SEP',
  ACUERDO_716: 'Acuerdo 716 (Lineamientos para Consejos de Participación Social)',
  ACUERDO_717: 'Acuerdo 717 (Lineamientos para la Gestión Escolar)',
  ACUERDO_EVAL: 'Normas generales para la evaluación del aprendizaje (Acuerdo Vigente)',
  LINEAMIENTOS_CTE: 'Lineamientos para la organización y funcionamiento de los Consejos Técnicos Escolares',

  // --- DOCUMENTOS RECTORES DE LA FUNCIÓN ---
  PERFILES_DOMINIOS: 'Marco para la Excelencia en la Enseñanza y la Gestión Escolar (Perfiles Profesionales USICAMM)',
  MANUAL_ORG_SEC: 'Manual de Organización de la Escuela de Educación Secundaria',
  MANUAL_ORG_PRI: 'Manual de Organización de la Escuela de Educación Primaria',

  // --- PROTOCOLOS DE ACTUACIÓN ---
  PROTOCOLO_SEV: 'Protocolo para la Prevención, Detección y Actuación en casos de Acoso Escolar, Maltrato Infantil y Actos de Connotación Sexual (SEV)',
  PNCE: 'Programa Nacional de Convivencia Escolar (Documentos Base)',
  CONVIVENCIA: 'Acuerdos de Convivencia Escolar del Plantel'
};

export const SEV_PROTOCOLS = {
  ACOSO: {
    name: 'Acoso Escolar (Bullying)',
    consideredDocs: [
      LEGAL_FRAMEWORK.CONST,
      LEGAL_FRAMEWORK.LGDNNA,
      LEGAL_FRAMEWORK.L303,
      LEGAL_FRAMEWORK.PROTOCOLO_SEV,
      LEGAL_FRAMEWORK.CONVIVENCIA,
      LEGAL_FRAMEWORK.LEEV
    ],
    legal: [
      {
        document: LEGAL_FRAMEWORK.L303,
        article: 'Arts. 12, 14 y 42',
        description: 'Define el acoso escolar y establece la obligación de notificar a la autoridad educativa y a los padres en un plazo máximo de 24 horas.'
      },
      {
        document: LEGAL_FRAMEWORK.PROTOCOLO_SEV,
        article: 'Apartado de Acoso Escolar',
        description: 'Establece la ruta: Detección -> Notificación -> Intervención -> Seguimiento.'
      },
      {
        document: LEGAL_FRAMEWORK.LGE,
        article: 'Art. 73',
        description: 'Obligación de docentes y directivos de proteger la integridad física y mental de los educandos.'
      }
    ]
  },
  VIOLENCIA: {
    name: 'Violencia Física o Verbal',
    consideredDocs: [
      LEGAL_FRAMEWORK.CONST,
      LEGAL_FRAMEWORK.LGDNNA,
      LEGAL_FRAMEWORK.L573,
      LEGAL_FRAMEWORK.PROTOCOLO_SEV,
      LEGAL_FRAMEWORK.CONVIVENCIA,
      LEGAL_FRAMEWORK.LGIN
    ],
    legal: [
      {
        document: LEGAL_FRAMEWORK.LGDNNA,
        article: 'Art. 47',
        description: 'Derecho de NNA a una vida libre de violencia y a la integridad personal.'
      },
      {
        document: LEGAL_FRAMEWORK.L573,
        article: 'Título Segundo',
        description: 'Garantía estatal de protección contra cualquier forma de perjuicio o abuso físico o mental.'
      }
    ]
  },
  SEXUAL: {
    name: 'Connotación Sexual / Abuso (ASI)',
    consideredDocs: [
      LEGAL_FRAMEWORK.CONST,
      LEGAL_FRAMEWORK.INTL,
      LEGAL_FRAMEWORK.LGDNNA,
      LEGAL_FRAMEWORK.CPV,
      LEGAL_FRAMEWORK.PROTOCOLO_SEV,
      LEGAL_FRAMEWORK.LGAMVLV,
      LEGAL_FRAMEWORK.LFRSP
    ],
    legal: [
      {
        document: LEGAL_FRAMEWORK.PROTOCOLO_SEV,
        article: 'Ruta Crítica de ASI',
        description: 'En casos de connotación sexual, NO se investiga internamente. Se notifica de inmediato a Fiscalía y Procuraduría de Protección de NNA.'
      },
      {
        document: LEGAL_FRAMEWORK.CPV,
        article: 'Delitos contra la libertad sexual',
        description: 'Obligación de cualquier servidor público de denunciar hechos posiblemente constitutivos de delito.'
      },
      {
        document: LEGAL_FRAMEWORK.LGDNNA,
        article: 'Capítulo de Protección',
        description: 'Prioridad absoluta del Interés Superior de la Niñez ante cualquier procedimiento administrativo.'
      }
    ]
  },
  DROGAS_ARMAS: {
    name: 'Posesión de Sustancias o Armas',
    consideredDocs: [
      LEGAL_FRAMEWORK.LGDNNA,
      LEGAL_FRAMEWORK.LEEV,
      LEGAL_FRAMEWORK.PROTOCOLO_SEV,
      LEGAL_FRAMEWORK.CPV,
      LEGAL_FRAMEWORK.LGE
    ],
    legal: [
      {
        document: LEGAL_FRAMEWORK.PROTOCOLO_SEV,
        article: 'Protocolo de Seguridad Escolar',
        description: 'Resguardo de la integridad de la comunidad escolar. Revisión de pertenencias bajo protocolos de derechos humanos (Mochila Segura solo con autorización y presencia de padres).'
      }
    ]
  },
  NEGLIGENCIA: {
    name: 'Negligencia / Omisión de Cuidados',
    consideredDocs: [
      LEGAL_FRAMEWORK.LGDNNA,
      LEGAL_FRAMEWORK.L573,
      LEGAL_FRAMEWORK.RAPF,
      LEGAL_FRAMEWORK.CONST
    ],
    legal: [
      {
        document: LEGAL_FRAMEWORK.LGDNNA,
        article: 'Art. 103',
        description: 'Obligaciones de quienes ejercen la patria potestad, tutela o guarda y custodia.'
      },
      {
        document: LEGAL_FRAMEWORK.RAPF,
        article: 'Obligaciones',
        description: 'Deber de los padres de colaborar con las autoridades escolares y vigilar la conducta de sus hijos.'
      }
    ]
  },
  LEVE: {
    name: 'Falta al Reglamento Escolar',
    consideredDocs: [
      LEGAL_FRAMEWORK.LEEV,
      LEGAL_FRAMEWORK.CONVIVENCIA,
      LEGAL_FRAMEWORK.LGE
    ],
    legal: [
      {
        document: LEGAL_FRAMEWORK.CONVIVENCIA,
        article: 'Normas Internas',
        description: 'Incumplimiento de normas de disciplina que no ponen en riesgo la integridad física.'
      },
      {
        document: LEGAL_FRAMEWORK.LGE,
        article: 'Derechos y Obligaciones',
        description: 'Corresponsabilidad de los educandos en su proceso educativo.'
      }
    ]
  }
};

export const ACTIONS_TEMPLATE: Record<RiskLevel, ActionStep[]> = {
  [RiskLevel.BAJO]: [
    { role: 'Docente', actions: ['Dialogar con el alumno en privado para entender el contexto.', 'Registrar el evento en la bitácora de grupo con fecha y hora.', 'Aplicar medida formativa y restaurativa acorde al Acuerdo de Convivencia.'] },
    { role: 'Director', actions: ['Supervisar que la medida sea formativa y no punitiva.', 'Dar visto bueno a la bitácora del docente.'] },
    { role: 'Padres', actions: ['Ser notificados mediante agenda o recado escolar.', 'Reforzar valores y conducta en casa.'] }
  ],
  [RiskLevel.MEDIO]: [
    { role: 'Docente', actions: ['Intervenir inmediatamente para cesar la conducta.', 'Elaborar reporte de incidencia detallado.', 'Solicitar intervención de trabajo social o departamento de orientación.', 'Citar a padres de familia.'] },
    { role: 'Director', actions: ['Atender a padres de familia mediante entrevista formal.', 'Levantar Acta Administrativa o de Hechos según corresponda.', 'Establecer Carta Compromiso de conducta.', 'Dar seguimiento a los acuerdos establecidos.'] },
    { role: 'Padres', actions: ['Acudir obligatoriamente al citatorio escolar.', 'Firmar acuerdos de corresponsabilidad.', 'Garantizar el cumplimiento de medidas en el hogar.'] }
  ],
  [RiskLevel.ALTO]: [
    { role: 'Docente', actions: ['ACTIVAR CÓDIGO DE EMERGENCIA INMEDIATO.', 'Resguardar a la víctima y separar al agresor (sin exponerse).', 'Evitar revictimización: NO interrogar sobre detalles traumáticos.', 'Informar a la Dirección inmediatamente por escrito (Bitácora).'] },
    { role: 'Director', actions: ['Notificar de inmediato al Supervisor Escolar.', 'Notificar a la Procuraduría de Protección de NNA (DIF Municipal/Estatal).', 'Dar aviso a Fiscalía General del Estado (si hay presunción de delito).', 'Levantar Acta Circunstanciada de Hechos con testigos de asistencia.', 'NO realizar investigación ministerial, solo administrativa.'] },
    { role: 'Padres', actions: ['Presentarse de urgencia en el plantel al ser notificados.', 'Recibir los oficios de canalización a dependencias externas.', 'Acompañar al menor a las instancias correspondientes (Fiscalía, Salud, DIF).'] }
  ]
};