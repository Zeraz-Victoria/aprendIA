"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle, Clock, ArrowLeft, Image as ImageIcon, Check, X, Upload } from "lucide-react";
import Link from 'next/link';

export default function PendingEvidencePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    const [pendingList, setPendingList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && status === "unauthenticated") {
            router.push("/");
        }
    }, [mounted, status, router]);

    const fetchPending = async () => {
        const userId = (session?.user as any)?.id // Explicit any casting for next-auth payload
        if (!userId) return;
        try {
            const res = await fetch(`/api/evidence/pending?teacherId=${userId}`);
            const data = await res.json();
            if (res.ok) {
                setPendingList(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === "authenticated") fetchPending();
    }, [status]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedEntry || !imagePreview) return;
        setIsUploading(true);
        try {
            const res = await fetch('/api/evidence/upload', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entryId: selectedEntry.id,
                    imageUrl: imagePreview // Saving inline base64 to DB for this demo/MVP
                })
            });
            if (res.ok) {
                setPendingList(prev => prev.filter(e => e.id !== selectedEntry.id));
                setSelectedEntry(null);
                setImagePreview(null);
            } else {
                alert("Error al guardar en base de datos. Intenta de nuevo.");
            }
        } catch (e) {
            console.error(e);
            alert('Fallo de red al subir evidencia');
        } finally {
            setIsUploading(false);
        }
    };

    if (!mounted || status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Clock className="w-12 h-12 text-slate-300 animate-spin mb-4" />
                <p className="font-bold text-slate-500">Cargando expediente...</p>
            </div>
        );
    }

    if (status === "unauthenticated" || (session?.user as any)?.role !== 'TEACHER') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-500 font-bold">Acceso Denegado</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Link href="/teacher" className="p-2 hover:bg-indigo-700 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-xl leading-tight">Cámara Docente</h1>
                        <p className="text-indigo-200 text-sm">Evidencias Pendientes ({pendingList.length})</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-4 max-w-2xl mx-auto space-y-4">
                {pendingList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <h3 className="font-bold text-2xl text-slate-700">¡Todo al día!</h3>
                        <p className="text-slate-500">No hay estudiantes esperando que subas evidencias físicas.</p>
                    </div>
                ) : (
                    pendingList.map(entry => (
                        <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="text-4xl bg-slate-100 w-14 h-14 rounded-full flex items-center justify-center shrink-0">
                                    {entry.student?.avatar || "👤"}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg">{entry.student?.name || "Alumno"}</h4>
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Mundo: {entry.world?.title} (Nivel {entry.levelId})
                                    </p>
                                    <p className="text-xs text-indigo-500 mt-1 font-medium bg-indigo-50 inline-block px-2 py-0.5 rounded">
                                        Físico Requerido
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedEntry(entry)}
                                className="bg-indigo-100 text-indigo-700 p-4 rounded-xl hover:bg-indigo-200 transition-colors shrink-0 flex flex-col items-center justify-center gap-1"
                            >
                                <Camera className="w-6 h-6" />
                                <span className="text-[10px] font-bold uppercase">Fotografiar</span>
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Upload Modal (Fullscreen mobile) */}
            {selectedEntry && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in-up">
                    <div className="p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
                        <div>
                            <p className="text-sm opacity-80">Evidencia de</p>
                            <h2 className="font-bold text-xl">{selectedEntry.student?.name}</h2>
                        </div>
                        <button onClick={() => { setSelectedEntry(null); setImagePreview(null); }} className="p-2 bg-slate-800 rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-6 mt-16">
                        {!imagePreview ? (
                            <div className="w-full max-w-sm aspect-[3/4] border-4 border-dashed border-slate-600 rounded-3xl flex flex-col items-center justify-center bg-slate-900 gap-6">
                                <ImageIcon className="w-16 h-16 text-slate-500" />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-8 py-4 bg-indigo-600 rounded-full text-white font-bold text-lg flex items-center gap-3 shadow-lg shadow-indigo-500/30"
                                >
                                    <Camera className="w-6 h-6" /> Abrir Cámara
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment" // Forces mobile camera
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>
                        ) : (
                            <div className="w-full max-w-sm aspect-[3/4] relative rounded-3xl overflow-hidden bg-slate-900 border-2 border-indigo-500">
                                <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />

                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => setImagePreview(null)}
                                        className="p-3 bg-slate-800 text-white rounded-full shadow-lg"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                        className="p-3 bg-emerald-600 text-white rounded-full shadow-lg disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isUploading ? <Clock className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {imagePreview && !isUploading && (
                            <p className="text-white mt-6 font-medium text-center bg-slate-800 px-6 py-3 rounded-full">
                                ¿Se ve bien el procedimiento de {selectedEntry.student?.name}?
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
