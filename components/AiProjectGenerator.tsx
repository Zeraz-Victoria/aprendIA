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
    const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("clasico");
    const [difficulty, setDifficulty] = useState<"Básico" | "Intermedio" | "Avanzado">("Básico");
    const [metodologia, setMetodologia] = useState<string>("ABP");
    const [diagnostico, setDiagnostico] = useState<string>("");
    const [phase, setPhase] = useState<string>("3");
    const [sessionCount, setSessionCount] = useState<number>(3);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("Iniciando IA...");

    const handleGenerate = async () => {
        if (!topic.trim()) return alert("Por favor, ingresa un tema matemático.");

        setIsGenerating(true);
        setLoadingStatus("Consultando a la IA...");

        try {
            const response = await fetch("/api/ai/generator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    theme: selectedTheme,
                    dificultad: difficulty,
                    metodologia,
                    diagnostico,
                    phase,
                    sessionCount
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Error al generar el mundo");
            }

            const data = await response.json();

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
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
                <div className="p-8 space-y-8">
                    {isGenerating ? (
                        <div className="py-12 flex flex-col items-center text-center space-y-6">
                            <div className="relative w-20 h-20">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                                <Brain className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{loadingStatus}</h3>
                                <p className="text-slate-500 font-medium">Estamos diseñando los nuevos retos...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Input Tema */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-indigo-500" />
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">¿De qué tema matemático trata?</label>
                                </div>
                                <input 
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="Ej. Fracciones, Ecuaciones Lineales..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-300"
                                    autoFocus
                                />
                            </div>

                            {/* Tema Visual */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Compass className="w-4 h-4 text-indigo-500" />
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tema Visual del Juego</label>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {THEME_LIST.map(t => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setSelectedTheme(t.key)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${selectedTheme === t.key 
                                                ? 'bg-indigo-50 border-indigo-500 scale-105' 
                                                : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
                                            title={t.label}
                                        >
                                            <span className="text-xl group-hover:scale-125 transition-transform">{t.emoji}</span>
                                            <span className="text-[8px] font-black uppercase mt-1 text-slate-400">{t.key}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dificultad */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-indigo-500" />
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Dificultad Sugerida</label>
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
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Metodología NEM */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-500" />
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Metodología Oficial (Doctoral)</label>
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
                                                ? 'bg-sky-50 border-sky-500 text-sky-700'
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Fase NEM */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Compass className="w-4 h-4 text-indigo-500" />
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Fase NEM</label>
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                    {["1", "2", "3", "4", "5", "6"].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPhase(p)}
                                            className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${phase === p
                                                ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-md'
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            Fase {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Número de Sesiones */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-indigo-500" />
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Número de Sesiones (Niveles)</label>
                                    </div>
                                    <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{sessionCount}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="25" 
                                    value={sessionCount}
                                    onChange={(e) => setSessionCount(Number(e.target.value))}
                                    className="w-full accent-indigo-600 custom-range"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
                                    <span>Rápido (1-5)</span>
                                    <span>Equilibrio (6-14)</span>
                                    <span>Doctoral (15-25)</span>
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
                                `}} />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={onClose}
                                    className="flex-1 py-4 px-6 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest text-xs"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleGenerate}
                                    className="flex-[2] py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
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
