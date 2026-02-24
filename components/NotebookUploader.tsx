"use client";

import React, { useState, useRef } from "react";
import { Camera, RefreshCw, Upload, CheckCircle, AlertCircle, X } from "lucide-react";

type Step = "idle" | "preview" | "analyzing" | "feedback" | "text_input";

interface NotebookUploaderProps {
  context?: string;
  studentName?: string;
  studentId?: string;
  worldId?: string;
  levelId?: number;
  onComplete: (success: boolean) => void;
  onClose: () => void;
}

export default function NotebookUploader({ context, studentName = "Aventurero", studentId, worldId, levelId, onComplete, onClose }: NotebookUploaderProps) {
  const [step, setStep] = useState<Step>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textEvidence, setTextEvidence] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setStep("preview");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    setStep("analyzing");
    try {
      const payload: any = { context };
      if (studentId) payload.studentId = studentId;
      if (worldId) payload.worldId = worldId;
      if (levelId !== undefined) payload.levelId = levelId;

      if (imagePreview) {
        payload.imageBase64 = imagePreview;
        payload.mimeType = "image/jpeg";
      } else if (textEvidence) {
        payload.textEvidence = textEvidence;
      }

      const response = await fetch('/api/analyze-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();

      setFeedback({
        correct: data.isCorrect,
        message: data.extractedText || "Revisión completada.",
      });

      setStep("feedback");
      if (data.isCorrect) {
        setTimeout(() => onComplete(true), 1500);
      }
    } catch (e) {
      console.error(e);
      setFeedback({
        correct: false,
        message: "Hubo un error de conexión con la IA. Por favor intenta de nuevo.",
      });
      setStep("feedback");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-500" />
            Escanear Libreta
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[400px]">

          {context && step !== "feedback" && (
            <div className="w-full bg-indigo-50 dark:bg-slate-800 p-4 rounded-2xl border border-indigo-100 dark:border-slate-700 mb-6 max-h-60 overflow-y-auto">
              <span className="text-xs font-black tracking-widest text-indigo-400 uppercase mb-3 block">Problema a Evidenciar</span>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {(() => {
                  try {
                    let parsed: any;

                    if (context.trim().startsWith('{') || context.trim().startsWith('[')) {
                      parsed = JSON.parse(context);
                    } else if (context.startsWith('"') && context.endsWith('"')) {
                      parsed = JSON.parse(context);
                      if (typeof parsed === 'string' && (parsed.trim().startsWith('{') || parsed.trim().startsWith('['))) {
                        parsed = JSON.parse(parsed);
                      }
                    } else {
                      throw new Error("Not JSON");
                    }

                    const activeProblem = parsed.evidenceProblem || parsed.practiceProblem;

                    if (activeProblem) {
                      return (
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap">{(activeProblem.statement || "").replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName)}</p>
                        </div>
                      );
                    }

                    if (parsed.explanation) {
                      return (
                        <div className="space-y-4">
                          <p className="whitespace-pre-wrap font-bold text-slate-800 dark:text-slate-200">
                            📝 Actividad:
                          </p>
                          <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                            Elabora un breve apunte o un dibujo en tu libreta que explique con tus propias palabras lo que acabas de aprender en esta historia. También puedes escribir tu respuesta directamente aquí.
                          </p>
                        </div>
                      );
                    }

                    // Fallback to stringified JSON if pattern doesn't match
                    return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(parsed, null, 2)}</pre>;
                  } catch (e) {
                    // Fallback to raw text if it's not JSON
                    let rawText = context;
                    try {
                      if (context.startsWith('"') && context.endsWith('"')) rawText = JSON.parse(context);
                    } catch (e2) { }
                    return <p className="whitespace-pre-wrap">{rawText}</p>;
                  }
                })()}
              </div>
            </div>
          )}

          {step === "idle" && (
            <div className="w-full flex flex-col gap-6 items-center">
              <h4 className="text-xl font-bold text-slate-700 dark:text-slate-200 text-center">¿Cómo quieres enviar tu evidencia?</h4>

              <div className="grid grid-cols-2 gap-4 w-full">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-4 border-dashed border-indigo-300 cursor-pointer hover:bg-indigo-50 transition-colors group"
                >
                  <Camera className="w-12 h-12 text-indigo-400 group-hover:text-indigo-600 mb-4 transition-colors" />
                  <span className="font-bold text-slate-600 text-center">Subir Foto</span>
                </div>

                <div
                  onClick={() => setStep("text_input")}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-4 border-dashed border-emerald-300 cursor-pointer hover:bg-emerald-50 transition-colors group"
                >
                  <span className="text-5xl mb-3">📝</span>
                  <span className="font-bold text-slate-600 text-center">Escribir</span>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>
          )}

          {step === "text_input" && (
            <div className="w-full h-full flex flex-col gap-4">
              <h4 className="font-bold text-slate-700">Escribe tu respuesta o razonamiento:</h4>
              <textarea
                className="flex-1 w-full p-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-400 outline-none resize-none font-medium text-slate-700 bg-slate-50/50"
                placeholder="Ejemplo: Para encontrar el área del cuadrado primero multipliqué..."
                value={textEvidence}
                onChange={e => setTextEvidence(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("idle")}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Regresar
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!textEvidence.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

          {step === "preview" && imagePreview && (
            <div className="w-full space-y-4">
              <div className="relative rounded-xl overflow-hidden shadow-md aspect-[3/4] bg-black">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("idle"); setImagePreview(null); }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Retomar
                </button>
                <button
                  onClick={handleAnalyze}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Analizar
                </button>
              </div>
            </div>
          )}

          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full opacity-25"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🤖</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200 animate-pulse">Analizando procedimiento...</h4>
                <p className="text-slate-500 text-sm">Identificando números y fórmulas</p>
              </div>
            </div>
          )}

          {step === "feedback" && feedback && (
            <div className="text-center space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${feedback.correct ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {feedback.correct ? <CheckCircle className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
              </div>

              <div className="space-y-2">
                <h4 className={`text-2xl font-bold ${feedback.correct ? 'text-green-700' : 'text-amber-700'}`}>
                  {feedback.correct ? "¡Correcto!" : "Revisión necesaria"}
                </h4>
                <div className={`p-4 rounded-xl text-left text-sm ${feedback.correct ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                  <p className="font-semibold mb-1">Feedback de la IA:</p>
                  {feedback.message}
                </div>
              </div>

              <button
                onClick={onClose}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${feedback.correct ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                {feedback.correct ? "Continuar Aventura" : "Intentar de nuevo"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
