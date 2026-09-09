"use client";

import React, { useState } from 'react';
import {
    GraduationCap, Loader2, BookOpen, Zap, BrainCircuit,
    School, ListOrdered, MessageSquareText, AlertTriangle,
    X, Sparkles, Command, ChevronRight, Settings2, User, ArrowLeft, Download, CheckCircle, Palette, Play
} from 'lucide-react';
import { FASES_NEM, METODOLOGIAS, GRADOS_FLAT } from './eduplan/constants';
import { Methodology, LessonPlan } from './eduplan/types';
import LessonPlanPreview from './eduplan/components/LessonPlanPreview';
import { useLearning } from '@/contexts/LearningContext';
import { THEME_LIST, ThemeKey } from '@/lib/themes';

interface UnifiedWorldCreatorProps {
    onClose: () => void;
    onWorldCreated?: () => void;
}

const WORLD_THEMES: { key: ThemeKey; label: string; icon: string; bg: string }[] = [
    { key: 'clasico', label: 'Clásico Escolar', icon: '🏫', bg: 'bg-sky-500' },
    { key: 'fuego', label: 'Infierno de Fuego', icon: '🔥', bg: 'bg-orange-600' },
    { key: 'hielo', label: 'Tundra de Hielo', icon: '🧊', bg: 'bg-cyan-600' },
    { key: 'selva', label: 'Selva Mística', icon: '🌿', bg: 'bg-emerald-600' },
    { key: 'neon', label: 'Ciudad Neón', icon: '⚡', bg: 'bg-pink-600' }
];

