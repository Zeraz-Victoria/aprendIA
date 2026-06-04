"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ClassStoryFeed from "@/components/ClassStoryFeed";
import { 
    Star, TrendingUp, Users, MessageSquare, CheckCircle2, 
    AlertTriangle, Sparkles, Search, RefreshCw, Plus, Trash2, Gem
} from "lucide-react";
import { ActivityRings } from "@/components/PerformanceDashboard";

interface RecentStudent {
    id: string;
    name: string;
    avatar: string;
    code: string;
}

function ParentPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Estado principal
    const [studentCodeInput, setStudentCodeInput] = useState("");
    const [activeChild, setActiveChild] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [recentChildren, setRecentChildren] = useState<RecentStudent[]>([]);
    const [parentTab, setParentTab] = useState<"performance" | "story">("performance");

    // Cargar alumnos recientes de localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem("aprendia_recent_students");
                if (stored) {
                    setRecentChildren(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Error reading localStorage", e);
            }
        }
    }, []);

    // Verificar si hay un código en la URL al montar o cambiar los parámetros de búsqueda
    useEffect(() => {
        const urlCode = searchParams.get("code");
        if (urlCode) {
            handleLookupCode(urlCode);
        }
    }, [searchParams]);

    // Función para buscar un alumno por código
    const handleLookupCode = async (code: string) => {
        if (!code.trim()) return;
        setLoading(true);
        setError("");
        
        try {
            const res = await fetch(`/api/parent/children?code=${code.trim().toUpperCase()}`);
            const data = await res.json();

            if (res.ok && data.id) {
                setActiveChild(data);
                setStudentCodeInput("");
                
                // Actualizar la lista de alumnos consultados recientemente
                const newRecent: RecentStudent = {
                    id: data.id,
                    name: data.name || "Alumno",
                    avatar: data.avatar || "🧑🏻",
                    code: code.trim().toUpperCase()
                };

                setRecentChildren(prev => {
                    const filtered = prev.filter(c => c.id !== newRecent.id);
                    const updated = [newRecent, ...filtered].slice(0, 5); // Guardar máximo 5
                    if (typeof window !== "undefined") {
                        localStorage.setItem("aprendia_recent_students", JSON.stringify(updated));
                    }
                    return updated;
                });
            } else {
                setError(data.error || "No se encontró ningún estudiante con ese código.");
                setActiveChild(null);
            }
        } catch (err) {
            setError("Ocurrió un error al conectar con el servidor.");
            setActiveChild(null);
        } finally {
            setLoading(false);
        }
    };

    // Eliminar un alumno de la lista de recientes
    const handleRemoveRecent = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setRecentChildren(prev => {
            const updated = prev.filter(c => c.id !== id);
            if (typeof window !== "undefined") {
                localStorage.setItem("aprendia_recent_students", JSON.stringify(updated));
            }
            return updated;
        });
    };

    // Cálculos de métricas del estudiante
    const getChildProgressMetrics = (child: any) => {
        if (!child) return { outer: 0, middle: 0, inner: 0, totalLevels: 0, completedLevels: 0, submissions: 0 };
        
        const assigned = child.assignedWorlds || [];
        let totalLevels = 0;
        assigned.forEach((w: any) => {
            totalLevels += w.totalLevels || 8;
        });

        // Completados
        const completedLevels = (child.progress || []).length;
        const outer = totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0;

        // Promedio académico (0-100)
        const middle = child.globalActivityAverage ? Math.round(child.globalActivityAverage * 10) : 0;

        // Entregas (Tasa de responsabilidad)
        const evidenceList = child.evidenceEntries || [];
        const uniqueSubmissions = new Set();
        evidenceList.forEach((e: any) => {
            if (assigned.some((w: any) => w.id === e.worldId)) {
                uniqueSubmissions.add(`${e.worldId}_${e.levelId}`);
            }
        });
        const inner = totalLevels > 0 ? Math.round((uniqueSubmissions.size / totalLevels) * 100) : 0;

        return { 
            outer, 
            middle, 
            inner, 
            totalLevels, 
            completedLevels, 
            submissions: uniqueSubmissions.size 
        };
    };

    const getChildWorldProgressMetrics = (child: any, world: any) => {
        if (!child || !world) return { outer: 0, middle: 0, inner: 0, totalLevels: 0, completedLevels: 0, submissions: 0 };
        
        const totalLevels = world.totalLevels || 8;
        const completedLevels = (child.progress || []).filter((p: any) => p.worldId === world.id).length;
        const outer = totalLevels > 0 ? Math.min(100, Math.round((completedLevels / totalLevels) * 100)) : 0;

        const wGradeObj = (child.projectGrades || []).find((g: any) => g.worldId === world.id);
        const wGrade = wGradeObj ? wGradeObj.grade : 7.0;
        const middle = Math.round(wGrade * 10);

        const evidenceList = child.evidenceEntries || [];
        const uniqueSubmissions = new Set();
        evidenceList.forEach((e: any) => {
            if (e.worldId === world.id) {
                uniqueSubmissions.add(e.levelId);
            }
        });
        const inner = totalLevels > 0 ? Math.min(100, Math.round((uniqueSubmissions.size / totalLevels) * 100)) : 0;

        return { 
            outer, 
            middle, 
            inner, 
            totalLevels, 
            completedLevels, 
            submissions: uniqueSubmissions.size 
        };
    };

    const metrics = getChildProgressMetrics(activeChild);

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#f0f5fb] via-white to-[#eaf2fc] text-[#1c3a60] font-medium pb-20">
            {/* Header del Portal */}
            <header className="bg-white/80 backdrop-blur-md border-b border-[#cbe0f6] p-4 sticky top-0 z-20 shadow-sm transition-all duration-300">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f0f5fb] rounded-2xl flex items-center justify-center text-2xl border border-[#cbe0f6] shadow-sm">👨‍👩‍👧‍👦</div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest text-[#1c3a60] leading-none">Portal Familiar</h1>
                            <p className="text-[9px] text-[#73a4db] font-black uppercase tracking-wider mt-1">Acompañamiento Escolar Inteligente</p>
                        </div>
                    </div>

                    {/* Botón de Salir si hay alumno activo */}
                    {activeChild && (
                        <button
                            onClick={() => {
                                setActiveChild(null);
                                setError("");
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#f0f5fb] text-[#346297] border border-[#cbe0f6] text-xs font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                            <span>Salir</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Vista sin alumno seleccionado (Ingreso de código) */}
            {!activeChild ? (
                <div className="max-w-md mx-auto px-4 pt-16 sm:pt-24 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-xl border border-[#cbe0f6] mb-6 animate-bounce-slow">
                        ✨
                    </div>
                    
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black tracking-tight text-[#1c3a60]">Consulta de Alumnos</h2>
                        <p className="text-xs text-[#73a4db] font-bold mt-2 leading-relaxed">
                            Ingresa el código secreto de tu hijo para visualizar de manera instantánea sus avances académicos, comportamiento y tareas.
                        </p>
                    </div>

                    {/* Formulario */}
                    <div className="bg-white/70 backdrop-blur-md border border-[#cbe0f6] shadow-2xl p-8 rounded-[2.5rem] w-full space-y-6">
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleLookupCode(studentCodeInput);
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-[#346297] block ml-1">
                                    Código del Alumno
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={10}
                                        placeholder="Ej. DA8AXE"
                                        value={studentCodeInput}
                                        onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                                        className="w-full pl-4 pr-12 py-4 bg-white border border-[#cbe0f6] rounded-2xl text-base text-[#1c3a60] font-black placeholder-[#73a4db]/60 focus:outline-none focus:ring-2 focus:ring-[#346297] focus:border-transparent transition-all uppercase text-center tracking-widest shadow-inner"
                                        disabled={loading}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#73a4db]">
                                        <Search className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !studentCodeInput.trim()}
                                className="w-full bg-gradient-to-r from-[#346297] to-[#60A5FA] hover:from-[#254d7d] hover:to-[#3b82f6] text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-[#346297]/25 disabled:opacity-50 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Buscando estudiante...</span>
                                    </>
                                ) : (
                                    <span>Ver Desempeño</span>
                                )}
                            </button>
                        </form>

                        {error && (
                            <div className="flex items-center gap-2.5 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold animate-shake">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Ayuda */}
                    <p className="text-[10px] text-[#73a4db] font-bold text-center mt-6 max-w-xs leading-relaxed">
                        ¿No tienes el código? Pregúntale a tu hijo o a su docente. El código es único de 6 caracteres.
                    </p>


                </div>
            ) : (
                /* Vista del Dashboard del Alumno */
                <div className="max-w-6xl mx-auto px-4 pt-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Columna Izquierda: Perfil, Rendimiento General y Acompañamiento (4 cols) */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Tarjeta de Perfil */}
                            <div className="bg-white/70 backdrop-blur-md border border-[#cbe0f6] shadow-md rounded-[2rem] p-5 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl border border-[#cbe0f6] shadow-sm">
                                        {activeChild.avatar || "🧑🏻"}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black tracking-tight leading-none text-[#1c3a60]">{activeChild.name}</h2>
                                        <p className="text-[10px] text-[#73a4db] font-black uppercase tracking-wider mt-1.5">Código: {activeChild.studentCode || "—"}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-[#f0f5fb]/50 border border-[#cbe0f6] p-2.5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                                        <Star className="w-4 h-4 fill-current text-amber-500" />
                                        <span className="text-[9px] font-black text-amber-600 tracking-tight mt-1">{activeChild.xp || 0} XP</span>
                                    </div>
                                    <div className="bg-[#f0f5fb]/50 border border-[#cbe0f6] p-2.5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                                        <Gem className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-600 tracking-tight mt-1">{activeChild.gems || 0} Gemas</span>
                                    </div>
                                    <div className="bg-[#f0f5fb]/50 border border-[#cbe0f6] p-2.5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                                        <span className="text-base">🔥</span>
                                        <span className="text-[9px] font-black tracking-tight mt-1">{activeChild.streak || 0} Racha</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta de Rendimiento General */}
                            <div className="bg-white/70 backdrop-blur-md border border-[#cbe0f6] shadow-md rounded-[2rem] p-5 flex flex-col items-center gap-6">
                                <div className="shrink-0 bg-[#f0f5fb] border border-[#cbe0f6] p-5 rounded-full shadow-sm">
                                    <ActivityRings 
                                        outer={metrics.outer} 
                                        middle={metrics.middle} 
                                        inner={metrics.inner} 
                                        size={160}
                                        showLabel={true}
                                    />
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-[#f0f5fb]">
                                        <span className="font-black text-[#1c3a60] text-[10px] uppercase tracking-wider">Rendimiento General</span>
                                        <span className="text-[9px] font-bold text-[#73a4db] uppercase tracking-wider">Consolidado</span>
                                    </div>

                                    {/* Avance */}
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#346297] mt-0.5 shrink-0 shadow-[0_0_8px_rgba(52, 98, 151,0.3)]" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center text-[11px] leading-tight">
                                                <span className="font-bold text-slate-600">Avance en Aventuras</span>
                                                <span className="font-black text-[#346297] bg-[#f0f5fb] px-1.5 py-0.5 rounded text-[9px]">{metrics.outer}%</span>
                                            </div>
                                            <p className="text-[9px] text-[#73a4db] mt-0.5 font-medium">Ha completado {metrics.completedLevels} de {metrics.totalLevels} niveles.</p>
                                        </div>
                                    </div>

                                    {/* Promedio */}
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#73a4db] mt-0.5 shrink-0 shadow-[0_0_8px_rgba(115, 164, 219,0.3)]" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center text-[11px] leading-tight">
                                                <span className="font-bold text-slate-600">Promedio Académico</span>
                                                <span className="font-black text-[#4f82be] bg-[#f0f5fb] px-1.5 py-0.5 rounded text-[9px]">{(metrics.middle / 10).toFixed(1)}/10</span>
                                            </div>
                                            <p className="text-[9px] text-[#73a4db] mt-0.5 font-medium">Promedio obtenido en evidencias revisadas.</p>
                                        </div>
                                    </div>

                                    {/* Entrega */}
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#60A5FA] mt-0.5 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.3)]" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center text-[11px] leading-tight">
                                                <span className="font-bold text-slate-600">Tasa de Entrega</span>
                                                <span className="font-black text-[#2563EB] bg-[#f0f5fb] px-1.5 py-0.5 rounded text-[9px]">{metrics.inner}%</span>
                                            </div>
                                            <p className="text-[9px] text-[#73a4db] mt-0.5 font-medium">Evidencias enviadas: {metrics.submissions} de {metrics.totalLevels}.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Plan de Acompañamiento Familiar (Sidebar) */}
                            <div className="p-5 bg-white border border-[#cbe0f6] rounded-[2rem] shadow-sm space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-[#f0f5fb]">
                                    <div className="p-2.5 bg-[#f0f5fb] border border-[#cbe0f6] rounded-2xl text-[#346297] shrink-0">
                                        <Sparkles className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xs text-[#1c3a60] tracking-tight">Plan de Acompañamiento</h3>
                                        <p className="text-[9px] text-[#73a4db] font-bold uppercase tracking-wider">AprendIA Familiar</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Diagnóstico */}
                                    <div className="space-y-1.5">
                                        <h4 className="text-[10px] font-black text-[#346297] uppercase tracking-wider">Diagnóstico de Desempeño</h4>
                                        <div className="p-3 bg-[#f0f5fb]/40 border border-[#cbe0f6]/60 rounded-2xl text-[11px] text-[#1c3a60] leading-relaxed font-semibold">
                                            {metrics.outer < 30 ? (
                                                <p>🚨 <strong>{activeChild.name}</strong> está presentando un retraso significativo en completar sus mundos virtuales. Se recomienda acompañarlo en su espacio de estudio, validar si está atascado en algún ejercicio y motivarlo con palabras de aliento.</p>
                                            ) : metrics.inner < 60 ? (
                                                <p>⚠️ Observamos que <strong>{activeChild.name}</strong> tiene un buen promedio de notas, pero está olvidando enviar sus evidencias a tiempo. Un recordatorio diario antes de dormir le ayudará a mejorar su responsabilidad.</p>
                                            ) : (
                                                <p>🎉 ¡Felicidades! <strong>{activeChild.name}</strong> mantiene un excelente ritmo de estudio y entrega constante. Sigue reconociendo su esfuerzo para mantener esta gran consistencia.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tareas de Apoyo */}
                                    <div className="space-y-1.5">
                                        <h4 className="text-[10px] font-black text-[#346297] uppercase tracking-wider">Tareas y Sugerencias de Apoyo</h4>
                                        <ul className="space-y-2 text-[11px] text-[#1c3a60] font-medium">
                                            {metrics.outer < 30 ? (
                                                <>
                                                    <li className="flex items-start gap-2 bg-rose-50/50 border border-rose-100 p-2 rounded-xl">
                                                        <span className="text-rose-500 font-bold shrink-0">📌</span>
                                                        <span>Establece un horario de 20 minutos diarios libre de distractores para avanzar en el mapa.</span>
                                                    </li>
                                                    <li className="flex items-start gap-2 bg-rose-50/50 border border-rose-100 p-2 rounded-xl">
                                                        <span className="text-rose-500 font-bold shrink-0">📌</span>
                                                        <span>Acompáñalo en la misión actual para identificar si tiene dudas conceptuales.</span>
                                                    </li>
                                                </>
                                            ) : metrics.inner < 60 ? (
                                                <>
                                                    <li className="flex items-start gap-2 bg-amber-50/50 border border-amber-100 p-2 rounded-xl">
                                                        <span className="text-amber-600 font-bold shrink-0">📌</span>
                                                        <span>Implementa una rutina de revisión nocturna de evidencias enviadas.</span>
                                                    </li>
                                                    <li className="flex items-start gap-2 bg-amber-50/50 border border-amber-100 p-2 rounded-xl">
                                                        <span className="text-amber-600 font-bold shrink-0">📌</span>
                                                        <span>Recompensa de manera verbal o simbólica la entrega oportuna de tareas.</span>
                                                    </li>
                                                </>
                                            ) : (
                                                <>
                                                    <li className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl">
                                                        <span className="text-emerald-600 font-bold shrink-0">📌</span>
                                                        <span>Pregúntale qué ha sido lo más interesante que ha aprendido en sus misiones.</span>
                                                    </li>
                                                    <li className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl">
                                                        <span className="text-emerald-600 font-bold shrink-0">📌</span>
                                                        <span>Anímalo a explorar misiones de nivel superior o compartir en el mural.</span>
                                                    </li>
                                                </>
                                            )}
                                            <li className="flex items-start gap-2 bg-[#f0f5fb] border border-[#cbe0f6] p-2 rounded-xl">
                                                <span className="text-[#346297] font-bold shrink-0">💡</span>
                                                <span>Fomenta una mentalidad de crecimiento: celebra la constancia y el esfuerzo diario.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Desempeño por Proyecto y Pestañas (8 cols) */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Desempeño por Proyecto */}
                            <div className="bg-white/70 backdrop-blur-md border border-[#cbe0f6] shadow-md rounded-[2rem] p-5 space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-[#f0f5fb]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" />
                                    <h3 className="text-xs font-black uppercase tracking-wider text-[#1c3a60]">Desempeño Detallado por Proyecto</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(!activeChild.assignedWorlds || activeChild.assignedWorlds.length === 0) ? (
                                        <div className="col-span-full py-6 text-center text-xs text-[#73a4db] font-bold">
                                            El estudiante no tiene proyectos asignados actualmente.
                                        </div>
                                    ) : (
                                        activeChild.assignedWorlds.map((world: any) => {
                                            const wMetrics = getChildWorldProgressMetrics(activeChild, world);
                                            return (
                                                <div key={world.id} className="bg-[#f0f5fb]/30 border border-[#cbe0f6] rounded-2xl p-4 flex items-center gap-4">
                                                    <div className="shrink-0 bg-white border border-[#cbe0f6] p-2.5 rounded-full shadow-sm">
                                                        <ActivityRings 
                                                            outer={wMetrics.outer} 
                                                            middle={wMetrics.middle} 
                                                            inner={wMetrics.inner} 
                                                            size={90}
                                                        />
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-1.5 text-[10px]">
                                                        <div className="border-b border-[#cbe0f6]/60 pb-1">
                                                            <h4 className="font-black text-[11px] text-[#1c3a60] tracking-tight line-clamp-1">{world.title}</h4>
                                                            <span className="text-[8px] uppercase tracking-wider text-[#73a4db] font-black">{world.theme || "General"}</span>
                                                        </div>

                                                        <div className="space-y-0.5">
                                                            <div className="flex justify-between font-medium">
                                                                <span className="text-slate-500">Avance</span>
                                                                <span className="font-black text-[#346297]">{wMetrics.outer}%</span>
                                                            </div>
                                                            <div className="flex justify-between font-medium">
                                                                <span className="text-slate-500">Promedio</span>
                                                                <span className="font-black text-[#4f82be]">{(wMetrics.middle / 10).toFixed(1)}/10</span>
                                                            </div>
                                                            <div className="flex justify-between font-medium">
                                                                <span className="text-slate-500">Entregas</span>
                                                                <span className="font-black text-[#2563EB]">{wMetrics.inner}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Pestañas de Navegación del Alumno */}
                            <div className="bg-white/70 backdrop-blur-md border border-[#cbe0f6] shadow-md rounded-[2rem] p-5 space-y-5">
                                <div className="flex justify-center border-b border-[#cbe0f6] pb-px">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setParentTab("performance")}
                                            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer ${
                                                parentTab === "performance"
                                                    ? "border-[#346297] text-[#346297]"
                                                    : "border-transparent text-[#73a4db] hover:text-[#1c3a60]"
                                            }`}
                                        >
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            Desempeño y Retroalimentación
                                        </button>
                                        <button
                                            onClick={() => setParentTab("story")}
                                            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer ${
                                                parentTab === "story"
                                                    ? "border-[#346297] text-[#346297]"
                                                    : "border-transparent text-[#73a4db] hover:text-[#1c3a60]"
                                            }`}
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                            Mural de la Clase
                                        </button>
                                    </div>
                                </div>

                                {/* Contenido según pestaña activa */}
                                {parentTab === "performance" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* CONDUCTA Y PUNTOS DE ACTITUD */}
                                        <div className="bg-white border border-[#cbe0f6] p-4.5 rounded-2xl space-y-3.5 shadow-sm">
                                            <h4 className="font-black text-xs tracking-tight flex items-center gap-2">
                                                <Star className="w-4 h-4 text-amber-500 fill-current" /> Conducta y Felicitaciones de Clase
                                            </h4>
                                            
                                            {(!activeChild.behaviorLogs || activeChild.behaviorLogs.length === 0) ? (
                                                <p className="text-[10px] text-[#73a4db] font-bold py-6 text-center">Sin observaciones de conducta registradas recientemente.</p>
                                            ) : (
                                                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                                                    {activeChild.behaviorLogs.map((log: any) => {
                                                        const isPos = log.category?.isPositive ?? true;
                                                        return (
                                                            <div key={log.id} className="flex justify-between items-center p-2.5 bg-[#f0f5fb]/50 border border-[#cbe0f6] rounded-xl text-[11px] font-medium">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="text-lg bg-white w-8 h-8 rounded-lg border border-[#cbe0f6] flex items-center justify-center shadow-sm">
                                                                        {log.category?.icon || "⭐"}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-black text-[#1c3a60] leading-tight truncate">{log.category?.name || "Actitud"}</p>
                                                                        {log.note && <p className="text-[9px] text-slate-500 mt-0.5 truncate">{log.note}</p>}
                                                                    </div>
                                                                </div>
                                                                <span className={`font-black uppercase text-[9px] tracking-wider px-2 py-0.5 rounded shrink-0 ${
                                                                    isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                                }`}>
                                                                    {isPos ? `+${log.category?.weight || 1}` : `-${log.category?.weight || 1}`}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* RETROALIMENTACIÓN DE TAREAS Y EVALUACIONES POR PROYECTO */}
                                        <div className="bg-white border border-[#cbe0f6] p-4.5 rounded-2xl space-y-3.5 shadow-sm">
                                            <h4 className="font-black text-xs tracking-tight flex items-center gap-2">
                                                <MessageSquare className="w-4.5 h-4.5 text-[#73a4db]" /> Retroalimentación por Proyecto
                                            </h4>

                                            {(!activeChild.assignedWorlds || activeChild.assignedWorlds.length === 0) ? (
                                                <p className="text-[10px] text-[#73a4db] font-bold py-6 text-center">El estudiante no cuenta con proyectos asignados.</p>
                                            ) : (
                                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                                                    {activeChild.assignedWorlds.map((world: any) => {
                                                        const worldEvidences = (activeChild.evidenceEntries || []).filter(
                                                            (ev: any) => ev.worldId === world.id
                                                        );

                                                        return (
                                                            <div key={world.id} className="space-y-1.5">
                                                                <div className="flex items-center justify-between border-b border-[#f0f5fb] pb-1">
                                                                    <span className="font-black text-[10px] text-[#346297] truncate max-w-[120px]">{world.title}</span>
                                                                    <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded">
                                                                        {worldEvidences.length} {worldEvidences.length === 1 ? 'Act' : 'Acts'}
                                                                    </span>
                                                                </div>

                                                                {worldEvidences.length === 0 ? (
                                                                    <p className="text-[9px] text-slate-400 italic py-1">Sin actividades enviadas todavía.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5">
                                                                        {worldEvidences.map((ev: any) => (
                                                                            <div key={ev.id} className="p-2.5 bg-[#f0f5fb]/40 border border-[#cbe0f6] rounded-xl space-y-1 text-[11px] font-medium">
                                                                                <div className="flex justify-between items-center gap-1">
                                                                                    <span className="font-black text-[#1c3a60] truncate">Nivel {ev.levelId}</span>
                                                                                    {ev.grade !== null ? (
                                                                                        <span className="font-black text-[#346297] bg-white px-1.5 py-0.5 border border-[#cbe0f6] rounded text-[8px]">
                                                                                            Nota: {ev.grade}/10
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[7px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">
                                                                                            Pendiente
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {ev.feedback && (
                                                                                    <p className="text-[9px] leading-relaxed text-slate-600 bg-white/70 p-2 rounded-lg border border-white font-medium">
                                                                                        &ldquo;{ev.feedback}&rdquo;
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Pestaña de Mural de la Clase */
                                    <div className="bg-white p-4.5 rounded-2xl border border-[#cbe0f6] shadow-sm">
                                        <ClassStoryFeed classroomId={activeChild.classroomId || 'global'} isTeacher={false} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function ParentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-[#73a4db] font-bold text-lg">
                Inicializando Portal Familiar...
            </div>
        }>
            <ParentPageContent />
        </Suspense>
    );
}
