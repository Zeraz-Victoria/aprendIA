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
    const [processedResults, setProcessedResults] = useState<{ file: string, studentId: string | null, studentName: string | null, confidence: number, topic?: string, isCorrect?: boolean, feedback?: string }[]>([]);

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
                    console.error("API Error", await response.text());
                    continue;
                }

                const data = await response.json();
                results.push({
                    file: file.name,
                    studentId: data.studentId, // ID or null si no se reconoció
                    studentName: data.nombreEncontradoEnImagen,
                    confidence: 0.95,
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
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                            <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <ImageIcon className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">{res.file}</p>
                                        <div className="flex flex-col gap-1 text-xs mt-1">
                                            <div className="flex items-center gap-1 text-green-600">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {(res.confidence * 100).toFixed(0)}% Confianza
                                            </div>
                                            {res.topic && (
                                                <div className="text-slate-500">
                                                    Tema: <span className="font-medium">{res.topic}</span>
                                                </div>
                                            )}
                                            {res.isCorrect !== undefined && (
                                                <div className={res.isCorrect ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                                                    {res.isCorrect ? "✅ Ejercicio Correcto" : "⚠️ Ejercicio a Revisar"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {res.studentId ? (
                                        <div className="bg-slate-50 px-3 py-1 rounded-full flex items-center gap-2">
                                            <UserCheck className="w-4 h-4 text-indigo-500" />
                                            <span className="text-sm font-bold text-slate-600">
                                                {students.find(s => s.id === res.studentId)?.name || 'Alumno asignado'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-bold">
                                            <X className="w-4 h-4" /> Alumno no reconocido ({res.studentName || 'Ilegible'})
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
