"use client";

import React from "react";
import { Heart, Flame, Diamond, Trophy, Users, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getPusherClient } from "@/lib/pusher";
import { useLearning } from "@/contexts/LearningContext";

export default function StudentHUD({
    onOpenStore,
    onOpenLeaderboard,
    onOpenProfile,
    children
}: {
    onOpenStore?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenProfile?: () => void;
    children?: React.ReactNode;
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
                    for (const buff of data) {
                        setIncomingBuff(buff);
                        await new Promise(r => setTimeout(r, 6000));
                        setIncomingBuff(null);
                        await new Promise(r => setTimeout(r, 500));
                    }

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

        checkPendingBuffs();
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                checkPendingBuffs();
            }
        }, 60000);
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

    useEffect(() => {
        const handleOpenBuff = (e: any) => {
            if (e.detail?.studentName) {
                setCustomMessage(`¡Tú puedes lograrlo, ${e.detail.studentName}!`);
            }
            setShowBuffModal(true);
            fetchClassmates();
        };
        
        window.addEventListener('open-buff-modal', handleOpenBuff);
        return () => window.removeEventListener('open-buff-modal', handleOpenBuff);
    }, [currentUser?.id]);


    const handleSendBuff = async (targetId: string) => {
        const cost = includeHint ? 15 : 10;
        if (!currentUser?.id || stats.gems < cost) return;
        setSendingBuffTo(targetId);

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

    // Frame border color helper
    const getFrameStyle = (frame: string | undefined | null) => {
        if (frame === 'frame_fire') return { borderColor: '#FD7E14', boxShadow: '0 0 12px rgba(253,126,20,0.5)' };
        if (frame === 'frame_ice') return { borderColor: '#2e9f6c', boxShadow: '0 0 12px rgba(46, 159, 108,0.5)' };
        if (frame === 'frame_lightning') return { borderColor: '#165b3d', boxShadow: '0 0 12px rgba(22, 91, 61,0.5)' };
        return { borderColor: '#c1ebd5' };
    };

    return (
        <>
            {/* HUD Bar */}
            <div
                className="w-full px-2 md:px-4 py-1.5 md:py-2"
                style={{ background: 'rgba(10, 45, 29,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(46, 159, 108,0.2)' }}
            >
                <div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2 gap-x-2 md:gap-4">

                    {/* Left: Profile / Avatar */}
                    <div
                        className="order-1 flex items-center gap-1.5 cursor-pointer hover:opacity-90 backdrop-blur rounded-full px-3 py-1 shadow-sm border transition-all hover:scale-105 shrink-0"
                        style={{
                            background: 'rgba(240, 245, 251,0.1)',
                            ...getFrameStyle(currentUser?.activeFrame),
                        }}
                        onClick={onOpenProfile}
                    >
                        <span className="text-lg">{currentUser?.avatar || "🧑"}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm" style={{ color: '#f0fbf5' }}>{currentUser?.name}</span>
                            {currentUser?.globalActivityAverage !== undefined && currentUser?.globalActivityAverage !== null && (
                                <div className="px-2 py-0.5 rounded-lg border flex items-center gap-1"
                                    style={{ background: 'rgba(46, 159, 108,0.2)', borderColor: 'rgba(46, 159, 108,0.3)' }}>
                                    <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline" style={{ color: '#2e9f6c' }}>Grado</span>
                                    <span className="text-xs font-black text-white">{currentUser.globalActivityAverage.toFixed(1)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation Buttons (Bottom on Mobile, Center on PC) */}
                    <div className="order-3 md:order-2 w-full md:flex-1 flex flex-row items-center justify-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pt-2 md:pt-0 border-t md:border-t-0 snap-x"
                        style={{ borderColor: 'rgba(46, 159, 108,0.2)' }}>
                        {children}
                    </div>

                    {/* Right: Stats */}
                    <div className="order-2 md:order-3 ml-auto md:ml-0 flex items-center gap-3 sm:gap-4 shrink-0 px-3 py-1.5 rounded-xl border backdrop-blur"
                        style={{ background: 'rgba(240, 245, 251,0.05)', borderColor: 'rgba(46, 159, 108,0.15)' }}>

                        {/* Motivate Classmates */}
                        <div className="flex items-center gap-1 group cursor-pointer hover:scale-105 transition-transform"
                            onClick={handleOpenBuffs}>
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#2e9f6c' }} />
                        </div>

                        {/* Leaderboard */}
                        <div className="flex items-center gap-1 group cursor-pointer hover:scale-105 transition-transform"
                            onClick={onOpenLeaderboard}>
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#c1ebd5' }} />
                        </div>

                        {/* Streak */}
                        <div className="flex items-center gap-1 group cursor-pointer">
                            <Flame className={`w-4 h-4 sm:w-5 sm:h-5 ${stats.streak > 0 ? 'animate-pulse' : ''}`}
                                style={{ color: stats.streak > 0 ? '#FD7E14' : '#165b3d', fill: stats.streak > 0 ? '#FD7E14' : '#165b3d' }} />
                            <span className="font-bold text-xs sm:text-sm" style={{ color: stats.streak > 0 ? '#FD7E14' : '#2e9f6c' }}>
                                {stats.streak}
                            </span>
                        </div>

                        {/* Gems */}
                        <div
                            className="flex items-center gap-1 group cursor-pointer hover:scale-105 transition-transform px-2 py-0.5 rounded-full border"
                            onClick={onOpenStore}
                            title="Abrir Tienda"
                            style={{ background: 'rgba(10, 45, 29,0.4)', borderColor: 'rgba(46, 159, 108,0.25)' }}
                        >
                            <Diamond className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#2e9f6c', fill: '#2e9f6c' }} />
                            <span className="font-bold text-xs sm:text-sm" style={{ color: '#c1ebd5' }}>{stats.gems}</span>
                        </div>

                        {/* Lives */}
                        <div className="flex items-center gap-1 group cursor-pointer">
                            <Heart className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#ef4444', fill: '#ef4444' }} />
                            <span className="font-bold text-xs sm:text-sm" style={{ color: '#ef4444' }}>{stats.lives}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Incoming Buff Alert */}
            {incomingBuff && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce w-[90%] sm:w-auto">
                    <div className="rounded-full py-3 px-6 border-2 flex items-center gap-4"
                        style={{
                            background: 'linear-gradient(135deg, #0a2d1d, #165b3d)',
                            borderColor: '#2e9f6c',
                            boxShadow: '0 0 30px rgba(46, 159, 108,0.5)',
                        }}>
                        <span className="text-4xl">{incomingBuff.fromAvatar}</span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#c1ebd5' }}>
                                {incomingBuff.fromName} te anima:
                            </p>
                            <p className="text-white font-black text-lg">"{incomingBuff.message}"</p>
                        </div>
                        <Sparkles className="w-8 h-8 animate-spin" style={{ color: '#c1ebd5' }} />
                    </div>
                </div>
            )}

            {/* Buffs Modal */}
            {showBuffModal && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] backdrop-blur-sm cursor-auto pointer-events-auto sm:flex sm:items-start sm:justify-center sm:pt-20"
                    style={{ background: 'rgba(10, 45, 29,0.5)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowBuffModal(false); }}
                >
                    <div
                        className="absolute bottom-0 left-0 right-0 sm:relative w-full sm:max-w-lg sm:mx-auto rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
                        style={{ background: '#ffffff' }}
                    >
                        {/* Header */}
                        <div className="shrink-0 pt-3 pb-2 px-5 border-b" style={{ borderColor: '#c1ebd5' }}>
                            <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: '#c1ebd5' }} />
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#0a2d1d' }}>
                                    <Sparkles className="w-5 h-5" style={{ color: '#2e9f6c' }} /> Enviar Energía
                                </h3>
                                <button
                                    onClick={() => setShowBuffModal(false)}
                                    className="p-2 rounded-full hover:opacity-80 transition"
                                    style={{ background: '#c1ebd5' }}
                                >
                                    <X className="w-5 h-5" style={{ color: '#0a2d1d' }} />
                                </button>
                            </div>
                            {/* Message input */}
                            <div className="mt-3 flex gap-2 items-center">
                                <input
                                    type="text"
                                    placeholder="¡Tú puedes! (opcional)"
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    maxLength={40}
                                    className="flex-1 text-sm px-3 py-2 rounded-xl border outline-none transition"
                                    style={{
                                        borderColor: '#c1ebd5',
                                        background: '#f0fbf5',
                                        color: '#0a2d1d',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#2e9f6c'; }}
                                    onBlur={e => { e.target.style.borderColor = '#c1ebd5'; }}
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer mt-2 mb-1">
                                <input
                                    type="checkbox"
                                    checked={includeHint}
                                    onChange={(e) => setIncludeHint(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: '#165b3d' }}
                                />
                                <span className="text-xs font-medium" style={{ color: '#165b3d' }}>
                                    Enviar pista extra{' '}
                                    <span className="font-bold px-1.5 py-0.5 rounded-md border"
                                        style={{ color: '#0a2d1d', background: '#c1ebd5', borderColor: '#2e9f6c' }}>
                                        +5💎
                                    </span>
                                </span>
                            </label>
                        </div>

                        {/* Classmates list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-8">
                            {classmates.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl border shadow-sm"
                                    style={{ background: '#f0fbf5', borderColor: '#c1ebd5' }}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-2xl bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm border shrink-0"
                                            style={{ borderColor: '#c1ebd5' }}>
                                            {c.avatar}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm truncate" style={{ color: '#0a2d1d' }}>{c.name}</p>
                                            {c.status === "needs_help" && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                                    Necesita ayuda
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSendBuff(c.id)}
                                        disabled={stats.gems < (includeHint ? 15 : 10) || sendingBuffTo === c.id}
                                        className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 shrink-0 disabled:opacity-50"
                                        style={{ background: '#c1ebd5', color: '#0a2d1d' }}
                                    >
                                        Animar <Diamond className="w-3 h-3" style={{ fill: '#0a2d1d' }} /> {includeHint ? 15 : 10}
                                    </button>
                                </div>
                            ))}
                            {classmates.length === 0 && (
                                <div className="text-center py-8 text-sm font-medium" style={{ color: '#2e9f6c' }}>
                                    Buscando compañeros...
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
