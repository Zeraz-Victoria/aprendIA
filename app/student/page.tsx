"use client";

import AdventureMap from "@/components/AdventureMap";
import StudentHUD from "@/components/StudentHUD";
import { ArrowLeft, X, BrainCircuit } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";
import { useState, useEffect, useCallback } from "react";
import RewardsStore from "@/components/RewardsStore";
import Leaderboard from "@/components/Leaderboard";
import StudentProfile from "@/components/StudentProfile";
import RaidBossWidget from "@/components/RaidBossWidget";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface HintData {
    id: string;
    message: string;
    createdAt: string;
}

export default function StudentPage() {
    const { currentUser, setActiveWorld } = useLearning();
    const { status } = useSession();
    const router = useRouter();
    const [showStore, setShowStore] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showRaidModal, setShowRaidModal] = useState(false);
    const [hints, setHints] = useState<HintData[]>([]);

    // State to determine if we are in Lobby or inside a specific Map
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

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

    useEffect(() => {
        fetchHints();
        const interval = setInterval(fetchHints, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, [fetchHints]);

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

    // Consistent loading for SSR + client
    if (!mounted || status === "loading" || !currentUser) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-teal-600 font-bold text-xl">Cargando tu aventura...</div>
            </div>
        );
    }

    // THE LOBBY VIEW
    if (!selectedMapId) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-4 left-4 z-40">
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition-all flex flex-col items-center justify-center w-12 h-12 rounded-full font-bold shadow-2xl"
                        title="Cerrar Sesión"
                    >
                        <ArrowLeft className="w-5 h-5 mb-0.5" />
                        <span className="text-[8px] uppercase tracking-wider">Salir</span>
                    </button>
                </div>

                {/* Visual Background Elements */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-500/20 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="w-full max-w-5xl z-10 animate-fade-in-up">
                    <div className="text-center mb-12">
                        <div className="inline-block bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 mb-6 shadow-2xl">
                            <h2 className="text-white font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                                <span className="text-2xl">{currentUser.avatar}</span> Hola, {currentUser.name}
                            </h2>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-sky-300 mb-4 drop-shadow-sm">
                            Elige tu Destino
                        </h1>
                        <p className="text-teal-200 text-lg md:text-xl font-medium max-w-2xl mx-auto">
                            Tienes {currentUser.assignedWorlds?.length || 0} aventuras disponibles. ¿En cuál quieres adentrarte el día de hoy?
                        </p>
                    </div>

                    {!currentUser.assignedWorlds || currentUser.assignedWorlds.length === 0 ? (
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl">
                            <div className="text-5xl sm:text-6xl mb-4 opacity-50">🏝️</div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Aún no tienes mundos asignados</h3>
                            <p className="text-teal-200 mb-6 text-sm sm:text-base">Tu maestro debe asignarte una aventura para que puedas comenzar a jugar. ¡Pronto habrá retos increíbles!</p>
                            <button onClick={() => window.location.reload()} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-full transition-all active:scale-95 shadow-lg shadow-slate-900/50">
                                Recargar
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                            {currentUser.assignedWorlds.map((world, idx) => (
                                <button
                                    key={world.id}
                                    onClick={() => {
                                        setSelectedMapId(world.id);
                                        setActiveWorld(world.id);
                                    }}
                                    className="group text-left relative bg-white/10 backdrop-blur-md border object-cover border-white/20 rounded-3xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(45,212,191,0.3)] hover:-translate-y-2 overflow-hidden flex flex-col h-full min-h-[250px]"
                                >
                                    {/* Map Card Background Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="relative z-10 flex-1 flex flex-col">
                                        <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg shadow-teal-500/30 transform group-hover:rotate-12 transition-transform">
                                            🗺️
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2 leading-tight break-words line-clamp-3">
                                            {world.title || `Mundo ${idx + 1}`}
                                        </h3>
                                        <p className="text-teal-200 font-medium text-sm mt-auto">
                                            Tema: {world.theme}
                                        </p>
                                    </div>

                                    <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-teal-300 font-bold text-sm uppercase tracking-wider group-hover:text-teal-200">
                                        <span>Entrar al Mapa</span>
                                        <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <StudentHUD
                onOpenStore={() => setShowStore(true)}
                onOpenLeaderboard={() => setShowLeaderboard(true)}
                onOpenProfile={() => setShowProfile(true)}
            />

            {/* Action Bar Superior Izquierda — debajo del HUD */}
            <div className="fixed top-16 left-6 z-30 flex gap-3">
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center w-12 h-12"
                    title="Salir de la cuenta"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Si el estudiante tiene múltiples mapas, mostrar botón para regresar al Lobby */}
                {currentUser.assignedWorlds && currentUser.assignedWorlds.length > 1 && (
                    <button
                        onClick={() => setSelectedMapId(null)}
                        className="bg-teal-600/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-teal-400 text-white hover:bg-teal-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 px-5 font-bold text-sm animate-fade-in-up"
                    >
                        🗺️ Mis Mundos
                    </button>
                )}
            </div>



            {/* AI Hints from Teacher */}
            {hints.length > 0 && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 space-y-2">
                    {hints.map(hint => (
                        <div key={hint.id} className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-amber-300 rounded-2xl p-4 shadow-xl animate-fade-in-up flex items-start gap-3">
                            <div className="bg-amber-400 text-white rounded-full p-2 shrink-0">
                                <BrainCircuit className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">💡 Pista de tu Maestro</p>
                                <p className="text-amber-900 text-sm leading-relaxed font-medium">{hint.message}</p>
                            </div>
                            <button
                                onClick={() => dismissHint(hint.id)}
                                className="text-amber-500 hover:text-amber-800 p-1 shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <AdventureMap onOpenRaid={() => setShowRaidModal(true)} />

            {showStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative shadow-2xl flex flex-col">
                        <button onClick={() => setShowStore(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition z-10">
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                        <RewardsStore onClose={() => setShowStore(false)} />
                    </div>
                </div>
            )}

            {showLeaderboard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md relative">
                        <button onClick={() => setShowLeaderboard(false)} className="absolute -top-4 -right-4 p-2 bg-white rounded-full hover:bg-slate-100 shadow-md transition z-10">
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                        <Leaderboard />
                    </div>
                </div>
            )}

            {showProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <StudentProfile onClose={() => setShowProfile(false)} />
                </div>
            )}

            <RaidBossWidget externalOpen={showRaidModal} onExternalClose={() => setShowRaidModal(false)} />
        </main>
    );
}
