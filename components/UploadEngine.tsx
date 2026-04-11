"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, Loader2, Palette, Compass, Brain } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";
import { THEME_LIST, ThemeKey, THEME_COLORS } from "@/lib/themes";
// @ts-expect-error - mammoth browser version lacks official types
import * as mammoth from "mammoth/mammoth.browser";

// Remove Mock Data Generation

interface UploadEngineProps {
    onSuccess?: () => void;
}

export default function UploadEngine({ onSuccess }: UploadEngineProps) {
    const { addWorld, updateWorld, setActiveWorld } = useLearning();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("Analizando Documento...");
    const [loadingSub, setLoadingSub] = useState("Extrayendo contenido pedagógico...");
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState<ThemeKey>('clasico');
    const [selectedColor, setSelectedColor] = useState<string>(THEME_COLORS.clasico); 
    const [vocabularyLevel, setVocabularyLevel] = useState<'facil' | 'medio' | 'alto'>('facil');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.name.endsWith('.docx') || droppedFile.name.endsWith('.doc'))) {
            if (droppedFile.size > 4 * 1024 * 1024) {
                alert("El archivo es demasiado grande (" + (droppedFile.size / 1024 / 1024).toFixed(2) + " MB). El límite máximo es 4 MB. Por favor, comprime tu archivo o sube solo un fragmento.");
                return;
            }
            setFile(droppedFile);
        } else {
            alert("Por favor sube solo archivos PDF o Word (.docx, .doc).");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.size > 4 * 1024 * 1024) {
                alert("El archivo es demasiado grande (" + (selectedFile.size / 1024 / 1024).toFixed(2) + " MB). El límite máximo es 4 MB. Por favor, comprime tu archivo o sube solo un fragmento.");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setLoadingStatus("Analizando Documento...");
        setLoadingSub("Extrayendo contenido pedagógico...");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('vocabularyLevel', vocabularyLevel);

        let rawDocumentText = "";

        try {
            // If Word, try to extract text locally to send as context for the progressive generation later
            if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    rawDocumentText = result.value;
                } catch (e) {
                    console.warn("Could not extract local word text", e);
                }
            }

            const res = await fetch('/api/ai/pdf-generator', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || "Error de servidor desconocido");
            }

            const data = await res.json();

            // Clean up missing fields if any
            const newWorld = {
                id: crypto.randomUUID(),
                theme: selectedTheme,
                title: data.title || `Aventura: ${file.name.replace('.pdf', '')}`,
                color: selectedColor,
                days: data.days,
                pedagogy: data.pedagogy, // Optional, but useful for display
                createdAt: new Date().toISOString()
            };

            // Helper: bake a single day with 1 retry on failure
            const bakeDay = async (day: any): Promise<any | null> => {
                const payload = {
                    day,
                    pedagogy: newWorld.pedagogy,
                    theme: newWorld.theme,
                    documentText: rawDocumentText || (file.name === "examen_demo.pdf" ? "DEMO_MODE" : ""),
                    vocabularyLevel
                };
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        const res = await fetch('/api/ai/generate-day', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (res.ok) {
                            if (attempt === 0) await new Promise(r => setTimeout(r, 4500));
                            return await res.json();
                        }
                        console.warn(`Bake attempt ${attempt + 1} failed for Day ${day.dayNumber}: HTTP ${res.status}`);
                        if (res.status === 429) {
                            console.warn("Rate limit (429) detectado. Pausando 18 segundos...");
                            await new Promise(r => setTimeout(r, 18000));
                        } else {
                            await new Promise(r => setTimeout(r, 5000));
                        }
                    } catch (e) {
                        console.warn(`Bake attempt ${attempt + 1} threw for Day ${day.dayNumber}:`, e);
                        await new Promise(r => setTimeout(r, 5000));
                    }
                }
                return null;
            };

            const totalDays = newWorld.days.length;

            // --- Force Bake Day 1 First ---
            if (totalDays > 0) {
                setLoadingStatus(`Construyendo sesión 1 de ${totalDays}...`);
                setLoadingSub("Escribiendo la historia inicial con IA...");
                const bakedStory = await bakeDay(newWorld.days[0]);
                if (bakedStory) {
                    newWorld.days[0] = {
                        ...newWorld.days[0],
                        narrative: bakedStory.narrative,
                        content: bakedStory.content,
                        presentationType: bakedStory.presentationType || "text",
                        glosario: bakedStory.glosario || [],
                        isGenerating: false
                    };
                }
            }

            const savedSuccessfully = await addWorld(newWorld);
            if (!savedSuccessfully) {
                throw new Error("No se pudo guardar la estructura inicial del mapa en la base de datos. Por favor reintenta.");
            }
            setActiveWorld(newWorld.id);

            // ✅ SUCCESS — Show immediately after Day 1 is ready
            setIsUploading(false);
            setUploadSuccess(true);
            if (onSuccess) onSuccess();

            // 🔥 Background Generation — build remaining days without blocking UI
            // Uses direct API call instead of updateWorld() to avoid triggering React re-renders
            if (totalDays > 1) {
                (async () => {
                    for (let i = 1; i < totalDays; i++) {
                        const skeletonDay = newWorld.days[i];
                        console.log(`[Background] Baking Day ${skeletonDay.dayNumber}/${totalDays}...`);

                        const bakedStory = await bakeDay(skeletonDay);

                        if (bakedStory) {
                            const completedDay = {
                                ...skeletonDay,
                                narrative: bakedStory.narrative,
                                content: bakedStory.content,
                                presentationType: bakedStory.presentationType || "text",
                                glosario: bakedStory.glosario || [],
                                isGenerating: false
                            };
                            newWorld.days[i] = completedDay;
                        } else {
                            console.error(`[Background] Day ${skeletonDay.dayNumber} failed after retries. Applying fallback.`);
                            newWorld.days[i] = {
                                ...skeletonDay,
                                narrative: "(Generando contenido con IA...)\n\n[ERROR DE CONEXIÓN] La inteligencia artificial experimentó problemas de recarga. Por favor, reintenta generar esta sesión manualmente en el Constructor Visual.",
                                content: {
                                    explanation: { chunks: ["Sin detalles técnicos generados."], analogy: "El aprendizaje tiene pausas." },
                                    practiceProblem: { statement: "Problema no disponible. Revisa el manual del docente.", correctValue: "N/A", hint: "Pide ayuda al maestro." }
                                },
                                isGenerating: false
                            };
                        }

                        // Silent DB update for both success and fallback
                        try {
                            await fetch(`/api/worlds/${newWorld.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newWorld)
                            });
                            console.log(`[Background] Day ${skeletonDay.dayNumber} DB sync done ✓`);
                        } catch (e) {
                            console.warn(`[Background] DB update for Day ${skeletonDay.dayNumber} failed:`, e);
                        }
                    }
                    console.log(`[Background] All ${totalDays} sessions generated ✓`);
                })();
            }

        } catch (error) {
            console.error(error);
            alert(`Hubo un error al crear la estructura inicial: ${error instanceof Error ? error.message : String(error)}`);
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-6">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#522566] dark:text-slate-100">Centro de Creación de Mundos</h2>
                <p className="text-[#AD74C3] mt-2">Sube un examen (PDF o Word) y la IA generará una aventura interactiva.</p>
            </div>

            <div
                className={`
            relative group border-4 border-dashed rounded-3xl p-12 transition-all cursor-pointer
            flex flex-col items-center justify-center min-h-[400px]
            ${isDragging ? 'border-[#7A3A8E] bg-[#F8EDFB] dark:bg-[#522566]' : 'border-[#EADFF0] dark:border-[#7A3A8E] hover:border-[#AD74C3] hover:bg-[#F8EDFB] dark:hover:bg-[#522566]'}
            ${uploadSuccess ? 'border-green-500 bg-green-50' : ''}
        `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploadSuccess && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {/* State: Success */}
                {uploadSuccess ? (
                    <div className="text-center animate-bounce-slow">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-bold text-green-700">¡Aventura Generada!</h3>
                        <p className="text-green-600 mt-2">El documento ha sido transformado en niveles interactivos.</p>
                        <div className="mt-8 flex gap-4 justify-center">
                            <button
                                onClick={() => { setFile(null); setUploadSuccess(false); }}
                                className="px-6 py-2 bg-white text-green-700 border border-green-200 rounded-full font-bold hover:bg-green-50 transition"
                            >
                                Subir otro
                            </button>
                        </div>
                    </div>
                ) : (
                    // State: Uploading or Idle
                    <>
                        {isUploading ? (
                            <div className="text-center space-y-6">
                                <div className="relative w-24 h-24 mx-auto">
                                    <div className="absolute inset-0 border-4 border-[#EADFF0] rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-sky-600 rounded-full animate-spin"></div>
                                    <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-[#522566] animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-sky-900">{loadingStatus}</h3>
                                    <p className="text-[#522566] text-sm mt-1">{loadingSub}</p>
                                </div>
                            </div>
                        ) : (
                            // State: Idle / File Selected
                            <div className="text-center space-y-4">
                                <div className={`
                            w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110
                            ${file ? 'bg-[#EADFF0] text-[#522566]' : 'bg-[#EADFF0] text-[#AD74C3]'}
                        `}>
                                    {file ? <FileText className="w-10 h-10" /> : <UploadCloud className="w-10 h-10" />}
                                </div>

                                <div className="w-full max-w-[90%] mx-auto text-center overflow-hidden">
                                     {file ? (
                                         <div className="flex flex-col items-center gap-6 w-full mt-4">
                                            <div className="text-center">
                                                <h3 className="text-base font-bold text-[#522566] break-all leading-snug" title={file.name}>{file.name}</h3>
                                                <p className="text-[#AD74C3] text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                            
                                            {!isUploading && !uploadSuccess && (
                                                <div className="w-full max-w-lg space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-[#EADFF0]" onClick={e => e.stopPropagation()}>
                                                    {/* Tema Visual */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <Compass className="w-4 h-4 text-[#7A3A8E]" />
                                                            <label className="text-xs font-black text-[#AD74C3] uppercase tracking-widest">Tema Visual del Juego</label>
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-2">
                                                            {THEME_LIST.map(t => (
                                                                <button
                                                                    key={t.key}
                                                                    type="button"
                                                                    onClick={() => { setSelectedTheme(t.key); setSelectedColor(THEME_COLORS[t.key]); }}
                                                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${selectedTheme === t.key 
                                                                        ? 'bg-[#F8EDFB] border-[#7A3A8E] scale-105' 
                                                                        : 'bg-white border-[#EADFF0] hover:border-[#EADFF0] hover:bg-[#F8EDFB]'}`}
                                                                    title={t.label}
                                                                >
                                                                    <span className="text-xl group-hover:scale-125 transition-transform">{t.emoji}</span>
                                                                    <span className="text-[8px] font-black uppercase mt-1 text-[#AD74C3]">{t.key}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Dificultad */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <Brain className="w-4 h-4 text-[#7A3A8E]" />
                                                            <label className="text-xs font-black text-[#AD74C3] uppercase tracking-widest">Dificultad Sugerida</label>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            {[
                                                                { key: "facil", label: "Fácil (Básico)" },
                                                                { key: "medio", label: "Medio" },
                                                                { key: "alto", label: "Alto" }
                                                            ].map(level => (
                                                                <button
                                                                    key={level.key}
                                                                    type="button"
                                                                    onClick={() => setVocabularyLevel(level.key as "facil" | "medio" | "alto")}
                                                                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${vocabularyLevel === level.key 
                                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md' 
                                                                        : 'bg-white border-[#EADFF0] text-[#AD74C3] hover:border-[#EADFF0]'}`}
                                                                >
                                                                    {level.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {!isUploading && !uploadSuccess && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                                    className="bg-[#522566] hover:bg-[#522566] text-white px-8 py-4 w-full max-w-lg rounded-2xl font-bold text-base shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 border-2 border-[#AD74C3]/20"
                                                >
                                                    <UploadCloud className="w-5 h-5" />
                                                    Generar con IA
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-xl font-bold text-[#7A3A8E]">Arrastra tu planeación (PDF o Word) aquí</h3>
                                            <p className="text-[#AD74C3] text-sm mt-2">AprendIA transformará el contenido en una aventura interactiva.</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Demo helper for testing without files */}
            {!file && !isUploading && !uploadSuccess && (
                <div className="mt-12 text-center">
                    <button
                        onClick={() => {
                            setFile(new File(["dummy"], "examen_demo.pdf", { type: "application/pdf" }));
                        }}
                        className="text-[#AD74C3] hover:text-[#522566] text-sm underline pb-2"
                    >
                        Modo Demo: Simular subida de PDF
                    </button>
                </div>
            )}
        </div>
    );
}
