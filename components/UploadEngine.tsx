"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";
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
            setFile(droppedFile);
        } else {
            alert("Por favor sube solo archivos PDF o Word (.docx, .doc).");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
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
                theme: data.theme || "detective",
                title: data.title || `Aventura: ${file.name.replace('.pdf', '')}`,
                days: data.days,
                pedagogy: data.pedagogy, // Optional, but useful for display
                createdAt: new Date().toISOString()
            };

            // --- Force Bake Day 1 First ---
            if (newWorld.days.length > 0) {
                setLoadingStatus("Construyendo el Nivel 1...");
                setLoadingSub("Escribiendo la historia inicial con IA...");
                try {
                    const firstDay = newWorld.days[0];
                    const bakeRes = await fetch('/api/ai/generate-day', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            day: firstDay,
                            pedagogy: newWorld.pedagogy,
                            theme: newWorld.theme,
                            documentText: rawDocumentText || (file.name === "examen_demo.pdf" ? "DEMO_MODE" : "")
                        })
                    });

                    if (bakeRes.ok) {
                        const bakedStory = await bakeRes.json();
                        newWorld.days[0] = {
                            ...firstDay,
                            narrative: bakedStory.narrative,
                            content: bakedStory.content,
                            isGenerating: false
                        };
                    }
                } catch (e) {
                    console.error("Failed to bake first day upfront", e);
                }
            }

            await addWorld(newWorld);
            setActiveWorld(newWorld.id);
            setIsUploading(false); // Stop the main spinner immediately!

            // Wait a moment so they see the success message, then close the modal so they can see the map
            setTimeout(() => {
                setUploadSuccess(true);
                if (onSuccess) onSuccess();
            }, 1500);

            // Progressive Generation Background Loop starting from Day 2 (index 1)
            for (let i = 1; i < newWorld.days.length; i++) {
                const skeletonDay = newWorld.days[i];
                try {
                    console.log(`Baking Day ${skeletonDay.dayNumber}...`);
                    const bakeRes = await fetch('/api/ai/generate-day', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            day: skeletonDay,
                            pedagogy: newWorld.pedagogy,
                            theme: newWorld.theme,
                            documentText: rawDocumentText || (file.name === "examen_demo.pdf" ? "DEMO_MODE" : "") // Pass text for context
                        })
                    });

                    if (bakeRes.ok) {
                        const bakedStory = await bakeRes.json();
                        // Update the specific day with the rich narrative
                        const completedDay = {
                            ...skeletonDay,
                            narrative: bakedStory.narrative,
                            content: bakedStory.content,
                            isGenerating: false
                        };

                        // Copy the world, replace the specific day, and save it to Context
                        const updatedDays = [...newWorld.days];
                        updatedDays[i] = completedDay;
                        newWorld.days = updatedDays; // Keep local pointer updated for subsequent loops

                        updateWorld(newWorld);
                    }
                } catch (bakeError) {
                    console.error("Failed to bake day", skeletonDay.dayNumber, bakeError);
                    // Leave it as "generating" or mark it failed, but don't stop the loop
                }
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
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Centro de Creación de Mundos</h2>
                <p className="text-slate-500 mt-2">Sube un examen (PDF o Word) y la IA generará una aventura interactiva para Jimena.</p>
            </div>

            <div
                className={`
            relative group border-4 border-dashed rounded-3xl p-12 transition-all cursor-pointer
            flex flex-col items-center justify-center min-h-[400px]
            ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-slate-800' : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900'}
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
                                    <div className="absolute inset-0 border-4 border-sky-200 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-sky-600 rounded-full animate-spin"></div>
                                    <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-sky-600 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-sky-900">{loadingStatus}</h3>
                                    <p className="text-sky-600 text-sm mt-1">{loadingSub}</p>
                                </div>
                            </div>
                        ) : (
                            // State: Idle / File Selected
                            <div className="text-center space-y-4">
                                <div className={`
                            w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110
                            ${file ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}
                        `}>
                                    {file ? <FileText className="w-10 h-10" /> : <UploadCloud className="w-10 h-10" />}
                                </div>

                                <div>
                                    {file ? (
                                        <>
                                            <h3 className="text-xl font-bold text-slate-800">{file.name}</h3>
                                            <p className="text-slate-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-xl font-bold text-slate-700">Arrastra tu diagrama, PDF o Word aquí</h3>
                                            <p className="text-slate-400 text-sm">o haz clic para explorar archivos</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {file && !isUploading && !uploadSuccess && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-sky-200 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <UploadCloud className="w-5 h-5" />
                        Generar Mapa de Aventura
                    </button>
                </div>
            )}

            {/* Demo helper for testing without files */}
            {!file && !isUploading && !uploadSuccess && (
                <div className="mt-12 text-center">
                    <button
                        onClick={() => {
                            setFile(new File(["dummy"], "examen_demo.pdf", { type: "application/pdf" }));
                        }}
                        className="text-slate-400 hover:text-sky-600 text-sm underline pb-2"
                    >
                        Modo Demo: Simular subida de PDF
                    </button>
                </div>
            )}

        </div>
    );
}
