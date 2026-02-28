"use client";

import React from "react";
import { Heart, Flame, Diamond, Trophy, Users, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher";
import { useLearning } from "@/contexts/LearningContext";

export default function StudentHUD({
    onOpenStore,
    onOpenLeaderboard,
    onOpenProfile
}: {
    onOpenStore?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenProfile?: () => void;
}) {
    const { stats, currentUser, setStats } = useLearning();
    const [showBuffModal, setShowBuffModal] = useState(false);
    const [classmates, setClassmates] = useState<any[]>([]);
    const [incomingBuff, setIncomingBuff] = useState<any | null>(null);
    const [sendingBuffTo, setSendingBuffTo] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.id) return;
        const pusher = getPusherClient();
        const channel = pusher.subscribe('student-' + currentUser.id);

        channel.bind('receive-buff', (data: any) => {
            setIncomingBuff(data);
            setTimeout(() => setIncomingBuff(null), 6000);
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
        };
    }, [currentUser?.id]);

    const fetchClassmates = async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/gamification/buffs?studentId=${currentUser.id}`);
            const data = await res.json();
            setClassmates(data || []);
        } catch (e) {
            console.error("Failed to fetch classmates", e);
        }
    };

    const handleSendBuff = async (targetId: string) => {
        if (!currentUser?.id || stats.gems < 10) return;
        setSendingBuffTo(targetId);

        // Optimistic UI update
        setStats(prev => ({ ...prev, gems: Math.max(0, prev.gems - 10) }));

        try {
            await fetch('/api/gamification/buffs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: currentUser.id, targetId, buffMessage: '¡Tú puedes lograrlo!' })
            });
            setShowBuffModal(false);
        } catch (e) {
            console.error("Failed to send buff", e);
        } finally {
            setSendingBuffTo(null);
        }
    };

    const handleOpenBuffs = () => {
        setShowBuffModal(true);
        fetchClassmates();
    };

    return (
        <>
            <div className="fixed top-0 left-0 w-full z-40 px-4 py-3 pointer-events-none">
                <div className="max-w-4xl mx-auto flex items-center justify-between">

                    {/* Left: Profile / Avatar */}
                    <div
                        className="flex items-center gap-2 pointer-events-auto bg-slate-800/80 cursor-pointer hover:bg-slate-700/90 backdrop-blur rounded-full px-3 py-1 shadow-md border border-slate-600 transition-all hover:scale-105"
                        onClick={onOpenProfile}
                    >
                        <span className="text-xl">{currentUser?.avatar || "🧑"}</span>
                        <span className="font-bold text-slate-200 text-sm hidden sm:inline">{currentUser?.name}</span>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex items-center gap-3 sm:gap-6 pointer-events-auto">

                        {/* Motivate Classmates */}
                        <div
                            className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform"
                            onClick={handleOpenBuffs}
                        >
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500 fill-cyan-400 group-hover:fill-cyan-500" />
                        </div>

                        {/* Leaderboard */}
                        <div
                            className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform"
                            onClick={onOpenLeaderboard}
                        >
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 fill-amber-400 group-hover:fill-amber-500" />
                        </div>

                        {/* Streak */}
                        <div className="flex items-center gap-1 sm:gap-2 group cursor-pointer">
                            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 fill-orange-500 animate-pulse" />
                            <span className="font-bold text-orange-500 text-sm sm:text-base">{stats.streak}</span>
                        </div>

                        {/* Gems */}
                        <div
                            className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform"
                            onClick={onOpenStore}
                        >
                            <Diamond className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 fill-blue-400 group-hover:fill-blue-500" />
                            <span className="font-bold text-blue-500 text-sm sm:text-base">{stats.gems}</span>
                        </div>

                        {/* Lives */}
                        <div className="flex items-center gap-1 sm:gap-2 group cursor-pointer">
                            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 fill-red-500" />
                            <span className="font-bold text-red-500 text-sm sm:text-base">{stats.lives}</span>
                        </div>

                    </div>

                </div>
            </div>

            {/* Incoming Buff Alert */}
            {incomingBuff && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in w-[90%] sm:w-auto">
                    <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-full py-3 px-6 shadow-[0_0_30px_rgba(147,51,234,0.5)] border-2 border-cyan-400 flex items-center gap-4">
                        <span className="text-4xl">{incomingBuff.fromAvatar}</span>
                        <div>
                            <p className="text-cyan-100 text-xs font-bold uppercase tracking-wider">{incomingBuff.fromName} te anima:</p>
                            <p className="text-white font-black text-lg">"{incomingBuff.message}"</p>
                        </div>
                        <Sparkles className="w-8 h-8 text-yellow-400 animate-spin-slow" />
                    </div>
                </div>
            )}

            {/* Buffs Modal */}
            {showBuffModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-auto pointer-events-auto">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative shadow-2xl">
                        <button
                            onClick={() => setShowBuffModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-cyan-500 text-xl" /> Enviar Energía
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">Usa tus gemas para animar a tus compañeros de clase.</p>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {classmates.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                                            {c.avatar}
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{c.name}</p>
                                            {c.status === "needs_help" && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Necesita ayuda</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSendBuff(c.id)}
                                        disabled={stats.gems < 10 || sendingBuffTo === c.id}
                                        className="bg-cyan-100 hover:bg-cyan-200 text-slate-700 disabled:opacity-50 px-3 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-transform active:scale-95"
                                    >
                                        <span>Animar</span>
                                        <span className="text-[10px] flex items-center gap-1 opacity-80"><Diamond className="w-3 h-3 fill-slate-700" /> 10</span>
                                    </button>
                                </div>
                            ))}
                            {classmates.length === 0 && (
                                <div className="text-center text-slate-400 py-4 text-sm font-medium">Buscando compañeros...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
