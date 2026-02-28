"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, Upload, CheckCircle, AlertCircle, X, Mic, ImageIcon, Sparkles } from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import TeacherUnlockModal from "./TeacherUnlockModal";

function fixImageUrl(src: string): string {
  if (src.includes("pollinations.ai")) {
    let prompt = "";
    if (src.includes("/p/")) {
      prompt = src.split("/p/")[1]?.split("?")[0]?.replace(/\\+/g, " ") || "";
    } else if (src.includes("/prompt/")) {
      prompt = decodeURIComponent(src.split("/prompt/")[1]?.split("?")[0] || "");
    }
    if (prompt) {
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=400&nologo=true`;
    }
  }
  return src;
}

function PollinationsImage({ src, alt }: { src?: string; alt?: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const fixedSrc = src ? fixImageUrl(src) : "";

  return status === "error" || !fixedSrc ? (
    <div className="w-full rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 border-2 border-dashed border-teal-200 p-6 text-center my-4">
      <ImageIcon className="w-12 h-12 text-teal-300 mx-auto mb-3" />
      <p className="text-teal-600 font-medium text-sm italic">{alt || "Ilustración"}</p>
    </div>
  ) : (
    <div className="my-4 relative">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-teal-50 rounded-xl animate-pulse">
          <Sparkles className="w-8 h-8 text-teal-300 animate-spin" />
        </div>
      )}
      <img
        src={fixedSrc}
        alt={alt || "Ilustración"}
        className="w-full rounded-xl shadow-md border border-teal-100"
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}

const markdownComponents: any = {
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <PollinationsImage src={src} alt={alt} />
  ),
};

type Step = "idle" | "preview" | "analyzing" | "feedback" | "text_input" | "manual_upload";

interface NotebookUploaderProps {
  context?: string;
  narrative?: string;
  studentName?: string;
  studentId?: string;
  worldId?: string;
  levelId?: number;
  onComplete: (success: boolean) => void;
  onClose: () => void;
}

export default function NotebookUploader({ context, narrative, studentName = "Aventurero", studentId, worldId, levelId, onComplete, onClose }: NotebookUploaderProps) {
  const [step, setStep] = useState<Step>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textEvidence, setTextEvidence] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    canAdvance?: boolean;
    grade?: number;
    message: string
  } | null>(null);

  const [showTeacherAuth, setShowTeacherAuth] = useState(false);

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const parsedContext = React.useMemo(() => {
    if (!context) return null;
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
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [context]);

  const requiredEvidenceType = parsedContext?.content?.practiceProblem?.tipo_evidencia_requerida || parsedContext?.tipo_evidencia_requerida || "CUALQUIERA";

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX'; // Or 'es-ES'

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Append to existing text if it's a final result, otherwise just update with interim
        if (finalTranscript) {
          setTextEvidence(prev => prev + (prev.endsWith(' ') ? '' : ' ') + finalTranscript + ' ');
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setRecognitionSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Small trick to append a space before dictating more
      setTextEvidence(prev => prev.length > 0 && !prev.endsWith(' ') ? prev + ' ' : prev);
      recognitionRef.current.start();
    }
  };

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
      if (narrative) payload.narrative = narrative;
      if (studentId) payload.studentId = studentId;
      if (worldId) payload.worldId = worldId;
      if (levelId !== undefined) payload.levelId = levelId;

      if (imagePreview) {
        payload.imageBase64 = imagePreview;
        payload.mimeType = "image/jpeg";
      } else if (textEvidence) {
        payload.textEvidence = textEvidence;
      }

      payload.evidenceType = requiredEvidenceType;

      const response = await fetch('/api/analyze-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.extractedText || "Error en la validación");
      }
      const data = await response.json();

      setFeedback({
        correct: data.isCorrect,
        canAdvance: data.canAdvance,
        grade: data.grade,
        message: data.extractedText || "Revisión completada.",
      });

      setStep("feedback");
      if (data.isCorrect && data.grade === 10) {
        setTimeout(() => onComplete(true), 2500);
      }
    } catch (e: any) {
      console.error(e);
      setFeedback({
        correct: false,
        canAdvance: false,
        grade: 0,
        message: e.message || "Hubo un error de conexión con la IA. Por favor intenta de nuevo.",
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
            <Camera className="w-5 h-5 text-teal-500" />
            Escanear Libreta
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[400px]">



          {step === "idle" && !showTeacherAuth && (
            <div className="w-full flex flex-col gap-6 items-center">
              <h4 className="text-xl font-bold text-slate-700 dark:text-slate-200 text-center">
                ¿Cómo quieres enviar tu evidencia?
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-4 border-dashed border-teal-300 cursor-pointer hover:bg-teal-50 transition-colors group"
                >
                  <Camera className="w-12 h-12 text-teal-400 group-hover:text-teal-600 mb-4 transition-colors" />
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

              <button
                onClick={() => setStep("manual_upload")}
                className="mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-4 transition-colors"
              >
                No tengo cámara, mi maestro subirá la foto
              </button>
            </div>
          )}

          {step === "manual_upload" && (
            <div className="w-full flex flex-col items-center text-center space-y-6">
              <div className="bg-amber-100 text-amber-600 p-4 rounded-full">
                <AlertCircle className="w-12 h-12" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-amber-600 mb-2">¡Aviso Importante!</h4>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  Pídele a tu maestro que tome la foto, pero <strong className="text-slate-800 dark:text-slate-100">antes asegúrate de ESCRIBIR TU NOMBRE COMPLETO en grande hasta arriba de tu hoja de la libreta</strong> para que la IA pueda reconocerte.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-4">
                <button
                  onClick={() => setStep("idle")}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Regresar
                </button>
                <button
                  onClick={async () => {
                    setStep("analyzing");
                    try {
                      const res = await fetch('/api/teacher/request-manual-evaluation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          studentId,
                          worldId,
                          levelId,
                          evidenceType: requiredEvidenceType
                        })
                      });
                      if (res.ok) {
                        setFeedback({
                          correct: true,
                          message: "¡Listo! Tu solicitud fue enviada. Tu maestro subirá la foto pronto."
                        });
                        setStep("feedback");
                        setTimeout(() => onComplete(true), 3000);
                      } else {
                        throw new Error("Error en la solicitud");
                      }
                    } catch (e) {
                      console.error(e);
                      setFeedback({
                        correct: false,
                        canAdvance: false,
                        message: "Hubo un error al enviar la solicitud. Intenta de nuevo."
                      });
                      setStep("feedback");
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg"
                >
                  Entendido, ya lo escribí
                </button>
              </div>
            </div>
          )}

          {step === "idle" && showTeacherAuth && (
            <TeacherUnlockModal
              studentId={studentId || ""}
              worldId={worldId || ""}
              levelId={typeof levelId === 'string' ? parseInt(levelId, 10) : (levelId || 0)}
              evidenceType={requiredEvidenceType}
              context={context}
              narrative={narrative}
              onClose={() => setShowTeacherAuth(false)}
              onSuccess={() => {
                setShowTeacherAuth(false);
                setFeedback({
                  correct: true,
                  message: "¡Validación del docente exitosa! Sigue adelante, tu maestro subirá la evidencia."
                });
                setStep("feedback");
                setTimeout(() => onComplete(true), 2500);
              }}
            />
          )}

          {step === "text_input" && (
            <div className="w-full h-full flex flex-col gap-4">
              <h4 className="font-bold text-slate-700">Escribe tu respuesta o razonamiento:</h4>
              <div className="relative flex-1">
                <textarea
                  className="w-full h-full p-4 pb-16 rounded-2xl border-2 border-teal-100 focus:border-teal-400 outline-none resize-none font-medium text-slate-700 bg-slate-50/50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                  placeholder="Escribe o dicta tu respuesta..."
                  value={textEvidence}
                  onChange={e => setTextEvidence(e.target.value)}
                />
              </div>

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
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-lg disabled:opacity-50"
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
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Analizar
                </button>
              </div>
            </div>
          )}

          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border-4 border-teal-200 rounded-full opacity-25"></div>
                <div className="absolute inset-0 border-4 border-t-teal-600 rounded-full animate-spin"></div>
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
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${feedback.correct ? 'bg-green-100 text-green-600' : (feedback.canAdvance ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600')}`}>
                {feedback.correct ? <CheckCircle className="w-12 h-12" /> : (feedback.canAdvance ? <Sparkles className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />)}
              </div>

              <div className="space-y-4">
                {feedback.grade !== undefined && (
                  <div className="inline-block px-4 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-lg border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                    Calificación: <span className={feedback.grade >= 6 ? 'text-green-500' : 'text-amber-500'}>{feedback.grade}/10</span>
                  </div>
                )}

                <h4 className={`text-2xl font-bold ${feedback.correct ? 'text-green-700 dark:text-green-400' : (feedback.canAdvance ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400')}`}>
                  {feedback.correct ? "¡Excelente Trabajo!" : (feedback.canAdvance ? "¡Bien hecho, pero puedes mejorar!" : "Revisión necesaria")}
                </h4>

                <div className={`p-4 rounded-xl text-left text-sm ${feedback.correct ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : (feedback.canAdvance ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800')}`}>
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Feedback de tu Tutor IA:
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{feedback.message}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {!feedback.canAdvance ? (
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setStep("idle");
                    }}
                    className="w-full py-4 rounded-xl font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" /> Intentar de nuevo
                  </button>
                ) : (
                  <>
                    {(!feedback.correct && feedback.canAdvance) && (
                      <button
                        onClick={() => {
                          setFeedback(null);
                          setStep("idle");
                        }}
                        className="w-full py-4 rounded-xl font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-5 h-5" /> Corregir para sacar 10
                      </button>
                    )}
                    <button
                      onClick={() => onComplete(true)}
                      className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${feedback.correct ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/30'} flex items-center justify-center gap-2`}
                    >
                      Avanzar Siguiente Reto
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
