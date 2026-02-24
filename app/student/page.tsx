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
    const { currentUser } = useLearning();
    const { status } = useSession();
    const router = useRouter();
    const [showStore, setShowStore] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [hints, setHints] = useState<HintData[]>([]);

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

    // Consistent loading for SSR + client
    if (!mounted || status === "loading" || !currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 flex items-center justify-center">
                <div className="animate-pulse text-teal-600 font-bold text-xl">Cargando tu aventura...</div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50">
            <StudentHUD
                onOpenStore={() => setShowStore(true)}
                onOpenLeaderboard={() => setShowLeaderboard(true)}
                onOpenProfile={() => setShowProfile(true)}
            />
            <div className="fixed top-24 left-4 z-40">
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="bg-white/80 backdrop-blur p-2 rounded-full shadow-lg border border-teal-100 text-teal-700 hover:bg-teal-50 hover:text-teal-900 transition-all flex items-center gap-2 px-4 font-bold text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Salir
                </button>
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

            <AdventureMap />

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

            <RaidBossWidget />
        </main>
    );
}
