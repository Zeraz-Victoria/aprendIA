import { IncidentData, AnalysisResult, RiskLevel } from '../types';
import { LEGAL_FRAMEWORK, SEV_PROTOCOLS } from '../constants';

export const analyzeIncident = async (data: IncidentData): Promise<AnalysisResult> => {
  const SELECTED_STATE = data.state;

  const STATE_LEGAL_SNIPPETS = SELECTED_STATE === 'Veracruz'
    ? "Veracruz Local Documentation (Resolved Server-Side)"
    : "No hay protocolos específicos para este estado en la base local.";

  try {
    const response = await fetch("/api/ai/edulegal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        stateLegalSnippets: STATE_LEGAL_SNIPPETS,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || "Error en el servidor de análisis legal.");
    }

    const raw = await response.json();

    if (raw.error) {
      throw new Error(raw.error);
    }

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
    console.error("EduLegal Service Error:", error);
    throw new Error(error.message || "Falló la conexión con el servicio de Gemini.");
  }
};