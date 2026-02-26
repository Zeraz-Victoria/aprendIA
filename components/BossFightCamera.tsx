"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, Upload, CheckCircle, AlertCircle, X, Maximize2, ImageIcon, Sparkles, PenTool } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BossDayContent } from "@/types/learning-world";

function fixImageUrl(src: string): string {
    if (src.includes("pollinations.ai")) {
        let prompt = "";
        if (src.includes("/prompt/")) {
            prompt = decodeURIComponent(src.split("/prompt/")[1]?.split("?")[0] || "");
        }
        if (prompt) {
            return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=400&nologo=true`;
        }
    }
    return src;
}

function BossImage({ src, alt }: { src?: string; alt?: string }) {
    const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
    const fixedSrc = src ? fixImageUrl(src) : "";
    return status === "error" || !fixedSrc ? (
        <div className="w-full rounded-xl bg-slate-700/50 border border-dashed border-slate-600 p-4 text-center my-3">
            <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-xs italic">{alt || "Ilustración"}</p>
        </div>
    ) : (
        <div className="my-3 relative">
            {status === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50 rounded-xl animate-pulse">
                    <Sparkles className="w-6 h-6 text-red-400 animate-spin" />
                </div>
            )}
            <img
                src={fixedSrc}
                alt={alt || "Ilustración"}
                className="w-full rounded-xl border border-slate-600"
                loading="lazy"
                onLoad={() => setStatus("loaded")}
                onError={() => setStatus("error")}
            />
        </div>
    );
}

const bossMarkdownComponents: any = {
    img: ({ src, alt }: { src?: string; alt?: string }) => (
        <BossImage src={src} alt={alt} />
    ),
};

interface BossFightCameraProps {
    data: BossDayContent;
    studentName?: string;
    studentId?: string;
    worldId?: string;
    levelId?: number;
    onComplete: (success: boolean) => void;
    onClose: () => void;
}

type Step = "idle" | "camera" | "preview" | "analyzing" | "feedback" | "text_input";

export default function BossFightCamera({ data, studentName = "Aventurero", studentId, worldId, levelId, onComplete, onClose }: BossFightCameraProps) {
    // The AI generator nests originalProblemText inside data.content, but the type has it at top-level.
    // Support both paths for robustness.
    const problemText = data.originalProblemText || (data as any).content?.originalProblemText || "";
    const requiredEvidenceType = data.tipo_evidencia_requerida || "CUALQUIERA";

    const [step, setStep] = useState<Step>("idle");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [textEvidence, setTextEvidence] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [feedback, setFeedback] = useState<{ correct: boolean; hints: string[]; grade: number } | null>(null);

    // Teacher Override State
    const [showTeacherAuth, setShowTeacherAuth] = useState(false);
    const [teacherPassword, setTeacherPassword] = useState("");

    const handleTeacherOverride = () => {
        if (teacherPassword === "1234") {
            setFeedback({
                correct: true,
                grade: 10,
                hints: ["¡Aprobado por el Docente!", "¡Felicidades por superar este desafío con la ayuda de tu maestro!"]
            });
            setStep("feedback");
            // onComplete deferred to the 'Misión Cumplida' button
            setShowTeacherAuth(false);
            setTeacherPassword("");
        } else {
            alert("Contraseña incorrecta");
        }
    };

    // Simulated Camera Stream (using file input for web compat, but UI mimics camera)
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
        if (!imagePreview && !textEvidence) return;
        setStep("analyzing");

        try {
            const payload: any = { context: problemText };
            if (data.narrative) payload.narrative = data.narrative;
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

            if (!response.ok) throw new Error("API failed");

            const resultData = await response.json();

            // Compute a 0-10 grade from the confidence score
            const rawGrade = resultData.isCorrect
                ? Math.round(resultData.confidenceScore * 10 * 10) / 10  // e.g. 0.85 → 8.5
                : Math.round(resultData.confidenceScore * 4 * 10) / 10;  // max 4.0 if wrong

            setFeedback({
                correct: resultData.isCorrect,
                grade: Math.min(10, rawGrade),
                hints: [
                    resultData.extractedText,
                    resultData.emotionDetected ? `Emoción detectada: ${resultData.emotionDetected}` : "Análisis completado."
                ]
            });

            setStep("feedback");
            // NOTE: Do NOT call onComplete here — it unmounts the component before feedback shows.
            // onComplete is called when the user clicks the 'Misión Cumplida' button.

        } catch (error) {
            console.error("AI Analysis error:", error);
            // Fallback
            setFeedback({
                correct: false,
                grade: 0,
                hints: ["Hubo un error al conectar con la IA.", "Por favor intenta enviar la foto nuevamente."]
            });
            setStep("feedback");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 z-50 backdrop-blur-md">

            {/* Boss Header */}
            <div className="w-full max-w-lg bg-red-950/50 border-b border-red-500/30 p-4 flex justify-between items-center rounded-t-3xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-500/20">
                        <Maximize2 className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-red-100 font-bold text-lg uppercase tracking-wider">Jefe Final</h2>
                        <p className="text-red-300 text-xs">{data.title}</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => setShowTeacherAuth(!showTeacherAuth)} className="text-red-300 hover:text-white bg-red-900/50 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                        👁️ Docente
                    </button>
                    <button onClick={onClose} className="rounded-full p-2 bg-slate-800 text-slate-400 hover:text-white">
                        <X />
                    </button>
                </div>
            </div>

            {showTeacherAuth && (
                <div className="w-full max-w-lg bg-slate-800 p-4 text-white flex gap-3 items-center justify-center border-x border-slate-700 animate-fade-in-up">
                    <span className="text-sm font-bold text-slate-300">Contraseña Docente:</span>
                    <input
                        type="password"
                        className="text-black px-3 py-1.5 rounded-lg text-sm w-32 outline-none focus:ring-2 focus:ring-red-500"
                        value={teacherPassword}
                        onChange={e => setTeacherPassword(e.target.value)}
                        placeholder="****"
                        onKeyDown={e => e.key === 'Enter' && handleTeacherOverride()}
                    />
                    <button type="button" onClick={handleTeacherOverride} className="bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">
                        Aprobar Jefe
                    </button>
                </div>
            )}

            <div className={`w-full max-w-lg bg-slate-900 border-x border-b border-slate-700 rounded-b-3xl overflow-hidden flex flex-col ${showTeacherAuth ? 'max-h-[75vh]' : 'max-h-[85vh]'}`}>

                {/* Problem Statement Area */}
                {step !== 'camera' && step !== 'preview' && (
                    <div className="p-6 bg-slate-800 border-b border-slate-700 max-h-[45vh] overflow-y-auto">
                        <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={bossMarkdownComponents}>
                                {problemText.replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName)}
                            </ReactMarkdown>
                        </div>
                        {data.originalProblemImage && (
                            <div className="mt-4 rounded-lg overflow-hidden border border-slate-600">
                                <img src={data.originalProblemImage} alt="Problema Original" className="w-full h-auto object-contain" />
                            </div>
                        )}
                        <div className="mt-4 bg-red-900/30 p-4 rounded-xl border border-red-500/30">
                            <p className="whitespace-pre-wrap font-bold text-red-100">
                                ⚔️ Tu Misión:
                            </p>
                            <p className="whitespace-pre-wrap text-red-200 mt-1">
                                Para derrotar a este jefe, lee cuidadosamente el problema. Luego, escribe tu respuesta final y tu procedimiento en la caja de texto, o resuélvelo en tu libreta y escanea tu evidencia.
                            </p>
                        </div>
                    </div>
                )}

                {/* Interaction Area */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[300px]">

                    {step === 'idle' && (
                        <div className="w-full text-center space-y-6">
                            <h3 className="text-white font-bold text-lg">
                                {requiredEvidenceType === "TEXTO_ENSAYO" ? "¿Cómo redactarás tu ensayo?" :
                                    (requiredEvidenceType === "FOTO_DIBUJO" || requiredEvidenceType === "FOTO_GRAFICA") ? "Toma o sube una foto de tu trabajo" : "¿Cómo derrotarás al Jefe?"}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(requiredEvidenceType !== "TEXTO_ENSAYO") && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center justify-center p-6 bg-slate-800 rounded-3xl border-4 border-dashed border-red-500/50 hover:bg-slate-700 hover:border-red-400 transition-colors group"
                                    >
                                        <Camera className="w-12 h-12 text-red-400 group-hover:text-red-300 mb-2" />
                                        <span className="text-white font-bold text-sm">Escanear Libreta</span>
                                    </button>
                                )}

                                {(requiredEvidenceType !== "FOTO_DIBUJO" && requiredEvidenceType !== "FOTO_GRAFICA") && (
                                    <button
                                        onClick={() => setStep('text_input')}
                                        className="flex flex-col items-center justify-center p-6 bg-slate-800 rounded-3xl border-4 border-dashed border-amber-500/50 hover:bg-slate-700 hover:border-amber-400 transition-colors group"
                                    >
                                        <PenTool className="w-12 h-12 text-amber-500 group-hover:text-amber-400 mb-2 transition-colors" />
                                        <span className="text-white font-bold text-sm">Escribir Respuesta</span>
                                    </button>
                                )}
                            </div>

                            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                        </div>
                    )}

                    {step === "text_input" && (
                        <div className="w-full flex md:flex-col flex-col gap-4">
                            <h4 className="text-white font-bold">Escribe tu respuesta final:</h4>
                            <textarea
                                className="w-full p-4 rounded-xl border border-slate-600 bg-slate-800 text-white focus:border-red-500 outline-none resize-none h-32"
                                placeholder="Ejemplo: La respuesta es 45 metros cuadrados..."
                                value={textEvidence}
                                onChange={e => setTextEvidence(e.target.value)}
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setStep("idle")} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold">Atrás</button>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!textEvidence.trim()}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50"
                                >
                                    Atacar
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && imagePreview && (
                        <div className="w-full h-full flex flex-col">
                            <div className="relative flex-1 rounded-xl overflow-hidden border border-slate-600 bg-black">
                                <img src={imagePreview} alt="Solution" className="w-full h-full object-contain" />
                                {/* Overlay Lines similar to document scanner */}
                                <div className="absolute inset-0 border-2 border-red-500/30 pointer-events-none"></div>
                                <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm bg-black/40 py-1">
                                    ¿Se ve claro el procedimiento?
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => { setStep('idle'); setImagePreview(null); }} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold">
                                    Repetir
                                </button>
                                <button onClick={handleAnalyze} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-900/50">
                                    Enviar a la IA
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <div className="space-y-6 text-center">
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 border-t-4 border-red-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-2 border-b-4 border-indigo-500 rounded-full animate-spin-reverse"></div>
                            </div>
                            <h3 className="text-xl text-white font-bold animate-pulse">Analizando Lógica...</h3>
                            <div className="space-y-1 text-sm text-slate-400">
                                <p>👁️ Identificando números...</p>
                                <p>🧮 Verificando fórmulas...</p>
                                <p>📏 Comprobando pasos...</p>
                            </div>
                        </div>
                    )}

                    {step === 'feedback' && feedback && (
                        <div className="w-full space-y-5 overflow-y-auto max-h-[60vh] pr-1">
                            {/* Victory / Defeat Header */}
                            {feedback.correct ? (
                                <div className="text-center space-y-3">
                                    <div className="text-6xl animate-bounce">🏆</div>
                                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500">
                                        ¡JEFE DERROTADO!
                                    </h3>
                                    <p className="text-slate-300 text-sm">
                                        ¡Felicidades, <strong className="text-white">{studentName}</strong>! Has demostrado dominio total del tema.
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <div className={`p-1 rounded-full w-20 h-20 mx-auto flex items-center justify-center bg-amber-500/20 text-amber-500`}>
                                        <AlertCircle className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-bold text-amber-400">El Jefe Resiste...</h3>
                                    <p className="text-slate-400 text-sm">No te rindas, revisa tu respuesta e intenta de nuevo.</p>
                                </div>
                            )}

                            {/* Grade Display */}
                            <div className={`mx-auto w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${feedback.grade >= 8 ? 'border-green-500 bg-green-500/10' :
                                feedback.grade >= 6 ? 'border-yellow-500 bg-yellow-500/10' :
                                    'border-red-500 bg-red-500/10'
                                }`}>
                                <span className={`text-3xl font-black ${feedback.grade >= 8 ? 'text-green-400' :
                                    feedback.grade >= 6 ? 'text-yellow-400' :
                                        'text-red-400'
                                    }`}>{feedback.grade}</span>
                                <span className="text-xs text-slate-400 font-bold">/10</span>
                            </div>

                            {/* AI Feedback */}
                            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                                <h4 className="text-slate-300 text-xs uppercase font-bold text-center mb-3">🤖 Retroalimentación de la IA</h4>
                                <ul className="space-y-3">
                                    {feedback.hints.map((hint, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-200 leading-relaxed">
                                            <span className="text-indigo-400 flex-shrink-0">•</span>
                                            <span>{hint.replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Raid Boss Teaser (only on victory) */}
                            {feedback.correct && (
                                <div className="bg-gradient-to-r from-red-950/80 to-purple-950/80 rounded-xl p-4 border border-red-500/30 text-center space-y-2">
                                    <p className="text-red-300 text-xs font-bold uppercase tracking-widest">🐉 Nuevo Desafío Desbloqueado</p>
                                    <p className="text-white font-bold text-lg">¡Súper Jefe Maestro!</p>
                                    <p className="text-slate-300 text-xs leading-relaxed">
                                        Ahora puedes unir fuerzas con tus compañeros para atacar al <strong className="text-red-400">Raid Boss</strong> del salón. ¡Juntos son imparables!
                                    </p>
                                </div>
                            )}

                            {/* Action Button */}
                            <button onClick={() => {
                                if (feedback.correct) onComplete(true);
                                onClose();
                            }} className={`w-full py-4 font-bold rounded-xl transition-colors ${feedback.correct
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/50'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}>
                                {feedback.correct ? "🎉 ¡Misión Cumplida! — Continuar" : "Corregir y Reintentar"}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
