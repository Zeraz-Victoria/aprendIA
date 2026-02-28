"use client";

import React, { useState } from "react";
import { UploadCloud, Image as ImageIcon, CheckCircle2, Loader2, UserCheck, X } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";

export default function BulkEvidenceUploader({ onClose }: { onClose: () => void }) {
    const { students, worlds } = useLearning();
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [selectedWorldId, setSelectedWorldId] = useState<string>("");
    const [selectedLevelId, setSelectedLevelId] = useState<string>("");
    const [processedResults, setProcessedResults] = useState<{ file: string, studentId: string | null, studentName: string | null, calificacion: number, isCorrect?: boolean, feedback?: string }[]>([]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleProcess = async () => {
        if (!selectedWorldId || !selectedLevelId) {
            alert("Por favor selecciona un mapa y un nivel antes de evaluar.");
            return;
        }

        setIsProcessing(true);
        setProcessingProgress(0);
        const results = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Convert file to Base64
                const base64: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });

                // Llama al nuevo endpoint de bulk-evaluate
                const response = await fetch('/api/teacher/bulk-evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageBase64: base64,
                        mimeType: file.type,
                        worldId: selectedWorldId,
                        levelId: selectedLevelId,
                        fileName: file.name
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("API Error", errorText);
                    alert(`Error evaluando ${file.name}: ${errorText}`);
                    continue;
                }

                const data = await response.json();
                results.push({
                    file: file.name,
                    studentId: data.studentId, // ID or null si no se reconoció
                    studentName: data.alumno || data.nombreEncontradoEnImagen || "Ilegible",
                    calificacion: data.calificacion || 0,
                    isCorrect: data.puedeAvanzar,
                    feedback: data.feedback
                });

                setProcessingProgress(i + 1);
            }

            setProcessedResults(results);

        } catch (error) {
            console.error("Failed to process images:", error);
            alert("Hubo un error procesando las imágenes con IA.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <UploadCloud className="text-indigo-600" /> Carga Masiva de Evidencias
            </h2>
            <p className="text-slate-500 mb-8">
                Sube fotos de las libretas o exámenes. La IA las clasificará y asignará el puntaje a cada alumno.
            </p>

            {!processedResults.length ? (
                <div className="space-y-6">
                    <div className="flex gap-4 mb-4">
                        <select
                            value={selectedWorldId}
                            onChange={(e) => { setSelectedWorldId(e.target.value); setSelectedLevelId(""); }}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                        >
                            <option value="">Selecciona un Mapa / Nivel</option>
                            {worlds.map(w => (
                                <option key={w.id} value={w.id}>🗺️ {w.title || w.theme}</option>
                            ))}
                        </select>
                        <select
                            value={selectedLevelId}
                            onChange={(e) => setSelectedLevelId(e.target.value)}
                            disabled={!selectedWorldId}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50"
                        >
                            <option value="">Selecciona la Actividad</option>
                            {selectedWorldId && worlds.find(w => w.id === selectedWorldId)?.days.map(d => (
                                <option key={d.dayNumber} value={d.dayNumber.toString()}> Nivel {d.dayNumber}: {d.title || 'Actividad'}</option>
                            ))}
                        </select>
                    </div>

                    <div className="border-4 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:bg-slate-50 transition cursor-pointer relative">
                        <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
                        <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="font-bold text-slate-600">Arrastra las fotos aquí</p>
                        <p className="text-sm text-slate-400">o haz clic para explorar</p>
                    </div>

                    {files.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="font-bold text-slate-700 mb-2">{files.length} Archivos seleccionados:</p>
                            <ul className="text-sm text-slate-500 space-y-1 max-h-32 overflow-y-auto">
                                {files.map((f, i) => <li key={i}>• {f.name}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">
                            Cancelar
                        </button>
                        <button
                            onClick={handleProcess}
                            disabled={files.length === 0 || isProcessing || !selectedWorldId || !selectedLevelId}
                            className={`px-6 py-2 rounded-xl font-bold font-bold shadow-lg flex items-center gap-2 transition-all ${isProcessing ? 'bg-indigo-300 text-indigo-800' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                            {isProcessing ? `Evaluando ${processingProgress} de ${files.length} libretas...` : "Iniciar Evaluación Mágica"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle2 className="text-green-600 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-green-800">¡Procesamiento Completado!</h3>
                            <p className="text-green-700 text-sm">Se han analizado {processedResults.length} evidencias.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 max-h-[400px] overflow-y-auto">
                        {processedResults.map((res, i) => (
                            <div key={i} className={`flex items-start justify-between p-4 bg-white border rounded-xl shadow-sm ${res.studentId ? 'border-green-200' : 'border-red-200'}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${res.studentId ? (res.calificacion >= 8 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700') : 'bg-red-100 text-red-600'}`}>
                                        {res.studentId ? res.calificacion : 'X'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{res.file}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {res.studentId ? (
                                                <div className="bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <UserCheck className="w-3 h-3 text-indigo-600" />
                                                    <span className="text-xs font-bold text-indigo-700">
                                                        {res.studentName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="bg-red-50 text-red-600 px-2 py-0.5 rounded flex items-center gap-1 text-xs font-bold">
                                                    <X className="w-3 h-3" /> OCR falló: {res.studentName}
                                                </div>
                                            )}
                                        </div>
                                        {res.feedback && (
                                            <p className="text-sm text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg italic border border-slate-100">
                                                "{res.feedback}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 ml-4 justify-start">
                                    {res.isCorrect !== undefined && res.studentId && (
                                        <div className={`text-xs px-2 py-1 rounded font-bold ${res.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                            {res.isCorrect ? "Avanza" : "Repasa"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button onClick={onClose} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">
                            Finalizar y Guardar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
