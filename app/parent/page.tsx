"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import ClassStoryFeed from "@/components/ClassStoryFeed";
import { 
    LogOut, Star, TrendingUp, Users, BookOpen, Clock, Award, 
    MessageSquare, Plus, CheckCircle2, AlertTriangle, Sparkles, UserPlus 
} from "lucide-react";
import { ActivityRings } from "@/components/PerformanceDashboard";

export default function ParentPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [children, setChildren] = useState<any[]>([]);
    const [activeChild, setActiveChild] = useState<any>(null);
    const [parentTab, setParentTab] = useState<"story" | "performance">("story");

    // Estado para vinculación de nuevos hijos
    const [searchType, setSearchType] = useState<"code" | "name">("code");
    const [searchValue, setSearchValue] = useState("");
    const [linkStatus, setLinkStatus] = useState("");
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/");
    }, [status, router]);

    // Cargar hijos vinculados al iniciar
    useEffect(() => {
        if (session && (session.user as any)?.role === 'PARENT') {
            fetch("/api/parent/children")
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setChildren(data);
                        if (data.length > 0) setActiveChild(data[0]);
                    }
                });
        }
    }, [session]);

    // Acción para vincular hijo
    const handleLinkChild = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;

        setLinking(true);
        setLinkStatus("Vinculando...");
        try {
            const payload = searchType === "code" 
                ? { code: searchValue.trim() }
                : { name: searchValue.trim() };

            const res = await fetch("/api/parent/children", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                setLinkStatus("✅ ¡Vínculo exitoso!");
                const newChild = data.child;
                setChildren(prev => {
                    const exists = prev.some(c => c.id === newChild.id);
                    if (exists) return prev;
                    return [...prev, newChild];
                });
                setActiveChild(newChild);
                setSearchValue("");
                setTimeout(() => setLinkStatus(""), 4000);
            } else {
                setLinkStatus(`❌ ${data.error || "Error al vincular."}`);
            }
        } catch {
            setLinkStatus("❌ Error de red.");
        } finally {
            setLinking(false);
        }
    };

    // Cálculos de métricas del hijo seleccionado
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

    const metrics = getChildProgressMetrics(activeChild);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse text-[#AD74C3] font-bold text-lg">
                Inicializando Portal Familiar...
            </div>
        );
    }

    if (!session || (session.user as any)?.role !== 'PARENT') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold text-rose-600 mb-4">Acceso Denegado</h1>
                <p className="text-[#522566] font-medium mb-6">Solo los padres/tutores pueden acceder a este panel.</p>
                <button 
                    onClick={() => signOut({ callbackUrl: "/" })} 
                    className="bg-[#522566] text-white px-8 py-3 font-bold rounded-xl shadow-lg active:scale-95 transition-all"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8EDFB] text-[#522566] font-medium pb-20">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-[#EADFF0] p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F8EDFB] rounded-2xl flex items-center justify-center text-2xl border border-[#EADFF0]">👨‍👩‍👧‍👦</div>
                    <div>
                        <h1 className="text-base font-black uppercase tracking-widest text-[#522566]">Portal Familia</h1>
                        <p className="text-[9px] text-[#AD74C3] font-black uppercase tracking-wider">Acompañamiento Escolar Inteligente</p>
                    </div>
                </div>
                <button 
                    onClick={() => signOut({ callbackUrl: "/" })} 
                    className="text-[#AD74C3] hover:text-rose-500 hover:bg-rose-50 p-2.5 rounded-xl transition-all border border-transparent hover:border-rose-100 cursor-pointer active:scale-95"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* SIDEBAR: HIJOS Y VINCULACIÓN */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* LISTADO DE ESTUDIANTES */}
                    <div className="space-y-4">
                        <h2 className="font-black text-xs uppercase tracking-widest text-[#AD74C3]">Mis Estudiantes</h2>
                        {children.length === 0 ? (
                            <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-[#EADFF0] text-xs text-[#AD74C3] font-bold text-center">
                                No tienes hijos vinculados a tu cuenta todavía. Vincula uno abajo.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => {
                                            setActiveChild(child);
                                        }}
                                        className={`w-full text-left p-4 rounded-3xl border-2 transition-all flex flex-col gap-3 cursor-pointer ${
                                            activeChild?.id === child.id 
                                                ? 'bg-[#522566] border-[#AD74C3] text-white shadow-xl scale-[1.02]' 
                                                : 'bg-white border-[#EADFF0] hover:border-[#AD74C3]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="w-14 h-14 shrink-0 bg-[#F8EDFB] rounded-full flex items-center justify-center text-3xl border-2 border-white/20 shadow-inner">
                                                {child.avatar || '🧑🏻'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-base truncate w-full">{child.name}</h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                        activeChild?.id === child.id ? 'text-[#EADFF0]' : 'text-[#AD74C3]'
                                                    }`}>
                                                        {child.xp || 0} XP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* VINCULACIÓN NUEVA */}
                    <div className="bg-white border border-[#EADFF0] p-5 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-[#AD74C3]" />
                            <h3 className="font-black text-xs uppercase tracking-widest">Vincular Estudiante</h3>
                        </div>

                        {/* Selector de tipo de búsqueda */}
                        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8EDFB] rounded-xl border border-[#EADFF0]">
                            <button
                                type="button"
                                onClick={() => setSearchType("code")}
                                className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                    searchType === "code" ? "bg-[#522566] text-white" : "text-[#AD74C3]"
                                }`}
                            >
                                Por Código
                            </button>
                            <button
                                type="button"
                                onClick={() => setSearchType("name")}
                                className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                    searchType === "name" ? "bg-[#522566] text-white" : "text-[#AD74C3]"
                                }`}
                            >
                                Por Nombre
                            </button>
                        </div>

                        <form onSubmit={handleLinkChild} className="space-y-3">
                            <input
                                type="text"
                                placeholder={searchType === "code" ? "Ej. ESTUD123" : "Nombre del alumno..."}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#F8EDFB] border border-[#EADFF0] rounded-2xl text-xs text-[#522566] focus:outline-none focus:ring-2 focus:ring-[#AD74C3] placeholder-[#AD74C3]"
                            />
                            <button
                                type="submit"
                                disabled={linking || !searchValue.trim()}
                                className="w-full bg-[#522566] hover:bg-[#6b2e82] disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl transition-all cursor-pointer"
                            >
                                {linking ? "Buscando..." : "Vincular Alumno"}
                            </button>
                        </form>

                        {linkStatus && (
                            <p className="text-[10px] font-bold text-center p-2 bg-[#F8EDFB] border border-[#EADFF0] rounded-xl">
                                {linkStatus}
                            </p>
                        )}
                    </div>
                </div>

                {/* CONTENIDO CENTRAL */}
                <div className="lg:col-span-3 space-y-6">
                    
                    {activeChild ? (
                        <>
                            {/* Selector de Pestaña Familiar */}
                            <div className="flex justify-between items-center bg-white border border-[#EADFF0] p-2 rounded-3xl shadow-sm">
                                <div className="flex gap-1 w-full sm:w-auto">
                                    <button
                                        onClick={() => setParentTab("story")}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                            parentTab === "story" 
                                                ? "bg-[#522566] text-white shadow-md shadow-[#522566]/20" 
                                                : "text-[#AD74C3] hover:text-[#522566]"
                                        }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        Mural de la Clase
                                    </button>
                                    <button
                                        onClick={() => setParentTab("performance")}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                            parentTab === "performance" 
                                                ? "bg-[#522566] text-white shadow-md shadow-[#522566]/20" 
                                                : "text-[#AD74C3] hover:text-[#522566]"
                                        }`}
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        Rendimiento Escolar
                                    </button>
                                </div>
                                <span className="hidden sm:inline bg-[#F8EDFB] border border-[#EADFF0] text-[#7A3A8E] text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl">
                                    Estudiante: {activeChild.name}
                                </span>
                            </div>

                            {/* PESTAÑA 1: MURAL DE CLASE */}
                            {parentTab === "story" && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="font-black text-base text-[#522566] tracking-tight">Actividad de la Clase</h2>
                                    </div>
                                    <div className="bg-white p-4 rounded-3xl border border-[#EADFF0] min-h-[50vh] shadow-sm">
                                        <ClassStoryFeed classroomId={activeChild.classroomId || 'global'} isTeacher={false} />
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA 2: RENDIMIENTO ESCOLAR (ANILLOS Y TABLAS) */}
                            {parentTab === "performance" && (
                                <div className="space-y-8 animate-fade-in">
                                    
                                    {/* OLED-STYLE ACTIVITY RINGS DE HIJO */}
                                    <div className="relative overflow-hidden bg-slate-950 text-white rounded-[3rem] p-8 sm:p-10 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center gap-10">
                                        <div className="absolute right-0 top-0 w-[300px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
                                        
                                        {/* Anillos */}
                                        <div className="shrink-0 bg-black/40 border border-white/5 p-6 rounded-full shadow-inner">
                                            <ActivityRings 
                                                outer={metrics.outer} 
                                                middle={metrics.middle} 
                                                inner={metrics.inner} 
                                                size={180}
                                                showLabel={true}
                                            />
                                        </div>

                                        {/* Desglose */}
                                        <div className="flex-1 space-y-6 w-full relative z-10">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#AD74C3]">Métricas de Desempeño Académico</span>
                                                <h3 className="text-2xl font-black text-white tracking-tight mt-0.5">Avance de {activeChild.name}</h3>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Outer Ring */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full bg-[#FF2D55] shrink-0 shadow-[0_0_8px_#FF2D55]" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-black text-slate-300">Avance en Aventuras (Coral)</span>
                                                            <span className="font-black text-white">{metrics.outer}%</span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">Ha completado {metrics.completedLevels} de {metrics.totalLevels} niveles en sus mapas asignados.</p>
                                                    </div>
                                                </div>

                                                {/* Middle Ring */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full bg-[#30D158] shrink-0 shadow-[0_0_8px_#30D158]" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-black text-slate-300">Promedio Escolar (Verde)</span>
                                                            <span className="font-black text-[#30D158]">{(metrics.middle / 10).toFixed(1)} / 10</span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">Calificación promedio obtenida en sus evaluaciones.</p>
                                                    </div>
                                                </div>

                                                {/* Inner Ring */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full bg-[#BF5AF2] shrink-0 shadow-[0_0_8px_#BF5AF2]" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-black text-slate-300">Responsabilidad en Tareas (Púrpura)</span>
                                                            <span className="font-black text-white">{metrics.inner}%</span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">Ha enviado evidencias de {metrics.submissions} de {metrics.totalLevels} misiones asignadas.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CONSEJO PEDAGÓGICO DE APRENDIA */}
                                    <div className="p-5 bg-white border border-[#EADFF0] rounded-3xl flex items-start gap-4 shadow-sm">
                                        <div className="p-2.5 bg-[#F8EDFB] border border-[#EADFF0] rounded-2xl text-[#7A3A8E] shrink-0">
                                            <Sparkles className="w-5 h-5 animate-pulse" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-black text-sm text-[#522566]">Consejo de Acompañamiento Familiar</h4>
                                            <p className="text-xs text-[#522566] leading-relaxed font-medium">
                                                {metrics.outer < 30 ? (
                                                    `🚨 ${activeChild.name} está presentando un retraso significativo en completar sus mundos virtuales. Se recomienda acompañarlo en su espacio de estudio, validar si está atascado en algún ejercicio y motivarlo con palabras de aliento.`
                                                ) : metrics.inner < 60 ? (
                                                    `⚠️ Observamos que ${activeChild.name} tiene un buen promedio de notas, pero está olvidando enviar sus evidencias a tiempo. Un recordatorio diario antes de dormir le ayudará a mejorar su responsabilidad.`
                                                ) : (
                                                    `🎉 ¡Felicidades! ${activeChild.name} mantiene un excelente ritmo de estudio y entrega constante. Sigue reconociendo su esfuerzo para mantener esta gran consistencia.`
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* CONDUCTA Y PUNTOS DE ACTITUD */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        
                                        {/* CONDUCTA */}
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
                                                                    <div className="text-2xl bg-white w-9 h-9 rounded-xl border border-[#EADFF0] flex items-center justify-center">
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

                                        {/* RETROALIMENTACIÓN DE TAREAS Y EVALUACIONES */}
                                        <div className="bg-white border border-[#EADFF0] p-6 rounded-3xl space-y-4 shadow-sm">
                                            <h4 className="font-black text-sm tracking-tight flex items-center gap-2">
                                                <MessageSquare className="w-4.5 h-4.5 text-[#AD74C3]" /> Retroalimentación del Profesor
                                            </h4>

                                            {(!activeChild.evidenceEntries || activeChild.evidenceEntries.length === 0) ? (
                                                <p className="text-xs text-[#AD74C3] font-bold py-6 text-center">No hay evidencias entregadas o revisadas todavía.</p>
                                            ) : (
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                                    {activeChild.evidenceEntries.map((ev: any) => (
                                                        <div key={ev.id} className="p-3 bg-[#F8EDFB]/50 border border-[#EADFF0] rounded-2xl space-y-2 text-xs">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-black text-[#522566]">Misión de Nivel {ev.levelId}</span>
                                                                {ev.grade !== null && (
                                                                    <span className="font-black text-[#30D158] bg-white px-2 py-0.5 border border-[#EADFF0] rounded text-[10px]">
                                                                        Nota: {ev.grade}/10
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {ev.feedback && (
                                                                <p className="text-[11px] leading-relaxed text-slate-600 bg-white/60 p-2.5 rounded-xl border border-white font-medium">
                                                                    &ldquo;{ev.feedback}&rdquo;
                                                                </p>
                                                            )}
                                                            <p className="text-[9px] text-slate-400">{new Date(ev.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                    </div>

                                </div>
                            )}

                        </>
                    ) : (
                        <div className="bg-white p-16 text-center rounded-3xl border-2 border-dashed border-[#EADFF0] min-h-[60vh] flex flex-col items-center justify-center">
                            <div className="text-6xl mb-4 opacity-75 animate-bounce-slow">🧑🏻‍🎓</div>
                            <h3 className="font-black text-lg text-[#522566]">Bienvenido al Portal Familiar</h3>
                            <p className="text-xs text-[#AD74C3] font-bold max-w-md mt-2 leading-relaxed">
                                Selecciona a tu hijo en el menú lateral o introduce su código de vinculación otorgado por el docente para ver su desempeño académico y escolar.
                            </p>
                        </div>
                    )}

                </div>

            </div>
        </main>
    );
}
