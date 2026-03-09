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
    const [customMessage, setCustomMessage] = useState("");
    const [includeHint, setIncludeHint] = useState(false);

    useEffect(() => {
        if (!currentUser?.id) return;

        const checkPendingBuffs = async () => {
            try {
                const res = await fetch(`/api/gamification/buffs/pending?studentId=${currentUser.id}&t=${Date.now()}`, {
                    cache: 'no-store'
                });
                const data = await res.json();

                if (data && data.length > 0) {
                    // Show the first unread buff
                    setIncomingBuff(data[0]);
                    setTimeout(() => setIncomingBuff(null), 6000);

                    // Mark them all as read to prevent showing them again immediately
                    await fetch('/api/gamification/buffs/pending', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ buffIds: data.map((b: any) => b.id) })
                    });
                }
            } catch (e) {
                console.error("Failed to check pending buffs", e);
            }
        };

        checkPendingBuffs(); // Check immediately on mount
        const interval = setInterval(checkPendingBuffs, 8000); // And then every 8 seconds
        return () => clearInterval(interval);
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
        const cost = includeHint ? 15 : 10;
        if (!currentUser?.id || stats.gems < cost) return;
        setSendingBuffTo(targetId);

        // Optimistic UI update
        setStats(prev => ({ ...prev, gems: Math.max(0, prev.gems - cost) }));

        try {
            await fetch('/api/gamification/buffs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: currentUser.id,
                    targetId,
                    buffMessage: customMessage.trim() || '¡Tú puedes lograrlo!',
                    includeHint
                })
            });
            setShowBuffModal(false);
            setCustomMessage("");
            setIncludeHint(false);
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
                        className={`flex items-center gap-2 pointer-events-auto bg-slate-800/80 cursor-pointer hover:bg-slate-700/90 backdrop-blur rounded-full px-3 py-1 shadow-md border transition-all hover:scale-105
                            ${currentUser?.activeFrame === 'frame_fire' ? 'border-orange-500 shadow-orange-500/50 animate-pulse' :
                                currentUser?.activeFrame === 'frame_ice' ? 'border-cyan-400 shadow-cyan-400/50' :
                                    'border-slate-600'}
                        `}
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
                            <Flame className={`w-5 h-5 sm:w-6 sm:h-6 ${stats.streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-400 fill-slate-400'}`} />
                            <span className={`font-bold text-sm sm:text-base ${stats.streak > 0 ? 'text-orange-500' : 'text-slate-400'}`}>{stats.streak}</span>
                        </div>

                        {/* Gems */}
                        <div
                            className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform bg-black/20 px-2 py-0.5 rounded-full"
                            onClick={onOpenStore}
                            title="Abrir Tienda"
                        >
                            <Diamond className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 fill-blue-400 group-hover:fill-blue-500" />
                            <span className="font-bold text-blue-500 text-sm sm:text-base group-hover:text-blue-400 transition-colors">{stats.gems}</span>
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
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce w-[90%] sm:w-auto">
                    <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-full py-3 px-6 shadow-[0_0_30px_rgba(147,51,234,0.5)] border-2 border-cyan-400 flex items-center gap-4">
                        <span className="text-4xl">{incomingBuff.fromAvatar}</span>
                        <div>
                            <p className="text-cyan-100 text-xs font-bold uppercase tracking-wider">{incomingBuff.fromName} te anima:</p>
                            <p className="text-white font-black text-lg">"{incomingBuff.message}"</p>
                        </div>
                        <Sparkles className="w-8 h-8 text-yellow-400 animate-spin" />
                    </div>
                </div>
            )}

            {/* Buffs Modal */}
            {showBuffModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 cursor-auto pointer-events-auto"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowBuffModal(false); }}
                >
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col relative shadow-2xl overflow-hidden">
                        {/* Sticky Header */}
                        <div className="p-5 pb-3 border-b border-slate-100 shrink-0">
                            <button
                                onClick={() => setShowBuffModal(false)}
                                className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition z-10"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-cyan-500 text-xl" /> Enviar Energía
                            </h3>
                            <p className="text-slate-500 text-sm">Usa tus gemas para animar a tus compañeros de clase.</p>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-5 pt-3 space-y-4">
                            <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 mb-1 block">Mensaje (opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="¡Tú puedes lograrlo!"
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        maxLength={40}
                                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={includeHint}
                                        onChange={(e) => setIncludeHint(e.target.checked)}
                                        className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700 select-none group-hover:text-slate-900 transition-colors">
                                        Enviar una pista extra <span className="text-blue-500 font-bold ml-1 text-xs bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">+5 Gemas</span>
                                    </span>
                                </label>
                            </div>

                            <div className="space-y-3">
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
                                            disabled={stats.gems < (includeHint ? 15 : 10) || sendingBuffTo === c.id}
                                            className="bg-cyan-100 hover:bg-cyan-200 text-slate-700 disabled:opacity-50 px-3 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-transform active:scale-95 shrink-0 min-w-[70px]"
                                        >
                                            <span>Animar</span>
                                            <span className="text-[10px] flex items-center gap-1 opacity-80">
                                                <Diamond className="w-3 h-3 fill-slate-700" /> {includeHint ? 15 : 10}
                                            </span>
                                        </button>
                                    </div>
                                ))}
                                {classmates.length === 0 && (
                                    <div className="text-center text-slate-400 py-4 text-sm font-medium">Buscando compañeros...</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
