"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight, School, Users, Map, BookOpen, X, ChevronRight } from "lucide-react";

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    classroomsCount: number;
    studentsCount: number;
    worldsCount: number;
    onGoToClassroom: () => void;
    onGoToAdventures: () => void;
    onAddStudent: () => void;
    onCreateClassroom: () => void;
    onCreateWorld: () => void;
}

export default function OnboardingWizard({
    isOpen,
    onClose,
    classroomsCount,
    studentsCount,
    worldsCount,
    onGoToClassroom,
    onGoToAdventures,
    onAddStudent,
    onCreateClassroom,
    onCreateWorld,
}: OnboardingWizardProps) {
    if (!isOpen) return null;

    const step1Done = classroomsCount > 0;
    const step2Done = studentsCount > 0;
    const step3Done = worldsCount > 0;

    const completedSteps = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
    const progressPercent = Math.round((completedSteps / 3) * 100);

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl border border-[#c1ebd5] overflow-hidden relative animate-in zoom-in-95 duration-200">
                {/* Header with gradient */}
                <div className="p-6 bg-gradient-to-r from-[#0a2d1d] via-[#165b3d] to-[#2e9f6c] text-white relative">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Cerrar guía"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
                            🚀
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#c1ebd5]">
                                Guía Rápida de Inicio
                            </span>
                            <h3 className="text-xl font-black text-white leading-tight">
                                ¡Bienvenido a AprendIA!
                            </h3>
                        </div>
                    </div>

                    <p className="text-xs text-[#c1ebd5] mt-2 leading-relaxed">
                        Completa estos 3 sencillos pasos para tener tu aula virtual lista y comenzar la aventura con tus alumnos:
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#c1ebd5] rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-black text-[#c1ebd5] shrink-0">
                            {progressPercent}% listo
                        </span>
                    </div>
                </div>

                {/* Steps List */}
                <div className="p-6 space-y-3 bg-[#f0fbf5]/40">
                    {/* Step 1: Create Classroom */}
                    <div
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            step1Done 
                                ? 'bg-white border-emerald-300 shadow-sm' 
                                : 'bg-white border-[#c1ebd5] hover:border-[#2e9f6c]'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                                step1Done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#c1ebd5]/50 text-[#165b3d]'
                            }`}>
                                {step1Done ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <School className="w-5 h-5 text-[#2e9f6c]" />}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-[#0a2d1d] truncate">
                                        1. Crea tu Salón de Clases
                                    </h4>
                                    {step1Done && (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                            ¡Listo!
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                    {step1Done ? `Tienes ${classroomsCount} grupo(s) configurado(s).` : 'Crea tu grupo escolar (ej. "5° A", "Secundaria 1°").'}
                                </p>
                            </div>
                        </div>

                        {!step1Done ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onCreateClassroom();
                                }}
                                className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#0a2d1d] hover:bg-[#165b3d] rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                            >
                                Crear <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onGoToClassroom();
                                }}
                                className="text-xs font-bold text-[#2e9f6c] hover:underline shrink-0 cursor-pointer"
                            >
                                Ver
                            </button>
                        )}
                    </div>

                    {/* Step 2: Add Students */}
                    <div
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            step2Done 
                                ? 'bg-white border-emerald-300 shadow-sm' 
                                : 'bg-white border-[#c1ebd5] hover:border-[#2e9f6c]'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                                step2Done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#c1ebd5]/50 text-[#165b3d]'
                            }`}>
                                {step2Done ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Users className="w-5 h-5 text-[#2e9f6c]" />}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-[#0a2d1d] truncate">
                                        2. Registra a tus Alumnos
                                    </h4>
                                    {step2Done && (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                            ¡Listo!
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                    {step2Done ? `${studentsCount} alumno(s) registrados.` : 'Agrega a tus estudiantes para generar sus códigos secretos.'}
                                </p>
                            </div>
                        </div>

                        {!step2Done ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onAddStudent();
                                }}
                                className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#0a2d1d] hover:bg-[#165b3d] rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                            >
                                Agregar <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onGoToClassroom();
                                }}
                                className="text-xs font-bold text-[#2e9f6c] hover:underline shrink-0 cursor-pointer"
                            >
                                Gestionar
                            </button>
                        )}
                    </div>

                    {/* Step 3: Generate AI Adventure / Project */}
                    <div
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            step3Done 
                                ? 'bg-white border-emerald-300 shadow-sm' 
                                : 'bg-white border-[#c1ebd5] hover:border-[#2e9f6c]'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                                step3Done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#c1ebd5]/50 text-[#165b3d]'
                            }`}>
                                {step3Done ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Sparkles className="w-5 h-5 text-[#2e9f6c]" />}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-[#0a2d1d] truncate">
                                        3. Genera tu Proyecto con IA
                                    </h4>
                                    {step3Done && (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                            ¡Listo!
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                    {step3Done ? `${worldsCount} proyecto(s) didáctico(s) creados.` : 'Crea un mapa gamificado basado en los libros de la SEP.'}
                                </p>
                            </div>
                        </div>

                        {!step3Done ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onCreateWorld();
                                }}
                                className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#2e9f6c] to-[#165b3d] hover:opacity-95 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-[#c1ebd5]" /> Generar
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onGoToAdventures();
                                }}
                                className="text-xs font-bold text-[#2e9f6c] hover:underline shrink-0 cursor-pointer"
                            >
                                Ver
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 bg-white border-t border-[#c1ebd5]/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                        {completedSteps === 3 ? "🎉 ¡Todo listo para dar clases!" : "Puedes volver a abrir esta guía desde tu menú de cuenta."}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#165b3d] bg-[#c1ebd5]/40 hover:bg-[#c1ebd5] rounded-xl transition-colors cursor-pointer"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
