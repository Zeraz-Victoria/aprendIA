"use client";

import React, { useState } from "react";
import { Sparkles, X, Brain, Target, Compass, Loader2, Layers } from "lucide-react";
import { THEME_LIST, ThemeKey, THEME_COLORS } from "@/lib/themes";
import { useLearning } from "@/contexts/LearningContext";

interface AiProjectGeneratorProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export default function AiProjectGenerator({ onClose, onSuccess }: AiProjectGeneratorProps) {
    const { addWorld, setActiveWorld } = useLearning();
    const [topic, setTopic] = useState("");
    const [problemDescription, setProblemDescription] = useState("");
    const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("clasico");
    const [difficulty, setDifficulty] = useState<"Básico" | "Intermedio" | "Avanzado">("Básico");
    const [metodologia, setMetodologia] = useState<string>("ABP");
    const [diagnostico, setDiagnostico] = useState<string>("");
    const [phase, setPhase] = useState<string>("6");
    const [grade, setGrade] = useState<string>("Secundaria 1");
    const [modality, setModality] = useState<string>("Telesecundaria");
    const [sessionCount, setSessionCount] = useState<number>(3);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("Iniciando IA...");

    const handleGenerate = async () => {
        if (!topic.trim()) return alert("Por favor, ingresa un tema o problemática para el proyecto.");

        setIsGenerating(true);
        setLoadingStatus("Consultando a la IA...");

        try {
            const response = await fetch("/api/ai/generator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    problemDescription,
                    theme: selectedTheme,
                    dificultad: difficulty,
                    metodologia,
                    diagnostico,
                    phase,
                    sessionCount,
                    grade,
                    modality: grade.startsWith("Secundaria") ? modality : null
                })
            });

            if (!response.ok && response.status !== 524) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `Error del servidor (${response.status})`);
            }
            if (response.status === 524) {
                throw new Error("El servidor tardó demasiado en responder (Timeout). Intenta generar menos sesiones o vuelve a intentarlo.");
            }

            const contentType = response.headers.get("content-type") || "";
            let data;

            if (contentType.includes("x-ndjson")) {
                const reader = response.body?.getReader();
                if (!reader) throw new Error("No stream support in browser");
                const decoder = new TextDecoder();
                let buffer = "";
                let finalData = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.error) throw new Error(parsed.error);
                            if (parsed.type === 'progress') {
                                setLoadingStatus(parsed.message);
                            } else if (parsed.type === 'done') {
                                finalData = parsed.data;
                            }
                        } catch (e: any) {
                            if (e.message !== "Unexpected end of JSON input" && !e.message.includes("Unexpected token")) throw e;
                        }
                    }
                }
                if (!finalData) throw new Error("La generación de IA fue interrumpida. Intenta nuevamente.");
                data = finalData;
            } else {
                data = await response.json();
                if (data.error) throw new Error(data.error);
            }

            // Create the world object
            const newWorld = {
                id: crypto.randomUUID(),
                theme: selectedTheme,
                title: data.title || `Aventura: ${topic}`,
                color: THEME_COLORS[selectedTheme],
                days: data.days,
                pedagogy: data.pedagogy,
                createdAt: new Date().toISOString()
            };

            await addWorld(newWorld);
            setActiveWorld(newWorld.id);
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error("AI Generation Error:", error);
            alert(`Hubo un error: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2d1d]/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-violet-700 p-8 flex items-end">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white leading-none">Aventura Express</h2>
                            <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest mt-1 opacity-80">Generación con IA</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                    {isGenerating ? (
                        <div className="py-12 flex flex-col items-center text-center space-y-6">
                            <div className="relative w-20 h-20">
                                <div className="absolute inset-0 border-4 border-[#c1ebd5] rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                                <Brain className="absolute inset-0 m-auto w-10 h-10 text-[#0a2d1d] animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#0a2d1d]">{loadingStatus}</h3>
                                <p className="text-[#2e9f6c] font-medium">Estamos diseñando los nuevos retos...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Input Tema */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-[#165b3d]" />
                                    <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">¿De qué tema o problemática trata el proyecto?</label>
                                </div>
                                <input 
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="Ej. Ecosistemas, Revolución Mexicana, Fracciones..."
                                    className="w-full bg-[#f0fbf5] border border-[#c1ebd5] rounded-2xl px-6 py-4 text-lg font-bold text-[#0a2d1d] focus:ring-4 focus:ring-indigo-100 focus:border-[#2e9f6c] outline-none transition-all placeholder:text-[#2e9f6c]"
                                    autoFocus
                                />
                            </div>

                            {/* Describe la Problemática */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-[#165b3d]" />
                                    <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">Describe la problemática (opcional)</label>
                                </div>
                                <textarea 
                                    value={problemDescription}
                                    onChange={(e) => setProblemDescription(e.target.value)}
                                    placeholder="Ej. Los alumnos muestran poco interés en el cuidado de plantas, mala nutrición, etc..."
                                    className="w-full bg-[#f0fbf5] border border-[#c1ebd5] rounded-2xl px-6 py-3 text-sm font-medium text-[#0a2d1d] focus:ring-4 focus:ring-indigo-100 focus:border-[#2e9f6c] outline-none transition-all placeholder:text-[#2e9f6c] min-h-[70px] resize-none"
                                />
                            </div>

                            {/* Tema Visual */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Compass className="w-4 h-4 text-[#165b3d]" />
                                    <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">Tema Visual del Juego</label>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {THEME_LIST.map(t => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setSelectedTheme(t.key)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${selectedTheme === t.key 
                                                ? 'bg-[#f0fbf5] border-[#165b3d] scale-105' 
                                                : 'bg-white border-[#c1ebd5] hover:border-[#c1ebd5] hover:bg-[#f0fbf5]'}`}
                                            title={t.label}
                                        >
                                            <span className="text-xl group-hover:scale-125 transition-transform">{t.emoji}</span>
                                            <span className="text-[8px] font-black uppercase mt-1 text-[#2e9f6c]">{t.key}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dificultad */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-[#165b3d]" />
                                    <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">Dificultad Sugerida</label>
                                </div>
                                <div className="flex gap-3">
                                    {[
                                        { key: "Básico", label: "Fácil (Básico)", color: "emerald" },
                                        { key: "Intermedio", label: "Medio", color: "amber" },
                                        { key: "Avanzado", label: "Alto", color: "rose" }
                                    ].map(level => (
                                        <button
                                            key={level.key}
                                            type="button"
                                            onClick={() => setDifficulty(level.key as any)}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${difficulty === level.key 
                                                ? `bg-${level.color}-50 border-${level.color}-500 text-${level.color}-700 shadow-md` 
                                                : 'bg-white border-[#c1ebd5] text-[#2e9f6c] hover:border-[#c1ebd5]'}`}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Metodología NEM */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-[#165b3d]" />
                                    <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">Metodología Oficial (Doctoral)</label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: "ABP", label: "ABP (Problemas)" },
                                        { key: "STEAM", label: "STEAM" },
                                        { key: "Proyectos Comunitarios", label: "Comunitarios" },
                                        { key: "Aprendizaje Servicio", label: "Ap. Servicio" }
                                    ].map(met => (
                                        <button
                                            key={met.key}
                                            type="button"
                                            onClick={() => setMetodologia(met.key)}
                                            className={`p-2 rounded-xl text-xs font-bold transition-all border-2 ${metodologia === met.key
                                                ? 'bg-[#f0fbf5] border-[#165b3d] text-sky-700'
                                                : 'bg-white border-[#c1ebd5] text-[#2e9f6c] hover:border-[#c1ebd5]'}`}
                                        >
                                            {met.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={diagnostico}
                                    onChange={(e) => setDiagnostico(e.target.value)}
                                    placeholder="Problemática del aula (ej. Alimentación, bullying...)"
                                    className="w-full bg-[#f0fbf5] border border-[#c1ebd5] rounded-xl px-4 py-2 text-sm font-medium text-[#165b3d] focus:ring-2 focus:ring-sky-100 focus:border-[#2e9f6c] outline-none transition-all placeholder:text-[#2e9f6c]"
                                />
                            </div>

                            {/* Grado Escolar */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Compass className="w-4 h-4 text-[#165b3d]" />
                                    <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">Grado Escolar</label>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Primaria 1", "Primaria 2", "Primaria 3", "Primaria 4", "Primaria 5", "Primaria 6", "Secundaria 1", "Secundaria 2", "Secundaria 3"].map(g => {
                                        const label = g.startsWith("Primaria") ? `${g.replace("Primaria ", "")}º Primaria` : `${g.replace("Secundaria ", "")}º Secundaria`;
                                        return (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => {
                                                    setGrade(g);
                                                    // Map phase automatically
                                                    if (g === "Primaria 1" || g === "Primaria 2") setPhase("3");
                                                    else if (g === "Primaria 3" || g === "Primaria 4") setPhase("4");
                                                    else if (g === "Primaria 5" || g === "Primaria 6") setPhase("5");
                                                    else setPhase("6");
                                                }}
                                                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border-2 ${grade === g
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                                                    : 'bg-white border-[#c1ebd5] text-[#2e9f6c] hover:border-[#c1ebd5]'}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Modalidad (solo para Secundaria) */}
                            {grade.startsWith("Secundaria") && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-[#165b3d]" />
                                        <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">Modalidad de Secundaria</label>
                                    </div>
                                    <div className="flex gap-3">
                                        {[
                                            { key: "General", label: "Secundaria General" },
                                            { key: "Telesecundaria", label: "Telesecundaria" }
                                        ].map(m => (
                                            <button
                                                key={m.key}
                                                type="button"
                                                onClick={() => setModality(m.key)}
                                                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${modality === m.key
                                                    ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-sm'
                                                    : 'bg-white border-[#c1ebd5] text-[#2e9f6c] hover:border-[#c1ebd5]'}`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Número de Sesiones */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-[#165b3d]" />
                                        <label className="text-xs font-black text-[#2e9f6c] uppercase tracking-widest">Número de Sesiones (Niveles)</label>
                                    </div>
                                    <span className="text-sm font-black text-[#0a2d1d] bg-[#f0fbf5] px-2 py-0.5 rounded-lg border border-[#c1ebd5]">{sessionCount}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="20" 
                                    value={sessionCount}
                                    onChange={(e) => setSessionCount(Number(e.target.value))}
                                    className="w-full accent-indigo-600 custom-range"
                                />
                                <div className="flex justify-between text-[10px] text-[#2e9f6c] font-bold px-1 mt-1">
                                    <span>Básico (1-5)</span>
                                    <span>Medio (6-12)</span>
                                    <span>Completo (13-20)</span>
                                </div>
                                <style dangerouslySetInnerHTML={{__html: `
                                    .custom-range {
                                        -webkit-appearance: none;
                                        height: 8px;
                                        background: #e2e8f0;
                                        border-radius: 4px;
                                        outline: none;
                                    }
                                    .custom-range::-webkit-slider-thumb {
                                        -webkit-appearance: none;
                                        width: 20px;
                                        height: 20px;
                                        border-radius: 50%;
                                        background: #4f46e5;
                                        cursor: pointer;
                                        border: 2px solid white;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    }
                                    .custom-scrollbar::-webkit-scrollbar {
                                        width: 6px;
                                    }
                                    .custom-scrollbar::-webkit-scrollbar-track {
                                        background: transparent;
                                    }
                                    .custom-scrollbar::-webkit-scrollbar-thumb {
                                        background: #c1ebd5;
                                        border-radius: 10px;
                                    }
                                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                        background: #2e9f6c;
                                    }
                                `}} />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={onClose}
                                    className="flex-1 py-4 px-6 rounded-2xl font-black text-[#2e9f6c] hover:bg-[#c1ebd5] transition-colors uppercase tracking-widest text-xs"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleGenerate}
                                    className="flex-[2] py-4 px-6 bg-[#0a2d1d] hover:bg-[#0a2d1d] text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generar Aventura ✨
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
