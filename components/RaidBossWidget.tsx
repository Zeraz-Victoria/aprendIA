"use client";

import { useEffect, useState } from "react";
import { Swords, X, Activity, Trophy } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";

interface RaidBoss {
    id: string;
    name: string;
    imageUrl: string;
    maxHealth: number;
    currentHealth: number;
    status: string;
    topContributors?: { name: string; avatar: string | null; totalDamage: number }[];
}

export default function RaidBossWidget() {
    const { currentUser, setStats, stats } = useLearning();
    const [boss, setBoss] = useState<RaidBoss | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [attacking, setAttacking] = useState(false);
    const [damageAnim, setDamageAnim] = useState<number | null>(null);

    const fetchBoss = () => {
        fetch("/api/gamification/raid")
            .then(res => res.json())
            .then(data => {
                if (data && data.status === "ACTIVE") setBoss(data);
                else setBoss(null);
            })
            .catch(err => console.error("Error fetching raid boss:", err));
    };

    useEffect(() => {
        fetchBoss();
        const interval = setInterval(fetchBoss, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleAttack = async () => {
        if (!boss || !currentUser || stats.gems < 5) return;
        setAttacking(true);

        // Deduct gems locally immediately
        setStats(prev => ({ ...prev, gems: Math.max(0, prev.gems - 5) }));

        const randomDamage = Math.floor(Math.random() * 50) + 50;

        try {
            const res = await fetch("/api/gamification/raid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: currentUser.id, damage: randomDamage })
            });
            const data = await res.json();

            setDamageAnim(randomDamage);
            setTimeout(() => setDamageAnim(null), 1000);

            if (data.currentHealth !== undefined) {
                setBoss(prev => prev ? { ...prev, currentHealth: data.currentHealth } : null);
            }
        } catch (error) {
            console.error("Attack failed", error);
        } finally {
            setAttacking(false);
            fetchBoss();
        }
    };

    if (!boss) return null;

    const healthPercent = Math.max(0, (boss.currentHealth / boss.maxHealth) * 100);

    return (
        <>
            {/* Floating Widget Icon */}
            {!showModal && (
                <div
                    className="fixed bottom-6 right-6 z-40 bg-red-600 border-4 border-red-800 rounded-full w-20 h-20 shadow-[0_0_20px_rgba(220,38,38,0.5)] cursor-pointer hover:scale-110 hover:rotate-3 transition-transform flex items-center justify-center animate-bounce"
                    onClick={() => setShowModal(true)}
                >
                    <span className="text-4xl absolute z-10">{boss.imageUrl}</span>
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-red-900 text-xs font-black px-2 py-1 rounded-full border-2 border-red-800 shadow-md transform rotate-12">
                        RAID!
                    </div>
                    <div className="absolute inset-1 rounded-full border-[6px] border-red-900/40"></div>
                </div>
            )}

            {/* Raid Boss Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-gradient-to-br from-red-900 to-slate-900 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl border-4 border-red-950 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition z-10 text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-8 pb-4 text-center relative">
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2 uppercase tracking-widest">
                                JEFÉ DE INCURSIÓN
                            </h2>
                            <p className="text-red-200 text-sm font-medium mb-6">¡Todos los alumnos atacan juntos para derrotarlo!</p>

                            {/* Boss Avatar Area */}
                            <div className="relative w-40 h-40 mx-auto mb-6">
                                <div className={`absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-50 ${attacking ? 'animate-pulse scale-110' : ''}`}></div>
                                <div className={`w-full h-full bg-slate-800 border-4 border-slate-700 rounded-full flex items-center justify-center text-7xl relative z-10 shadow-2xl transition-transform ${attacking ? 'scale-90 rotate-6' : ''}`}>
                                    {boss.imageUrl}
                                </div>
                                {damageAnim && (
                                    <div className="absolute -top-10 -right-10 text-4xl font-black text-yellow-400 z-20 animate-ping">
                                        -{damageAnim}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-4">{boss.name}</h3>

                            {/* Health Bar */}
                            <div className="bg-slate-800 rounded-full h-8 w-full border-2 border-slate-900 relative overflow-hidden shadow-inner mb-2">
                                <div
                                    className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500 ease-out"
                                    style={{ width: `${healthPercent}%` }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm drop-shadow-md">
                                    {boss.currentHealth.toLocaleString()} / {boss.maxHealth.toLocaleString()}
                                </div>
                            </div>
                            <p className="text-slate-400 text-xs text-right font-medium">Salud del Jefe</p>
                        </div>

                        {/* Top Contributors */}
                        {boss.topContributors && boss.topContributors.length > 0 && (
                            <div className="px-8 pb-4">
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                    <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Trophy className="w-3 h-3" /> Top Atacantes del Grupo
                                    </h4>
                                    <div className="space-y-1">
                                        {boss.topContributors.map((c, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                <span className="text-yellow-400 font-bold w-4">{i + 1}.</span>
                                                <span className="text-lg">{c.avatar || '👤'}</span>
                                                <span className="text-white font-medium flex-1 truncate">{c.name}</span>
                                                <span className="text-orange-400 font-bold text-xs">{c.totalDamage.toLocaleString()} dmg</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-6 bg-black/30 border-t border-white/5">
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={handleAttack}
                                    disabled={attacking || stats.gems < 5 || boss.currentHealth <= 0}
                                    className="w-full relative group bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black text-xl py-4 rounded-2xl shadow-[0_8px_0_rgba(153,27,27,1)] active:shadow-[0_2px_0_rgba(153,27,27,1)] active:translate-y-2 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden"
                                >
                                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                                    <Swords className="w-6 h-6" />
                                    {boss.currentHealth <= 0 ? "¡DERROTADO!" : "¡ATACAR!"}
                                </button>

                                <p className="mt-4 text-slate-300 font-medium flex items-center gap-1">
                                    Costo: <span className="font-bold text-blue-400">5</span> <span className="text-xl">💎</span>
                                </p>
                                {stats.gems < 5 && boss.currentHealth > 0 && (
                                    <p className="text-red-400 text-xs mt-1 font-bold">No tienes suficientes gemas.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