export default function UnifiedWorldCreator({ onClose, onWorldCreated }: UnifiedWorldCreatorProps) {
    const { addWorld, setActiveWorld } = useLearning();

    // Wizard Step: 1 = Formulario Didáctico, 2 = Planeación y Descarga, 3 = Creación de Mundo
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1: Formulario Didáctico
    const [nombreDocente, setNombreDocente] = useState('');
    const [nombreEscuela, setNombreEscuela] = useState('');
    const [cct, setCct] = useState('');
    const [zonaEscolar, setZonaEscolar] = useState('');
    const [grado, setGrado] = useState('1° Secundaria');
    const [faseId, setFaseId] = useState('Fase 6');
    const [metodologia, setMetodologia] = useState<Methodology>(METODOLOGIAS[0]);
    const [numSesiones, setNumSesiones] = useState(5);
    const [contexto, setContexto] = useState('');

    // State after Plan Generation
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);

    // Step 2 -> 3: World Config
    const [worldTitle, setWorldTitle] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<ThemeKey>('clasico');

    // Step 3: World Generation
    const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
    const [worldLoadingText, setWorldLoadingText] = useState('Construyendo mapa de la aventura...');
    const [worldError, setWorldError] = useState<string | null>(null);

    const handleGradoChange = (nuevoGrado: string) => {
        setGrado(nuevoGrado);
        const infoGrado = GRADOS_FLAT.find(g => g.grado === nuevoGrado);
        if (infoGrado) setFaseId(infoGrado.faseId);
    };

    // Generar la Planeación NEM (Paso 1 -> Paso 2)
    const handleGeneratePlan = async () => {
        if (!nombreDocente.trim() || !nombreEscuela.trim()) {
            setPlanError("DATO FALTANTE: El nombre del docente y de la escuela son obligatorios.");
            return;
        }

        setIsGeneratingPlan(true);
        setPlanError(null);

        try {
            const res = await fetch('/api/ai/eduplan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombreDocente,
                    nombreEscuela,
                    cct,
                    zonaEscolar,
                    fase: faseId,
                    grado,
                    metodologia,
                    contextoAdicional: contexto,
                    numSesiones
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Ocurrió un error al generar la planeación didáctica.');
            }

            setLessonPlan(data.plan);
            setWorldTitle(data.plan?.encabezado?.proyecto || `Aventura Didáctica de ${grado}`);
            setStep(2);
        } catch (err: any) {
            setPlanError(err.message || 'Error al conectar con la IA de EduPlan.');
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    // Generar el Mundo Virtual desde la Planeación (Paso 2 -> Paso 3)
    const handleGenerateWorldFromPlan = async () => {
        if (!lessonPlan) return;

        setStep(3);
        setIsGeneratingWorld(true);
        setWorldError(null);
        setWorldLoadingText("Transformando sesiones didácticas en niveles gamificados...");

        try {
            // Unificar las sesiones de la planeación para enviar como contexto a la IA de Mundos
            const sesiones = lessonPlan.secuencia_didactica.flatMap(f => f.sesiones || []);
            const primerSesion = sesiones[0];

            const payload = {
                theme: selectedTheme,
                topic: worldTitle || lessonPlan.encabezado.proyecto,
                difficulty: grado,
                session_title: primerSesion?.titulo || worldTitle,
                session_start: primerSesion?.inicio?.join(" ") || "Inicio de la aventura pedagógica",
                session_development: primerSesion?.desarrollo?.join(" ") || "Desarrollo de las actividades",
                session_end: primerSesion?.cierre?.join(" ") || "Evaluación y cierre metacognitivo"
            };

            setWorldLoadingText("Indexando libros de texto y retos interactivos...");

            const res = await fetch('/api/ai/generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al generar el mundo virtual.');
            }

            const newWorld = {
                id: data.id || crypto.randomUUID(),
                title: worldTitle || `Aventura de ${grado}`,
                theme: selectedTheme,
                days: data.days || [],
                createdAt: new Date().toISOString()
            };

            addWorld(newWorld);
            setActiveWorld(newWorld.id);

            if (onWorldCreated) onWorldCreated();
            onClose();
        } catch (err: any) {
            setWorldError(err.message || 'Error inesperado al crear el mundo virtual.');
            setIsGeneratingWorld(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                
                {/* Header Wizard Navigation */}
                <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl text-white shadow-lg">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-display font-extrabold text-lg text-white">Creador Unificado de Mundos NEM</h2>
                            <p className="text-[11px] font-medium text-slate-400">Paso {step} de 3 — {step === 1 ? 'Planeación Didáctica' : step === 2 ? 'Vista Previa y Exportación' : 'Generación de Mundo Virtual'}</p>
                        </div>
                    </div>

                    {/* Progress Steps Indicators */}
                    <div className="hidden sm:flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1. Planeación NEM</div>
                        <span className="text-slate-600">→</span>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2. Descarga PDF/Word</div>
                        <span className="text-slate-600">→</span>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3. Mundo Virtual</div>
                    </div>

                    <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">

                    {/* STEP 1: Formulario Didáctico EduPlan AI */}
                    {step === 1 && (
                        <div className="space-y-8 max-w-3xl mx-auto">
                            <div className="text-center space-y-2">
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-4 py-1.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                                    Paso 1: Parámetros Didácticos NEM
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900">
                                    Genera la Planeación base para tu Mundo
                                </h3>
                                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                                    Captura tu contexto educativo. Gemini AI indexará tus Libros de Telesecundaria y Contenidos/PDA oficiales para construir el plano didáctico.
                                </p>
                            </div>

                            {planError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <span>{planError}</span>
                                </div>
                            )}

                            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Docente responsable *</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre Completo"
                                            value={nombreDocente}
                                            onChange={e => setNombreDocente(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Institución Educativa *</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre de la Escuela"
                                            value={nombreEscuela}
                                            onChange={e => setNombreEscuela(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">CCT</label>
                                        <input type="text" placeholder="Ej. 30DTV" value={cct} onChange={e => setCct(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Zona</label>
                                        <input type="text" placeholder="Ej. 51" value={zonaEscolar} onChange={e => setZonaEscolar(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Grado *</label>
                                        <select value={grado} onChange={e => handleGradoChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer">
                                            {FASES_NEM.map(f => (
                                                <optgroup key={f.id} label={f.nombre}>
                                                    {f.grados.map(g => <option key={g} value={g}>{g}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Sesiones</label>
                                        <input type="number" min={1} max={15} value={numSesiones} onChange={e => setNumSesiones(parseInt(e.target.value) || 1)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Metodología Sugerida NEM</label>
                                    <select value={metodologia} onChange={e => setMetodologia(e.target.value as Methodology)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-indigo-700 outline-none cursor-pointer">
                                        {METODOLOGIAS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Diagnóstico Local / Problemática a abordar</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Ej: Los alumnos desperdician el agua en la comunidad y no separan la basura. Se requiere concientizar sobre el desarrollo sustentable."
                                        value={contexto}
                                        onChange={e => setContexto(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <button
                                    onClick={handleGeneratePlan}
                                    disabled={isGeneratingPlan}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isGeneratingPlan ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Generando Planeación Didáctica NEM con Gemini AI...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            <span>Generar Planeación Didáctica y Ver Vista Previa</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Vista Previa, Descarga de Planeación y Configuración del Mundo */}
                    {step === 2 && lessonPlan && (
                        <div className="space-y-8">
                            <div className="bg-gradient-to-r from-indigo-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2 text-center md:text-left">
                                    <span className="bg-white/10 text-indigo-300 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                        Paso 2: Planeación Completa Lista
                                    </span>
                                    <h3 className="text-2xl font-display font-black text-white">{lessonPlan.encabezado.proyecto}</h3>
                                    <p className="text-xs text-slate-300">Puedes descargar de inmediato tu planeación en Word o PDF, o continuar a la generación de tu Mundo Virtual.</p>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                                    <button
                                        onClick={handleGenerateWorldFromPlan}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 text-sm hover:scale-105"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        <span>🎮 Generar Mundo Virtual Ahora</span>
                                    </button>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-3.5 rounded-2xl transition-all flex items-center gap-1.5"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Editar Datos
                                    </button>
                                </div>
                            </div>

                            {/* Selector de Tema visual para el Mundo Virtual */}
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <Palette className="w-4 h-4 text-purple-600" /> Elige la Temática de tu Mundo Virtual
                                    </h4>
                                    <span className="text-xs text-slate-500 font-medium">Tema seleccionado: <strong>{WORLD_THEMES.find(t => t.key === selectedTheme)?.label}</strong></span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    {WORLD_THEMES.map(t => (
                                        <button
                                            key={t.key}
                                            onClick={() => setSelectedTheme(t.key)}
                                            className={`p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-2 ${selectedTheme === t.key ? 'bg-white border-purple-600 shadow-md scale-105' : 'bg-white/60 border-slate-200 hover:bg-white'}`}
                                        >
                                            <span className="text-2xl">{t.icon}</span>
                                            <span className="text-xs font-bold text-slate-800">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Render de la Vista Previa y Botones de Descarga PDF/Word */}
                            <div className="bg-slate-100 rounded-3xl p-4 sm:p-6 border border-slate-200">
                                <LessonPlanPreview plan={lessonPlan} />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Generación del Mundo Virtual (Pantalla de Carga Animada) */}
                    {step === 3 && (
                        <div className="py-16 text-center space-y-8 max-w-xl mx-auto">
                            <div className="relative inline-block">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-2xl mx-auto animate-bounce">
                                    <Sparkles className="w-12 h-12" />
                                </div>
                                <Loader2 className="w-32 h-32 text-indigo-500 animate-spin absolute -top-4 -left-4 opacity-40 pointer-events-none" />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-2xl font-display font-black text-slate-900">Construyendo tu Mundo Virtual...</h3>
                                <p className="text-sm font-medium text-slate-500 animate-pulse">{worldLoadingText}</p>
                            </div>

                            {worldError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm space-y-3">
                                    <p>⚠️ {worldError}</p>
                                    <button onClick={() => setStep(2)} className="bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-xs">
                                        Volver a la Planeación
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
