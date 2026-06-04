"use client";

import AdventureMap from "@/components/AdventureMap";
import StudentHUD from "@/components/StudentHUD";
import { ArrowLeft, X, BrainCircuit, ClipboardList, Shield, Swords, Timer, MapPin, Flame, Diamond, Heart, Sparkles } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";
import { useState, useEffect, useCallback } from "react";
import RewardsStore from "@/components/RewardsStore";
import Leaderboard from "@/components/Leaderboard";
import StudentProfile from "@/components/StudentProfile";
import VirtualClassroom from "@/components/VirtualClassroom";
import RaidBossWidget from "@/components/RaidBossWidget";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { getTheme, THEME_LIST } from "@/lib/themes";

interface HintData {
    id: string;
    message: string;
    createdAt: string;
}

interface EvidenceData {
    id: string;
    feedback: string;
    grade: number | null;
    isCorrect: boolean;
    canAdvance: boolean;
    createdAt: string;
    topic?: string;
    worldId: string;
    world?: { title: string; theme: string };
}

interface TeacherMsg {
    id: string;
    message: string;
    isGlobal: boolean;
    createdAt: string;
    sender?: { name: string };
}

export default function StudentPage() {
    const { currentUser, setActiveWorld, bootstrapExtras, worlds, progress, stats } = useLearning();
    const { status } = useSession();
    const router = useRouter();
    useSessionGuard();
    const [activeTab, setActiveTab] = useState<"map" | "salon" | "evaluaciones" | "tienda" | "lideres" | "perfil">("map");
    const [showRaidModal, setShowRaidModal] = useState(false);
    const [hints, setHints] = useState<HintData[]>([]);
    const [evaluations, setEvaluations] = useState<EvidenceData[]>([]);
    const [teacherMessages, setTeacherMessages] = useState<TeacherMsg[]>([]);
    const [dismissedMsgIds, setDismissedMsgIds] = useState<Set<string>>(new Set());
    const [livesResetCountdown, setLivesResetCountdown] = useState(0);
    const [showPenaltyMessage, setShowPenaltyMessage] = useState(false);

    // Load dismissed messages after component mounts to prevent hydration mismatch
    useEffect(() => {
        try {
            const stored = localStorage.getItem('dismissedTeacherMsgIds');
            if (stored) {
                setDismissedMsgIds(new Set(JSON.parse(stored)));
            }
        } catch { /* ignore storage errors */ }
    }, []);

    // State to determine if we are in Lobby or inside a specific Map
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

    // Initialize hints, evaluations, and messages from bootstrap data (no extra API calls!)
    useEffect(() => {
        if (bootstrapExtras) {
            setHints(bootstrapExtras.hints || []);
            setEvaluations(bootstrapExtras.evaluations || []);
            setTeacherMessages(bootstrapExtras.messages || []);
        }
    }, [bootstrapExtras]);

    const fetchHints = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/hints?studentId=${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                setHints(data);
            }
        } catch (e) {
            console.error("Failed to fetch hints", e);
        }
    }, [currentUser?.id]);

    // Only poll for updates — initial data comes from bootstrap
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchHints();
        }, 180000);
        return () => clearInterval(interval);
    }, [fetchHints]);

    // Fetch evaluations for this student
    const fetchEvaluations = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/evidence?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setEvaluations(data);
            }
        } catch (e) {
            console.error("Failed to fetch evaluations", e);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchEvaluations();
        }, 300000);
        return () => clearInterval(interval);
    }, [fetchEvaluations]);

    // Fetch teacher messages
    const fetchMessages = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/messages?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setTeacherMessages(data);
            }
        } catch (e) {
            console.error("Failed to fetch messages", e);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchMessages();
        }, 300000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    const dismissMessage = (msgId: string) => {
        const newSet = new Set([...dismissedMsgIds, msgId]);
        setDismissedMsgIds(newSet);
        try {
            window.localStorage.setItem('dismissedTeacherMsgIds', JSON.stringify([...newSet]));
        } catch { /* ignore storage errors */ }
    };


    const dismissHint = async (hintId: string) => {
        setHints(prev => prev.filter(h => h.id !== hintId));
        try {
            await fetch('/api/hints', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hintIds: [hintId] })
            });
        } catch (e) {
            console.error("Failed to mark hint as read", e);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && status === "unauthenticated") {
            router.push("/");
        }
    }, [mounted, status, router]);

    // Auto-select map logic if only one is assigned
    useEffect(() => {
        if (currentUser && currentUser.assignedWorlds) {
            if (currentUser.assignedWorlds.length === 1 && !selectedMapId) {
                const soleMapId = currentUser.assignedWorlds[0].id;
                setSelectedMapId(soleMapId);
                setActiveWorld(soleMapId);
            }
        }
    }, [currentUser, selectedMapId, setActiveWorld]);

    // Auto-reset lives when they reach 0 after a 60-second cooldown
    // stats is destructured at the top of the component
    const { setStats: setLearningStats } = useLearning();
    useEffect(() => {
        if (stats.lives <= 0 && livesResetCountdown === 0) {
            setLivesResetCountdown(60);
        }
    }, [stats.lives]);

    useEffect(() => {
        if (livesResetCountdown <= 0) return;
        const timer = setInterval(() => {
            setLivesResetCountdown(prev => {
                if (prev <= 1) {
                    // Reset lives to 3 via API + local state
                    if (currentUser?.id) {
                        fetch('/api/users/sync-stats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ studentId: currentUser.id, livesToAdd: 3 })
                        }).catch(console.error);
                        setLearningStats(s => ({ ...s, lives: 3 }));
                    }
                    setShowPenaltyMessage(true);
                    setTimeout(() => setShowPenaltyMessage(false), 8000);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [livesResetCountdown, currentUser?.id]);

    // Consistent loading for SSR + client
    if (!mounted || status === "loading" || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f5fb' }}>
                <div className="font-semibold text-sm" style={{ color: '#346297' }}>Cargando tu aventura...</div>
            </div>
        );
    }

    // Determine lobby theme from first assigned world
    const lobbyThemeKey = currentUser.assignedWorlds?.[0]?.theme;
    const lobbyTheme = getTheme(lobbyThemeKey);

    // THE LOBBY VIEW
    if (!selectedMapId) {
        const getHoverShadow = (themeKey: string) => {
            if (themeKey === 'fuego') return 'hover:shadow-[0_0_30px_rgba(249,115,22,0.25)] hover:border-orange-500/40';
            if (themeKey === 'hielo') return 'hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:border-cyan-500/40';
            if (themeKey === 'selva') return 'hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:border-emerald-500/40';
            if (themeKey === 'neon') return 'hover:shadow-[0_0_30px_rgba(217,70,239,0.25)] hover:border-fuchsia-500/40';
            return 'hover:shadow-[0_0_30px_rgba(79,70,229,0.25)] hover:border-indigo-500/40';
        };

        return (
            <main className={`min-h-screen bg-gradient-to-br ${lobbyTheme.lobbyBg} flex flex-col items-center p-4 sm:p-6 relative overflow-y-auto no-scrollbar`}>
                <div 
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />
                <div className="absolute top-4 left-4 z-40">
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center w-12 h-12 rounded-full font-bold shadow-2xl cursor-pointer"
                        title="Cerrar Sesión"
                    >
                        <ArrowLeft className="w-5 h-5 mb-0.5" />
                        <span className="text-[8px] uppercase tracking-wider font-extrabold">Salir</span>
                    </button>
                </div>

                {/* Visual Background Elements */}
                <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] ${lobbyTheme.lobbyGlow1} rounded-full blur-[140px] pointer-events-none opacity-60`}></div>
                <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] ${lobbyTheme.lobbyGlow2} rounded-full blur-[140px] pointer-events-none opacity-60`}></div>

                <div className="w-full max-w-5xl z-10 animate-fade-in py-10 flex flex-col justify-center">
                    {/* Header: Player Profile ID Card */}
                    <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden mb-12 animate-float-slow">
                        {/* Background glow lines */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="flex items-center gap-4">
                            {/* Avatar Frame Box */}
                            <div className="relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg border-2 border-white/20">
                                    {currentUser.avatar}
                                </div>
                                {/* Active frame highlight */}
                                {currentUser.activeFrame && (
                                    <div className="absolute inset-0 rounded-2xl border-2 pointer-events-none animate-pulse"
                                         style={{
                                             borderColor: currentUser.activeFrame === 'frame_fire' ? '#FD7E14' : currentUser.activeFrame === 'frame_ice' ? '#73a4db' : '#346297',
                                             boxShadow: '0 0 8px currentColor'
                                         }}
                                    />
                                )}
                            </div>
                            <div>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-wider">Aventurero</p>
                                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                                    {currentUser.name}
                                </h2>
                                {currentUser.globalActivityAverage !== undefined && currentUser.globalActivityAverage !== null && (
                                    <p className="text-cyan-400 text-xs font-bold mt-0.5">
                                        Promedio de Actividades: <span className="text-white font-black">{currentUser.globalActivityAverage.toFixed(1)}/10</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Player stats box */}
                        <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md">
                            {/* Lives */}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-xl" title="Vidas">
                                <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
                                <span className="font-black text-sm text-red-400">{stats.lives}</span>
                            </div>
                            {/* Gems */}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-xl" title="Gemas">
                                <Diamond className="w-4 h-4 text-cyan-500 fill-cyan-500" />
                                <span className="font-black text-sm text-cyan-400">{stats.gems}</span>
                            </div>
                            {/* Streak */}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-xl" title="Racha">
                                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                                <span className="font-black text-sm text-orange-400">{stats.streak}d</span>
                            </div>
                            {/* XP */}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-xl" title="XP">
                                <Sparkles className="w-4 h-4 text-purple-500" />
                                <span className="font-black text-sm text-purple-400">{stats.xp} XP</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h1 className={`text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${lobbyTheme.lobbyTitle} mb-3 drop-shadow-sm`}>
                            Elige tu Destino
                        </h1>
                        <p className="text-white/60 text-sm sm:text-base md:text-lg font-semibold max-w-2xl mx-auto">
                            Tienes {currentUser.assignedWorlds?.length || 0} aventuras disponibles. ¿En cuál quieres adentrarte?
                        </p>
                    </div>

                    {!currentUser.assignedWorlds || currentUser.assignedWorlds.length === 0 ? (
                        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl">
                            <div className="text-5xl sm:text-6xl mb-4 opacity-50">🏝️</div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Aún no tienes mundos asignados</h3>
                            <p className="text-white/50 mb-6 text-sm sm:text-base">Tu maestro debe asignarte una aventura para que puedas comenzar a jugar.</p>
                            <button onClick={() => window.location.reload()} className={`${lobbyTheme.nodeActive} text-white font-bold py-3 px-8 rounded-full transition-all active:scale-95 shadow-lg cursor-pointer`}>
                                Recargar
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                            {currentUser.assignedWorlds.map((world, idx) => {
                                const cardTheme = getTheme(world.theme);
                                const fullWorld = worlds.find(w => w.id === world.id);
                                const totalDays = fullWorld?.days?.length || 0;
                                const completedDays = progress[currentUser.id]?.[world.id]?.length || 0;
                                const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

                                let badgeText = "🆕 NUEVO";
                                let badgeStyle = "from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30";
                                if (progressPct === 100 && totalDays > 0) {
                                    badgeText = "🏆 COMPLETADO";
                                    badgeStyle = "from-emerald-500/20 to-green-600/20 text-emerald-300 border-emerald-500/30 animate-pulse";
                                } else if (progressPct > 0) {
                                    badgeText = `⚡ EN MARCHA`;
                                    badgeStyle = "from-orange-500/20 to-amber-500/20 text-orange-300 border-orange-500/30";
                                }

                                return (
                                    <button
                                        key={world.id}
                                        onClick={() => {
                                            setSelectedMapId(world.id);
                                            setActiveWorld(world.id);
                                        }}
                                        className={`group text-left relative bg-slate-900/60 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 overflow-hidden flex flex-col h-full min-h-[280px] shadow-lg hover:shadow-2xl cursor-pointer ${getHoverShadow(world.theme)}`}
                                        style={{
                                            boxShadow: `0 10px 30px -15px rgba(0, 0, 0, 0.5)`
                                        }}
                                    >
                                        {/* Card glow behind */}
                                        <div className={`absolute inset-0 ${cardTheme.lobbyGlow1} opacity-0 group-hover:opacity-20 transition-opacity rounded-3xl`} />

                                        {/* State Badge in Top Right */}
                                        <div className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-gradient-to-r ${badgeStyle} border backdrop-blur-sm z-20`}>
                                            {badgeText}
                                        </div>

                                        <div className="relative z-10 flex-1 flex flex-col w-full">
                                            {/* Category Emoji Badge */}
                                            <div className={`w-14 h-14 ${cardTheme.nodeActive} rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-lg transform group-hover:rotate-6 transition-all duration-300 relative`}>
                                                {cardTheme.emoji}
                                                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            {/* World Title */}
                                            <h3 className="text-xl font-black text-white mb-1.5 leading-snug break-words line-clamp-2">
                                                {world.title || `Mundo ${idx + 1}`}
                                            </h3>

                                            {/* World Theme details */}
                                            <div className="flex items-center gap-1 text-white/40 text-[10px] font-bold uppercase tracking-wider mb-5">
                                                <Shield className="w-3 h-3" />
                                                <span>{cardTheme.label} • {world.theme}</span>
                                            </div>

                                            {/* Progress Bar inside Card */}
                                            <div className="mt-auto w-full pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                                                    <span className="text-white/40">Progreso del Mapa</span>
                                                    <span className="text-white/70">{completedDays} / {totalDays} niveles</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                                                    <div 
                                                        className={`h-full bg-gradient-to-r ${cardTheme.nodeActive} transition-all duration-1000 ease-out`}
                                                        style={{ width: `${progressPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action CTA */}
                                        <div className={`relative z-10 mt-5 pt-3 border-t border-white/5 flex items-center justify-between ${cardTheme.hudAccent} font-black text-xs uppercase tracking-widest group-hover:text-white transition-colors w-full`}>
                                            <span>Entrar al Mapa</span>
                                            <span className="transform group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-900 flex flex-col">
            {/* === STICKY HEADER SECTION (does not scroll) === */}
            <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
                <StudentHUD
                    onOpenStore={() => setActiveTab("tienda")}
                    onOpenLeaderboard={() => setActiveTab("lideres")}
                    onOpenProfile={() => setActiveTab("perfil")}
                >
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="bg-slate-800 p-1.5 rounded-xl shadow border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center shrink-0 w-8 h-8 snap-start"
                        title="Salir"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    {currentUser.assignedWorlds && currentUser.assignedWorlds.length > 1 && (
                        <button
                            onClick={() => { setSelectedMapId(null); setActiveTab("map"); }}
                            style={{ background: 'rgba(28, 58, 96, 0.8)', borderColor: '#73a4db' }}
                            className="rounded-xl shadow border text-white active:scale-95 transition-all flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs shrink-0 snap-start"
                            title="Mundos"
                        >
                            <span className="text-base">🗺️</span> <span className="hidden sm:inline">Mundos</span>
                        </button>
                    )}

                    {/* Tab: Aventura */}
                    <button
                        onClick={() => setActiveTab("map")}
                        className={`rounded-xl shadow border active:scale-95 transition-all flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs shrink-0 snap-start ${
                            activeTab === "map"
                                ? "bg-[#73a4db] border-[#73a4db] text-white shadow-[0_0_12px_rgba(115,164,219,0.3)]"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        <span>🏝️</span> <span className="hidden sm:inline">Aventura</span>
                    </button>

                    {/* Tab: Mi Salón */}
                    <button
                        onClick={() => setActiveTab("salon")}
                        className={`rounded-xl shadow border active:scale-95 transition-all flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs shrink-0 snap-start ${
                            activeTab === "salon"
                                ? "bg-[#73a4db] border-[#73a4db] text-white shadow-[0_0_12px_rgba(115,164,219,0.3)]"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        <span>🏫</span> <span className="hidden sm:inline">Mi Salón</span>
                    </button>

                    {/* Tab: Evaluaciones */}
                    <button
                        onClick={() => setActiveTab("evaluaciones")}
                        className={`rounded-xl shadow border active:scale-95 transition-all flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs relative shrink-0 snap-start ${
                            activeTab === "evaluaciones"
                                ? "bg-[#73a4db] border-[#73a4db] text-white shadow-[0_0_12px_rgba(115,164,219,0.3)]"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        <ClipboardList className="w-4 h-4" /> <span className="hidden sm:inline">Evaluaciones</span>
                        {evaluations.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black border border-slate-900 shadow-md">
                                {evaluations.length}
                            </span>
                        )}
                    </button>

                    {/* Tab: Tienda */}
                    <button
                        onClick={() => setActiveTab("tienda")}
                        className={`rounded-xl shadow border active:scale-95 transition-all flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs shrink-0 snap-start ${
                            activeTab === "tienda"
                                ? "bg-[#73a4db] border-[#73a4db] text-white shadow-[0_0_12px_rgba(115,164,219,0.3)]"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        <span>💎</span> <span className="hidden sm:inline">Tienda</span>
                    </button>

                    {/* Tab: Líderes */}
                    <button
                        onClick={() => setActiveTab("lideres")}
                        className={`rounded-xl shadow border active:scale-95 transition-all flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs shrink-0 snap-start ${
                            activeTab === "lideres"
                                ? "bg-[#73a4db] border-[#73a4db] text-white shadow-[0_0_12px_rgba(115,164,219,0.3)]"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        <span>🏆</span> <span className="hidden sm:inline">Líderes</span>
                    </button>

                    {/* Tab: Perfil */}
                    <button
                        onClick={() => setActiveTab("perfil")}
                        className={`rounded-xl shadow border active:scale-95 transition-all flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs shrink-0 snap-start ${
                            activeTab === "perfil"
                                ? "bg-[#73a4db] border-[#73a4db] text-white shadow-[0_0_12px_rgba(115,164,219,0.3)]"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        <span>👤</span> <span className="hidden sm:inline">Perfil</span>
                    </button>
                </StudentHUD>

                {/* Lives Cooldown Timer */}
                {livesResetCountdown > 0 && (
                    <div className="px-3 pb-2 max-w-lg mx-auto w-full">
                        <div className="bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300 rounded-2xl p-3 shadow flex items-center gap-3">
                            <Timer className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs font-black text-red-700">💔 Perdiste todas tus vidas</p>
                                <p className="text-[11px] text-red-600">Tus vidas se recuperarán en <span className="font-black">{livesResetCountdown}s</span></p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Penalty Message after reset */}
                {showPenaltyMessage && (
                    <div className="px-3 pb-2 max-w-lg mx-auto w-full">
                        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400 rounded-2xl p-3 shadow flex items-center gap-3">
                            <span className="text-2xl">⚠️</span>
                            <p className="text-xs font-bold text-amber-800">Tus vidas han sido restauradas, pero como penalización tu siguiente actividad valdrá 1 punto menos.</p>
                            <button onClick={() => setShowPenaltyMessage(false)} className="text-amber-500 hover:text-amber-800 p-1 shrink-0">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Inline Notifications (inside header, not floating) */}
                {hints.length > 0 && (
                    <div className="px-3 pb-2 space-y-2 max-w-lg mx-auto w-full">
                        {hints.map(hint => (
                            <div key={hint.id} className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-amber-300 rounded-2xl p-3 shadow flex items-start gap-2">
                                <div className="bg-amber-400 text-white rounded-full p-1.5 shrink-0">
                                    <BrainCircuit className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">💡 Pista</p>
                                    <p className="text-amber-900 text-xs leading-relaxed font-medium">{hint.message}</p>
                                </div>
                                <button onClick={() => dismissHint(hint.id)} className="text-amber-500 hover:text-amber-800 p-1 shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {teacherMessages.filter(m => !dismissedMsgIds.has(m.id)).length > 0 && (
                    <div className="px-3 pb-2 space-y-2 max-w-lg mx-auto w-full">
                        {teacherMessages.filter(m => !dismissedMsgIds.has(m.id)).slice(0, 3).map(msg => (
                            <div key={msg.id} className="bg-gradient-to-r from-violet-100 to-fuchsia-100 border-2 border-violet-300 rounded-2xl p-3 shadow flex items-start gap-2">
                                <div className="bg-violet-500 text-white rounded-full p-1.5 shrink-0">
                                    <span className="text-xs">📢</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-0.5">📩 {msg.sender?.name || 'Maestro'}</p>
                                    <p className="text-violet-900 text-xs leading-relaxed font-medium">{msg.message}</p>
                                </div>
                                <button onClick={() => dismissMessage(msg.id)} className="text-violet-400 hover:text-violet-800 p-1 shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* === MAIN CONTENT AREA === */}
            <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col">
                {activeTab === "map" && (
                    <div className="flex-1 flex flex-col">
                        <AdventureMap onOpenRaid={() => setShowRaidModal(true)} />
                    </div>
                )}

                {activeTab === "salon" && currentUser?.id && (
                    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                        <VirtualClassroom studentId={currentUser.id} onClose={() => setActiveTab("map")} />
                    </div>
                )}

                {activeTab === "evaluaciones" && (
                    <div className="flex-1 flex justify-center p-4 md:p-8">
                        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shrink-0">
                                <h2 className="text-2xl font-black flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Mis Evaluaciones</h2>
                                <p className="text-amber-100 text-sm mt-1">Aquí puedes ver la retroalimentación de tu maestro</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f0f5fb]">
                                {(() => {
                                    const mapEvaluations = evaluations.filter(ev => ev.worldId === selectedMapId);
                                    if (mapEvaluations.length === 0) {
                                        return (
                                            <div className="text-center py-16">
                                                <div className="text-6xl mb-4">📋</div>
                                                <h3 className="text-xl font-bold text-slate-700">Sin evaluaciones aún</h3>
                                                <p className="text-slate-400 text-sm mt-2">Cuando tu maestro revise tu trabajo en este mapa, aparecerá aquí.</p>
                                            </div>
                                        );
                                    }
                                    return mapEvaluations.map((ev) => {
                                        const feedbackLines = ev.feedback.split('\n').filter(l => l.trim());
                                        const category = feedbackLines[0] || 'Evaluado';
                                        const detailedFeedback = feedbackLines.slice(1).join('\n').trim();
                                        const grade = ev.grade ?? 0;

                                        let badgeColor = 'bg-green-100 text-green-700 border-green-200';
                                        let cardBorder = 'border-green-200';
                                        let emoji = '✅';
                                        if (grade < 6) {
                                            badgeColor = 'bg-red-100 text-red-700 border-red-200';
                                            cardBorder = 'border-red-200';
                                            emoji = '❌';
                                        } else if (grade < 8) {
                                            badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                            cardBorder = 'border-yellow-200';
                                            emoji = '⚠️';
                                        }

                                        return (
                                            <div key={ev.id} className={`p-5 rounded-2xl border-2 ${cardBorder} bg-white shadow-md`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${badgeColor}`}>
                                                        {emoji} {category}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-2xl font-black ${grade >= 8 ? 'text-green-600' : grade >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {grade}/10
                                                        </span>
                                                    </div>
                                                </div>

                                                {ev.world && (
                                                    <p className="text-xs text-slate-400 font-medium mb-3">
                                                        {ev.world.title} • {new Date(ev.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                )}

                                                <div style={{ background: '#f0f5fb', color: '#346297' }} className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line border border-[#cbe0f6]">
                                                    {detailedFeedback || ev.feedback}
                                                </div>

                                                {grade < 6 && (
                                                    <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                                                        <span className="text-lg">💔</span>
                                                        <p className="text-xs text-red-600 font-bold">Perdiste una vida. ¡Inténtalo de nuevo!</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "tienda" && (
                    <div className="flex-1 flex justify-center p-4 md:p-8">
                        <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
                            <RewardsStore onClose={() => setActiveTab("map")} />
                        </div>
                    </div>
                )}

                {activeTab === "lideres" && (
                    <div className="flex-1 flex justify-center p-4 md:p-8">
                        <div className="w-full max-w-xl">
                            <Leaderboard />
                        </div>
                    </div>
                )}

                {activeTab === "perfil" && (
                    <div className="flex-1 flex justify-center p-4 md:p-8">
                        <StudentProfile onClose={() => setActiveTab("map")} />
                    </div>
                )}
            </div>

            <RaidBossWidget externalOpen={showRaidModal} onExternalClose={() => setShowRaidModal(false)} />
        </main>
    );
}
