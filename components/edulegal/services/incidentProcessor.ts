import OpenAI from "openai";
import { IncidentData, AnalysisResult, RiskLevel } from '../types';
import { LEGAL_FRAMEWORK, SEV_PROTOCOLS } from '../constants';

export const analyzeIncident = async (data: IncidentData): Promise<AnalysisResult> => {
  const client = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
    dangerouslyAllowBrowser: true
  });
  // Configuración dinámica por estado
  const SELECTED_STATE = data.state;
  // Solo tenemos fragmentos específicos para Veracruz por ahora
  const HAS_LOCAL_PROTOCOLS = SELECTED_STATE === 'Veracruz';

  const STATE_LEGAL_SNIPPETS = HAS_LOCAL_PROTOCOLS
    ? JSON.stringify(LEGAL_FRAMEWORK) + "\n" + JSON.stringify(SEV_PROTOCOLS)
    : "No hay protocolos específicos para este estado en la base local.";

  const FEDERAL_LEGAL_BASE = "Ley General de Educación (Arts. 7, 73, 74, 128), Ley General de los Derechos de Niñas, Niños y Adolescentes (Arts. 46, 47, 103, 105), Protocolos de Convivencia Escolar SEP (Federal).";

  const systemInstruction = `
    # PERFIL: NÚCLEO LEGAL EDUCATIVO MÉXICO (ANTIGRAVITY)
    Eres un motor experto en Derecho Educativo Mexicano de alta precisión. Tu función es generar protocolos de actuación escolar basados estrictamente en la entidad federativa solicitada: ${SELECTED_STATE}.

    # JERARQUÍA DE FUENTES (ESTRICTA)
    1. **Contexto Estatal (${SELECTED_STATE}):** Utiliza exclusivamente ${STATE_LEGAL_SNIPPETS}.
    2. **Normativa Federal:** Usa ${FEDERAL_LEGAL_BASE} solo como supletorio o si otorga mayor protección a Derechos Humanos.

    # REGLA DE EXCLUSIVIDAD Y PRECISIÓN
    - No inventes artículos ni cites leyes de estados distintos a ${SELECTED_STATE}. 
    - Si la consulta no encuentra el artículo exacto en la base proporcionada, NO lo pongas; menciona el nombre de la ley pero no inventes el número de artículo.

    # DIRECTORIO DE AUTORIDADES DE PROTECCIÓN (USO OBLIGATORIO)
    Toda mención a la autoridad de protección de NNA en ${SELECTED_STATE} DEBE usar exactamente el nombre registrado en este directorio:
    - Aguascalientes: Procuraduría de Protección de Derechos de NNA del Estado de Aguascalientes
    - Baja California: Procuraduría para la Defensa de los Menores y la Familia de BC
    - Baja California Sur: Procuraduría de Protección de NNA de BCS
    - Campeche: Procuraduría de Protección de NNA del Estado de Campeche
    - Chiapas: Procuraduría de Protección de NNA del Estado de Chiapas
    - Chihuahua: Procuraduría de Protección de NNA del Estado de Chihuahua
    - Ciudad de México: Procuraduría de Protección de los Derechos de NNA de la CDMX
    - Coahuila: Procuraduría para Niños, Niñas y la Familia (PRONNIF)
    - Colima: Procuraduría de Protección de NNA del Estado de Colima
    - Durango: Procuraduría de Protección de NNA del Estado de Durango
    - Estado de México: Procuraduría de Protección de NNA del Estado de México
    - Guanajuato: Procuraduría de Protección de NNA del Estado de Guanajuato
    - Guerrero: Procuraduría de Protección de los Derechos de las NNA de Guerrero
    - Hidalgo: Procuraduría de Protección de NNA del Estado de Hidalgo
    - Jalisco: Procuraduría de Protección de NNA del Estado de Jalisco (PPNNA)
    - Michoacán: Procuraduría de Protección de NNA del Estado de Michoacán
    - Morelos: Procuraduría de Protección de NNA del Estado de Morelos
    - Nayarit: Procuraduría de Protección de NNA del Estado de Nayarit
    - Nuevo León: Procuraduría de Protección de NNA del Estado de Nuevo León
    - Oaxaca: Procuraduría de Protección de los Derechos de NNA de Oaxaca
    - Puebla: Procuraduría de Protección de los Derechos de NNA de Puebla
    - Querétaro: Procuraduría de Protección de NNA del Estado de Querétaro
    - Quintana Roo: Procuraduría de Protección de NNA de Quintana Roo
    - San Luis Potosí: Procuraduría de Protección de NNA (PPNNA) de SLP
    - Sinaloa: Procuraduría de Protección de NNA del Estado de Sinaloa
    - Sonora: Procuraduría de Protección de NNA del Estado de Sonora
    - Tabasco: Procuraduría de Protección de la Familia y de los Derechos de las NNA de Tabasco
    - Tamaulipas: Procuraduría de Protección a NNA y la Familia de Tamaulipas
    - Tlaxcala: Procuraduría para la Protección de NNA del Estado de Tlaxcala
    - Veracruz: Procuraduría Estatal de Protección de NNA de Veracruz
    - Yucatán: Procuraduría de Protección de NNA del Estado de Yucatán (PRODENNA)
    - Zacatecas: Procuraduría de Protección a NNA y Familia de Zacatecas

    # GUÍA DE CLASIFICACIÓN DE GRAVEDAD
    - **ALTO:** Violencia física, sexual, armas, drogas, amenazas o Bullying sistémico.
    - **MEDIO:** Conflictos verbales, ciberacoso, daños materiales, faltas graves.
    - **BAJO:** Faltas administrativas menores.

    # FORMATO DE SALIDA (JSON ESTRICTO)
    {
      "entidad": "${SELECTED_STATE}",
      "class": "Tipo específico de incidente",
      "risk": "Bajo|Medio|Alto",
      "plan": [{"role": "Rol responsable", "actions": ["Acción + (Doc: [Nombre], Art: [N°])"]}],
      "base": [{"doc": "Nombre completo del documento", "art": "N° de artículo", "desc": "Resumen del fundamento"}],
      "measures": ["Medidas formativas"],
      "agreements": ["Compromisos para el acta"]
    }
  `;

  const userPrompt = `
    INCIDENTE A ANALIZAR (ESTADO: ${SELECTED_STATE}):
    - Reporta: ${data.reporter}
    - Lugar: ${data.location}
    - Fecha: ${data.date} ${data.time}
    - Involucrados: ${data.involvedPersons}
    - Descripción de Hechos: ${data.description}
  `;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      top_p: 1.0
    });

    const text = response.choices[0].message.content;
    if (!text) throw new Error("DeepSeek no devolvió contenido.");

    const raw = JSON.parse(text);

    if (raw.error) {
      throw new Error(raw.error);
    }

    // Mapeo adaptado al nuevo formato V5 (específicamente nombres de llaves en plan)
    return {
      classification: raw.class,
      riskLevel: raw.risk as RiskLevel,
      actionPlan: raw.plan.map((p: any) => ({
        role: p.role,
        actions: p.actions
      })),
      legalBasis: raw.base.map((b: any) => ({
        document: b.doc,
        article: b.art,
        description: b.desc || "Fundamento legal aplicado por el motor federal/estatal."
      })),
      requiredDocuments: [],
      consideredDocuments: [raw.entidad || SELECTED_STATE],
      canalizationBody: null,
      disciplinaryMeasures: raw.measures || [],
      finalAgreements: raw.agreements || []
    } as AnalysisResult;
  } catch (error: any) {
    console.error("DeepSeek Service Error:", error);
    throw new Error(error.message || "Falló la conexión con el servicio de DeepSeek.");
  }
};