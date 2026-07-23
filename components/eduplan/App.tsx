import React, { useState, useEffect } from 'react';
import { FASES_NEM, METODOLOGIAS, GRADOS_FLAT } from './constants';
import { Methodology, LessonPlan } from './types';
import { generateLessonPlanStream } from './services/aiService';
import LessonPlanPreview from './components/LessonPlanPreview';
import {
    GraduationCap, Loader2, BookOpen, Zap, Brain,
    School, ListOrdered, MessageSquareText, AlertTriangle,
    Menu, X, Sparkles, Command, ChevronRight, Settings2, User, ArrowLeft
} from 'lucide-react';

const LOADING_STEPS = [
    "Sintetizando bases pedagógicas...",
    "Analizando grado y fase escolar...",
    "Vinculando PDA y Contenidos...",
    "Diseñando secuencia didáctica...",
    "Generando evaluación formativa...",
    "Finalizando plano didáctico..."
];

interface EduPlanAppProps {
    onBack: () => void;
}

const EduPlanApp: React.FC<EduPlanAppProps> = ({ onBack }) => {
    const [nombreDocente, setNombreDocente] = useState('');
    const [nombreEscuela, setNombreEscuela] = useState('');
    const [cct, setCct] = useState('');
    const [zonaEscolar, setZonaEscolar] = useState('');
    const [grado, setGrado] = useState('1° Secundaria');
    const [faseId, setFaseId] = useState('Fase 6');
    const [metodologia, setMetodologia] = useState<Methodology>(METODOLOGIAS[0]);
    const [numSesiones, setNumSesiones] = useState(10);
    const [contexto, setContexto] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        let interval: any;
        if (loading) {
            interval = setInterval(() => {
                setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleGradoChange = (nuevoGrado: string) => {
        setGrado(nuevoGrado);
        const infoGrado = GRADOS_FLAT.find(g => g.grado === nuevoGrado);
        if (infoGrado) setFaseId(infoGrado.faseId);
    };

    const handleGenerate = async () => {
        if (!nombreDocente || !nombreEscuela) {
            setError("DATO FALTANTE: El nombre del docente y de la escuela son obligatorios.");
            return;
        }
        setLoading(true);
        setError(null);
        setLessonPlan(null);
        setIsSidebarOpen(false);
        try {
            const result = await generateLessonPlanStream(
                { nombreDocente, nombreEscuela, cct, zonaEscolar, fase: faseId, grado, metodologia, contextoAdicional: contexto, numSesiones },
                () => { }
            );
            setLessonPlan(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans relative mesh-gradient">
            {/* Mobile Control Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-morphism z-[60] flex items-center px-4 border-b border-white/20 gap-3">
                <button onClick={onBack} className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200 transition-all">
                    <ArrowLeft size={18} />
                </button>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="bg-brand-600 text-white p-2.5 rounded-xl shadow-lg hover:bg-brand-700 transition-all"
                >
                    {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div className="flex items-center gap-2">
                    <div className="bg-brand-600 p-1.5 rounded-lg text-white"><GraduationCap size={16} /></div>
                    <span className="font-display font-bold text-slate-900">EduPlanAI</span>
                </div>
            </div>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="lg:hidden fixed inset-0 bg-brand-950/20 backdrop-blur-sm z-[50]" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-[55] w-[85%] sm:w-[400px] bg-white lg:bg-white/80 lg:backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-premium transition-transform duration-500 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-8 pb-4 shrink-0">
                    {/* Back to portal button (desktop) */}
                    <button onClick={onBack} className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-brand-600 transition-colors mb-6 group">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Portal
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-gradient-to-br from-brand-500 to-purple-600 p-2.5 rounded-2xl text-white shadow-xl shadow-brand-500/20">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-display font-extrabold text-2xl text-slate-900 leading-none">EduPlanAI</h1>
                            <p className="text-[10px] font-bold text-brand-600/60 uppercase tracking-widest mt-1">NEM Inteligente</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-10">
                    {/* Docente */}
                    <section className="space-y-6">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Command size={14} className="text-brand-500" /> Información Base
                        </h3>
                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block transition-colors group-focus-within:text-brand-600">Docente responsable</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-brand-600 transition-colors" />
                                    <input type="text" placeholder="Nombre Completo" value={nombreDocente} onChange={e => setNombreDocente(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-medium text-slate-700 shadow-sm" />
                                </div>
                            </div>
                            <div className="group">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block group-focus-within:text-brand-600">Institución Educativa</label>
                                <div className="relative">
                                    <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-brand-600 transition-colors" />
                                    <input type="text" placeholder="Nombre de la Escuela" value={nombreEscuela} onChange={e => setNombreEscuela(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-medium text-slate-700 shadow-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block">CCT</label>
                                    <input type="text" placeholder="Clave" value={cct} onChange={e => setCct(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-medium text-slate-700 shadow-sm" />
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block">Zona</label>
                                    <input type="text" placeholder="Número" value={zonaEscolar} onChange={e => setZonaEscolar(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-medium text-slate-700 shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Parámetros Didácticos */}
                    <section className="space-y-6">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Settings2 size={14} className="text-violet-500" /> Parámetros Didácticos
                        </h3>
                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block">Grado Escolar</label>
                                <div className="relative">
                                    <select value={grado} onChange={e => handleGradoChange(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 appearance-none font-bold text-slate-700 cursor-pointer shadow-sm">
                                        {FASES_NEM.map(f => (
                                            <optgroup key={f.id} label={f.nombre}>
                                                {f.grados.map(g => <option key={g} value={g}>{g}</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                                </div>
                            </div>
                            <div className="group">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block">Metodología Sugerida</label>
                                <div className="relative">
                                    <select value={metodologia} onChange={e => setMetodologia(e.target.value as Methodology)}
                                        className="w-full bg-violet-50/30 border border-violet-100 rounded-2xl px-4 py-3.5 text-sm outline-none text-violet-700 font-bold cursor-pointer hover:bg-violet-50 transition-colors shadow-sm">
                                        {METODOLOGIAS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-5 py-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <ListOrdered className="w-4 h-4 text-emerald-600" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Duración Total</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" value={numSesiones} onChange={e => setNumSesiones(parseInt(e.target.value) || 1)}
                                        className="w-12 bg-white border border-emerald-200 rounded-xl px-2 py-1 text-center text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase">Sesiones</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Diagnóstico */}
                    <section className="space-y-6">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <MessageSquareText size={14} className="text-amber-500" /> Diagnóstico Local
                        </h3>
                        <div className="relative">
                            <textarea placeholder="Describe la problemática, intereses o necesidades detectadas en el aula o comunidad..."
                                value={contexto} onChange={e => setContexto(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200/80 rounded-3xl px-6 py-5 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 h-44 resize-none leading-relaxed text-slate-700 font-medium shadow-sm placeholder:text-slate-400" />
                            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-2 py-1 rounded-lg border border-slate-100 text-[9px] font-black text-slate-400">CONTEXTO</div>
                        </div>
                    </section>

                    {error && (
                        <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl">
                            <div className="flex items-center gap-2 text-rose-600 mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Error</span>
                            </div>
                            <p className="text-[11px] text-rose-500 leading-relaxed font-bold">{error}</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-white lg:bg-transparent border-t lg:border-t-0 border-slate-100 shrink-0">
                    <button onClick={handleGenerate} disabled={loading}
                        className="w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:shadow-xl hover:shadow-brand-500/30 hover:scale-[1.02] text-white font-black py-4 rounded-[1.8rem] shadow-lg transition-all active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3 tracking-[0.15em] text-xs">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-white" />}
                        {loading ? 'SINTETIZANDO...' : 'GENERAR LIENZO DIDÁCTICO'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-transparent relative overflow-y-auto custom-scrollbar p-6 lg:p-12 mt-16 lg:mt-0">
                {!lessonPlan && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto animate-in fade-in duration-1000">
                        <div className="relative mb-12 animate-float">
                            <div className="absolute -inset-8 bg-brand-500/5 blur-[100px] rounded-full"></div>
                            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-[3rem] flex items-center justify-center shadow-premium relative z-10 border border-white/50">
                                <BookOpen className="w-14 h-14 sm:w-16 sm:h-16 text-brand-600 opacity-20 absolute rotate-12 -right-2" />
                                <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 text-brand-500" />
                            </div>
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-display font-black text-slate-900 tracking-tight mb-6">El futuro de tu codiseño empieza aquí.</h2>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            Personaliza los parámetros en el panel lateral y deja que nuestra inteligencia pedagógica estructure tu planeación alineada a la Nueva Escuela Mexicana.
                        </p>
                    </div>
                )}
                {loading && (
                    <div className="h-full flex flex-col items-center justify-center p-6 lg:p-20">
                        <div className="relative mb-16">
                            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-slate-100 border-t-brand-600 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-premium border border-slate-50">
                                    <Brain className="w-10 h-10 sm:w-14 sm:h-14 text-brand-600 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900 mb-4 tracking-tight text-center">Arquitectura de Aprendizaje</h3>
                        <div className="bg-white/50 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/60 shadow-sm flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                            <p className="text-brand-700 text-[11px] font-black uppercase tracking-[0.25em]">{LOADING_STEPS[loadingStep]}</p>
                        </div>
                    </div>
                )}
                {lessonPlan && (
                    <div className="max-w-5xl mx-auto pb-20 animate-in slide-in-from-bottom-12 duration-700">
                        <LessonPlanPreview plan={lessonPlan} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default EduPlanApp;
