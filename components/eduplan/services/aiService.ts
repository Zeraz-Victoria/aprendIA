import { LessonPlan, PlanningRequest } from "../types";

/**
 * Genera la planeación didáctica utilizando exclusivamente la API de Gemini AI desde el backend.
 */
export const generateLessonPlanStream = async (
  params: PlanningRequest,
  onChunk?: (text: string) => void
): Promise<LessonPlan> => {
  const res = await fetch("/api/ai/eduplan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Ocurrió un error al generar la planeación.");
  }

  if (!data.plan) {
    throw new Error("No se recibió una planeación válida desde el servidor.");
  }

  return data.plan as LessonPlan;
};
