"use client";

import { useEffect, useState } from "react";
import { Medal, X, Edit3 } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";

const AVATAR_OPTIONS = ["🧑🏻", "👦🏽", "👧🏼", "👩🏻‍🎓", "👨🏽‍🎓", "🧒🏾", "👦🏻", "👧🏽", "🧑🏿", "👩🏼", "👨🏻", "🧑🏽", "👧🏻", "👦🏾", "👩🏽", "🧒🏻"];

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
    earnedAt?: string;
}

export default function StudentProfile({ onClose }: { onClose: () => void }) {
    const { currentUser, updateStudentAvatar } = useLearning();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);

    const handleAvatarSelect = async (emoji: string) => {
        if (emoji === currentUser?.avatar) {
            setIsEditingAvatar(false);
            return;
        }
        setIsSavingAvatar(true);
        await updateStudentAvatar(emoji);
        setIsSavingAvatar(false);
        setIsEditingAvatar(false);
    };

    useEffect(() => {
        if (!currentUser) return;

        fetch(`/api/gamification/achievements?studentId=${currentUser.id}`)
            .then(res => res.json())
            .then(data => {
                setAchievements(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading achievements", err);
                setLoading(false);
            });
    }, [currentUser]);

    return (
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative shadow-2xl flex flex-col">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-sky-100 rounded-full hover:bg-sky-200 transition z-10 text-sky-600"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="bg-sky-600 p-8 text-white relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10">
                    <Medal className="w-48 h-48" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative group">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-5xl border-4 border-white/30 shadow-xl transition-transform group-hover:scale-105">
                            {isSavingAvatar ? "⏳" : (currentUser?.avatar || "🧑")}
                        </div>
                        {!isEditingAvatar && (
                            <button
                                onClick={() => setIsEditingAvatar(true)}
                                className="absolute bottom-0 right-0 bg-white text-sky-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Cambiar Avatar"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold">{currentUser?.name}</h2>
                        <p className="text-sky-200 font-medium text-lg mt-1">Aventurero Matemático</p>
                    </div>
                </div>

                {/* Avatar Selection Grid */}
                {isEditingAvatar && (
                    <div className="mt-8 bg-black/10 p-4 rounded-2xl relative z-10 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm border-b pb-2 border-white/20 font-bold uppercase tracking-wide">Elige tu nuevo estilo</h3>
                            <button onClick={() => setIsEditingAvatar(false)} className="text-sky-200 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {AVATAR_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    disabled={isSavingAvatar}
                                    onClick={() => handleAvatarSelect(emoji)}
                                    className={`w-12 h-12 text-2xl rounded-xl flex items-center justify-center transition-all outline-none
                                        ${currentUser?.avatar === emoji
                                            ? 'bg-white ring-4 ring-white/50 scale-110'
                                            : 'bg-white/10 hover:bg-white/30 hover:scale-110'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Achievements Grid */}
            <div className="p-8 overflow-y-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                        <Medal className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Tus Logros</h3>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                        ))}
                    </div>
                ) : achievements.length > 0 ? (
                    <div className="grid gap-4">
                        {achievements.map((ach) => (
                            <div key={ach.id} className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl hover:shadow-md transition">
                                <div className="w-14 h-14 bg-white border border-slate-200 rounded-full flex items-center justify-center text-3xl shadow-sm">
                                    {ach.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-lg">{ach.name}</h4>
                                    <p className="text-slate-500 text-sm leading-snug">{ach.description}</p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs font-bold text-sky-400 mb-1">RECOMPENSA</span>
                                    <span className="bg-sky-100 text-sky-700 font-black px-3 py-1 rounded-full text-sm">
                                        +{ach.xpReward} XP
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="text-4xl mb-4 grayscale opacity-50">🏆</div>
                        <h4 className="text-slate-600 font-bold mb-1">Aún no tienes logros</h4>
                        <p className="text-slate-400 text-sm">Completa niveles y mantén tu racha para desbloquear premios especiales.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
