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
        <main className="min-h-screen bg-gradient-to-br from-[#F8EDFB] via-white to-[#F5E6FA] text-[#522566] font-medium pb-20">
            {/* Header del Portal */}
            <header className="bg-white/80 backdrop-blur-md border-b border-[#EADFF0] p-4 sticky top-0 z-20 shadow-sm transition-all duration-300">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F8EDFB] rounded-2xl flex items-center justify-center text-2xl border border-[#EADFF0] shadow-sm">👨‍👩‍👧‍👦</div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest text-[#522566] leading-none">Portal Familiar</h1>
                            <p className="text-[9px] text-[#AD74C3] font-black uppercase tracking-wider mt-1">Acompañamiento Escolar Inteligente</p>
                        </div>
                    </div>

                    {/* Botón de Salir si hay alumno activo */}
                    {activeChild && (
                        <button
                            onClick={() => {
                                setActiveChild(null);
                                setError("");
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#F8EDFB] text-[#7A3A8E] border border-[#EADFF0] text-xs font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                            <span>Salir</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Vista sin alumno seleccionado (Ingreso de código) */}
            {!activeChild ? (
                <div className="max-w-md mx-auto px-4 pt-16 sm:pt-24 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-xl border border-[#EADFF0] mb-6 animate-bounce-slow">
                        ✨
                    </div>
                    
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black tracking-tight text-[#522566]">Consulta de Alumnos</h2>
                        <p className="text-xs text-[#AD74C3] font-bold mt-2 leading-relaxed">
                            Ingresa el código secreto de tu hijo para visualizar de manera instantánea sus avances académicos, comportamiento y tareas.
                        </p>
                    </div>

                    {/* Formulario */}
                    <div className="bg-white/70 backdrop-blur-md border border-[#EADFF0] shadow-2xl p-8 rounded-[2.5rem] w-full space-y-6">
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleLookupCode(studentCodeInput);
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-[#7A3A8E] block ml-1">
                                    Código del Alumno
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={10}
                                        placeholder="Ej. DA8AXE"
                                        value={studentCodeInput}
                                        onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                                        className="w-full pl-4 pr-12 py-4 bg-white border border-[#EADFF0] rounded-2xl text-base text-[#522566] font-black placeholder-[#AD74C3]/60 focus:outline-none focus:ring-2 focus:ring-[#7A3A8E] focus:border-transparent transition-all uppercase text-center tracking-widest shadow-inner"
                                        disabled={loading}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AD74C3]">
                                        <Search className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !studentCodeInput.trim()}
                                className="w-full bg-gradient-to-r from-[#7A3A8E] to-[#EC4899] hover:from-[#6b2e82] hover:to-[#db2777] text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-[#7A3A8E]/25 disabled:opacity-50 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
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
                    <p className="text-[10px] text-[#AD74C3] font-bold text-center mt-6 max-w-xs leading-relaxed">
                        ¿No tienes el código? Pregúntale a tu hijo o a su docente. El código es único de 6 caracteres.
                    </p>


                </div>
            ) : (
                /* Vista del Dashboard del Alumno */
                <div className="max-w-5xl mx-auto px-4 pt-6 space-y-8 animate-fade-in">
                    
                    {/* Tarjeta de Encabezado y Anillos */}
                    <div className="bg-white/70 backdrop-blur-md border border-[#EADFF0] shadow-xl text-[#522566] rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-10">
                        {/* Anillo de Actividad (Rediseñado - Sin fondo negro) */}
                        <div className="shrink-0 bg-[#F8EDFB] border border-[#EADFF0] p-6 rounded-full shadow-sm">
                            <ActivityRings 
                                outer={metrics.outer} 
                                middle={metrics.middle} 
                                inner={metrics.inner} 
                                size={180}
                                showLabel={true}
                            />
                        </div>

                        {/* Información del alumno y progreso desglosado */}
                        <div className="flex-1 space-y-6 w-full">
                            {/* Datos del estudiante */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFF0] pb-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl border border-[#EADFF0] shadow-sm">
                                        {activeChild.avatar || "🧑🏻"}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight leading-none text-[#522566]">{activeChild.name}</h2>
                                        <p className="text-[10px] text-[#AD74C3] font-black uppercase tracking-wider mt-1.5">Código: {activeChild.studentCode || "—"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="bg-white border border-[#EADFF0] px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                                        <Star className="w-4 h-4 fill-current text-amber-500" />
                                        <span className="text-xs font-black text-amber-600 tracking-tight">{activeChild.xp || 0} XP</span>
                                    </div>
                                    <div className="bg-white border border-[#EADFF0] px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                                        <Gem className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-black text-emerald-600 tracking-tight">{activeChild.gems || 0} Gemas</span>
                                    </div>
                                    <div className="bg-white border border-[#EADFF0] px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                                        <span className="text-xs font-black">🔥 {activeChild.streak || 0} Racha</span>
                                    </div>
                                </div>
                            </div>

                            {/* Desglose de los anillos con colores oficiales */}
                            <div className="space-y-4">
                                {/* Anillo Exterior - Avance de mapas */}
                                <div className="flex items-start gap-3">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#7A3A8E] mt-1 shrink-0 shadow-[0_0_8px_rgba(122,58,142,0.4)]" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-black text-[#522566]">Avance en Aventuras (Púrpura)</span>
                                            <span className="font-black text-[#7A3A8E] bg-[#F8EDFB] px-2 py-0.5 rounded text-[10px]">{metrics.outer}%</span>
                                        </div>
                                        <p className="text-[10px] text-[#AD74C3] mt-0.5 font-semibold">Ha completado {metrics.completedLevels} de {metrics.totalLevels} niveles en sus mapas asignados.</p>
                                    </div>
                                </div>

                                {/* Anillo Medio - Promedio Académico */}
                                <div className="flex items-start gap-3">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#AD74C3] mt-1 shrink-0 shadow-[0_0_8px_rgba(173,116,195,0.4)]" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-black text-[#522566]">Promedio Académico (Lavanda)</span>
                                            <span className="font-black text-[#8F4AA3] bg-[#F8EDFB] px-2 py-0.5 rounded text-[10px]">{(metrics.middle / 10).toFixed(1)} / 10</span>
                                        </div>
                                        <p className="text-[10px] text-[#AD74C3] mt-0.5 font-semibold">Calificación promedio obtenida en sus evidencias revisadas.</p>
                                    </div>
                                </div>

                                {/* Anillo Interior - Responsabilidad */}
                                <div className="flex items-start gap-3">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#EC4899] mt-1 shrink-0 shadow-[0_0_8px_rgba(236,72,153,0.4)]" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-black text-[#522566]">Responsabilidad / Tasa de Entrega (Rosa)</span>
                                            <span className="font-black text-[#EC4899] bg-[#F8EDFB] px-2 py-0.5 rounded text-[10px]">{metrics.inner}%</span>
                                        </div>
                                        <p className="text-[10px] text-[#AD74C3] mt-0.5 font-semibold">Ha enviado evidencias de {metrics.submissions} de {metrics.totalLevels} actividades asignadas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Plan de Acompañamiento Familiar AprendIA */}
                    <div className="p-6 bg-white border border-[#EADFF0] rounded-[2rem] shadow-sm space-y-4">
                        <div className="flex items-start gap-4 pb-4 border-b border-[#F8EDFB]">
                            <div className="p-3 bg-[#F8EDFB] border border-[#EADFF0] rounded-2xl text-[#7A3A8E] shrink-0">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-base text-[#522566]">Plan de Acompañamiento Familiar AprendIA</h3>
                                <p className="text-[11px] text-[#AD74C3] font-bold uppercase tracking-wider">Recomendaciones personalizadas para tutores</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {/* Diagnóstico del Estudiante */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-black text-[#7A3A8E] uppercase tracking-wider">Diagnóstico de Desempeño</h4>
                                <div className="p-4 bg-[#F8EDFB]/40 border border-[#EADFF0]/60 rounded-2xl text-xs text-[#522566] leading-relaxed font-semibold">
                                    {metrics.outer < 30 ? (
                                        <p>🚨 <strong>{activeChild.name}</strong> está presentando un retraso significativo en completar sus mundos virtuales. Se recomienda acompañarlo en su espacio de estudio, validar si está atascado en algún ejercicio y motivarlo con palabras de aliento.</p>
                                    ) : metrics.inner < 60 ? (
                                        <p>⚠️ Observamos que <strong>{activeChild.name}</strong> tiene un buen promedio de notas, pero está olvidando enviar sus evidencias a tiempo. Un recordatorio diario antes de dormir le ayudará a mejorar su responsabilidad.</p>
                                    ) : (
                                        <p>🎉 ¡Felicidades! <strong>{activeChild.name}</strong> mantiene un excelente ritmo de estudio y entrega constante. Sigue reconociendo su esfuerzo para mantener esta gran consistencia.</p>
                                    )}
                                </div>
                            </div>

                            {/* Recomendaciones Clave */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-[#7A3A8E] uppercase tracking-wider">Tareas y Sugerencias de Apoyo</h4>
                                <ul className="space-y-2 text-xs text-[#522566]">
                                    {metrics.outer < 30 ? (
                                        <>
                                            <li className="flex items-start gap-2 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl">
                                                <span className="text-rose-500 font-bold">📌</span>
                                                <span>Establece un horario fijo de 20 minutos diarios libres de pantallas secundarias y distracciones para avanzar en el mapa.</span>
                                            </li>
                                            <li className="flex items-start gap-2 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl">
                                                <span className="text-rose-500 font-bold">📌</span>
                                                <span>Acompáñalo en la realización de la misión actual del mapa para identificar si tiene dudas conceptuales.</span>
                                            </li>
                                        </>
                                    ) : metrics.inner < 60 ? (
                                        <>
                                            <li className="flex items-start gap-2 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl">
                                                <span className="text-amber-600 font-bold">📌</span>
                                                <span>Implementa una rutina de revisión nocturna: revisen juntos si las evidencias del día fueron enviadas correctamente.</span>
                                            </li>
                                            <li className="flex items-start gap-2 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl">
                                                <span className="text-amber-600 font-bold">📌</span>
                                                <span>Recompensa de manera verbal o simbólica la entrega oportuna de tareas para crear un hábito positivo.</span>
                                            </li>
                                        </>
                                    ) : (
                                        <>
                                            <li className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl">
                                                <span className="text-emerald-600 font-bold">📌</span>
                                                <span>Valida su autonomía: pregúntale qué ha sido lo más interesante que ha aprendido en sus misiones asignadas.</span>
                                            </li>
                                            <li className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl">
                                                <span className="text-emerald-600 font-bold">📌</span>
                                                <span>Anímalo a explorar misiones de nivel superior o compartir lo que sabe con sus compañeros en el mural.</span>
                                            </li>
                                        </>
                                    )}
                                    <li className="flex items-start gap-2 bg-[#F8EDFB] border border-[#EADFF0] p-2.5 rounded-xl">
                                        <span className="text-[#7A3A8E] font-bold">💡</span>
                                        <span>Fomenta una mentalidad de crecimiento: celebra el esfuerzo y la constancia diaria más que la nota final obtenida.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Desempeño por Proyecto */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-[#522566]">Desempeño Detallado por Proyecto</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(!activeChild.assignedWorlds || activeChild.assignedWorlds.length === 0) ? (
                                <div className="col-span-full bg-white border border-[#EADFF0] p-8 rounded-3xl text-center text-xs text-[#AD74C3] font-bold">
                                    El estudiante no tiene proyectos asignados actualmente.
                                </div>
                            ) : (
                                activeChild.assignedWorlds.map((world: any) => {
                                    const wMetrics = getChildWorldProgressMetrics(activeChild, world);
                                    return (
                                        <div key={world.id} className="bg-white border border-[#EADFF0] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-4 text-center">
                                            <div className="w-full pb-2.5 border-b border-[#F8EDFB]">
                                                <h4 className="font-black text-xs text-[#522566] tracking-tight line-clamp-1">{world.title}</h4>
                                                <span className="text-[9px] uppercase tracking-wider text-[#AD74C3] font-black">{world.theme || "General"}</span>
                                            </div>

                                            <div className="bg-[#F8EDFB]/50 border border-[#EADFF0]/60 p-4 rounded-full">
                                                <ActivityRings 
                                                    outer={wMetrics.outer} 
                                                    middle={wMetrics.middle} 
                                                    inner={wMetrics.inner} 
                                                    size={110}
                                                />
                                            </div>

                                            <div className="w-full space-y-2 text-left text-[11px]">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-[#7A3A8E]" />
                                                        <span className="font-bold text-slate-500">Avance</span>
                                                    </div>
                                                    <span className="font-black text-[#7A3A8E]">{wMetrics.outer}% ({wMetrics.completedLevels}/{wMetrics.totalLevels})</span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-[#AD74C3]" />
                                                        <span className="font-bold text-slate-500">Promedio</span>
                                                    </div>
                                                    <span className="font-black text-[#8F4AA3]">{(wMetrics.middle / 10).toFixed(1)}/10</span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-[#EC4899]" />
                                                        <span className="font-bold text-slate-500">Entregas</span>
                                                    </div>
                                                    <span className="font-black text-[#EC4899]">{wMetrics.inner}% ({wMetrics.submissions}/{wMetrics.totalLevels})</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Pestañas de Navegación del Alumno */}
                    <div className="flex justify-center border-b border-[#EADFF0] pb-px">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setParentTab("performance")}
                                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                                    parentTab === "performance"
                                        ? "border-[#7A3A8E] text-[#7A3A8E]"
                                        : "border-transparent text-[#AD74C3] hover:text-[#522566]"
                                }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                Desempeño y Retroalimentación
                            </button>
                            <button
                                onClick={() => setParentTab("story")}
                                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                                    parentTab === "story"
                                        ? "border-[#7A3A8E] text-[#7A3A8E]"
                                        : "border-transparent text-[#AD74C3] hover:text-[#522566]"
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                Mural de la Clase
                            </button>
                        </div>
                    </div>

                    {/* Contenido según pestaña activa */}
                    {parentTab === "performance" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* CONDUCTA Y PUNTOS DE ACTITUD */}
                            <div className="bg-white border border-[#EADFF0] p-6 rounded-3xl space-y-4 shadow-sm">
                                <h4 className="font-black text-sm tracking-tight flex items-center gap-2">
                                    <Star className="w-4.5 h-4.5 text-amber-500 fill-current" /> Conducta y Felicitaciones de Clase
                                </h4>
                                
                                {(!activeChild.behaviorLogs || activeChild.behaviorLogs.length === 0) ? (
                                    <p className="text-xs text-[#AD74C3] font-bold py-6 text-center">Sin observaciones de conducta registradas recientemente.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                        {activeChild.behaviorLogs.map((log: any) => {
                                            const isPos = log.category?.isPositive ?? true;
                                            return (
                                                <div key={log.id} className="flex justify-between items-center p-3 bg-[#F8EDFB]/50 border border-[#EADFF0] rounded-2xl text-xs">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-2xl bg-white w-9 h-9 rounded-xl border border-[#EADFF0] flex items-center justify-center shadow-sm">
                                                            {log.category?.icon || "⭐"}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-[#522566]">{log.category?.name || "Actitud"}</p>
                                                            {log.note && <p className="text-[10px] text-slate-500 mt-0.5">{log.note}</p>}
                                                        </div>
                                                    </div>
                                                    <span className={`font-black uppercase text-[10px] tracking-wider px-2 py-0.5 rounded ${
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
                             <div className="bg-white border border-[#EADFF0] p-6 rounded-3xl space-y-4 shadow-sm">
                                 <h4 className="font-black text-sm tracking-tight flex items-center gap-2">
                                     <MessageSquare className="w-4.5 h-4.5 text-[#AD74C3]" /> Retroalimentación por Proyecto
                                 </h4>

                                 {(!activeChild.assignedWorlds || activeChild.assignedWorlds.length === 0) ? (
                                     <p className="text-xs text-[#AD74C3] font-bold py-6 text-center">El estudiante no cuenta con proyectos asignados.</p>
                                 ) : (
                                     <div className="space-y-6 max-h-[300px] overflow-y-auto pr-1">
                                         {activeChild.assignedWorlds.map((world: any) => {
                                             const worldEvidences = (activeChild.evidenceEntries || []).filter(
                                                 (ev: any) => ev.worldId === world.id
                                             );

                                             return (
                                                 <div key={world.id} className="space-y-2">
                                                     <div className="flex items-center justify-between border-b border-[#F8EDFB] pb-1.5">
                                                         <span className="font-black text-xs text-[#7A3A8E]">{world.title}</span>
                                                         <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-100 rounded">
                                                             {worldEvidences.length} {worldEvidences.length === 1 ? 'Actividad' : 'Actividades'}
                                                         </span>
                                                     </div>

                                                     {worldEvidences.length === 0 ? (
                                                         <p className="text-[10px] text-slate-400 italic py-2 font-medium">Sin actividades enviadas en este proyecto todavía.</p>
                                                     ) : (
                                                         <div className="space-y-2">
                                                             {worldEvidences.map((ev: any) => (
                                                                 <div key={ev.id} className="p-3 bg-[#F8EDFB]/40 border border-[#EADFF0] rounded-2xl space-y-1.5 text-xs">
                                                                     <div className="flex justify-between items-center">
                                                                         <span className="font-black text-[#522566]">Misión de Nivel {ev.levelId}</span>
                                                                         {ev.grade !== null ? (
                                                                             <span className="font-black text-[#7A3A8E] bg-white px-2 py-0.5 border border-[#EADFF0] rounded text-[10px]">
                                                                                 Nota: {ev.grade}/10
                                                                             </span>
                                                                         ) : (
                                                                             <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                                                                                 Pendiente de revisión
                                                                             </span>
                                                                         )}
                                                                     </div>
                                                                     {ev.feedback && (
                                                                         <p className="text-[11px] leading-relaxed text-slate-600 bg-white/70 p-2.5 rounded-xl border border-white font-medium">
                                                                             &ldquo;{ev.feedback}&rdquo;
                                                                         </p>
                                                                     )}
                                                                     <p className="text-[9px] text-slate-400 font-semibold">{new Date(ev.createdAt).toLocaleDateString()}</p>
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
                        <div className="bg-white p-6 rounded-[2.5rem] border border-[#EADFF0] shadow-sm">
                            <ClassStoryFeed classroomId={activeChild.classroomId || 'global'} isTeacher={false} />
                        </div>
                    )}

                </div>
            )}
        </main>
    );
}

export default function ParentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-[#AD74C3] font-bold text-lg">
                Inicializando Portal Familiar...
            </div>
        }>
            <ParentPageContent />
        </Suspense>
    );
}
