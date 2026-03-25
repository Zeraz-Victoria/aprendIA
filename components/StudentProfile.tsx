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
    const { currentUser, inventory, updateStudentAvatar, updateStudentFrame } = useLearning();
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
            <div className="bg-sky-600 p-8 text-white relative overflow-hidden shrink-0">
                <div className="absolute -right-10 -bottom-10 opacity-10">
                    <Medal className="w-48 h-48" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative group">
                        <div className={`w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-5xl border-4 shadow-xl transition-transform group-hover:scale-105
                            ${currentUser?.activeFrame === 'frame_fire' ? 'border-orange-500 shadow-orange-500/50 animate-pulse' :
                                currentUser?.activeFrame === 'frame_ice' ? 'border-cyan-300 shadow-cyan-300/50' :
                                    currentUser?.activeFrame === 'frame_lightning' ? 'border-purple-500 shadow-purple-500/50 animate-pulse' :
                                        'border-white/30'}
                        `}>
                            {isSavingAvatar ? "⏳" : (currentUser?.avatar || "🧑")}
                        </div>
                        {!isEditingAvatar && (
                            <button
                                onClick={() => setIsEditingAvatar(true)}
                                className="absolute bottom-0 right-0 bg-white text-sky-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Editar Apariencia"
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

                {/* Appearance Editing */}
                {isEditingAvatar && (
                    <div className="mt-8 bg-black/10 p-4 rounded-2xl relative z-10 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm border-b pb-2 border-white/20 font-bold uppercase tracking-wide">Elige tu nuevo estilo</h3>
                            <button onClick={() => setIsEditingAvatar(false)} className="text-sky-200 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Avatars */}
                        <div className="mb-4">
                            <h4 className="text-xs font-bold text-sky-200 mb-2">AVATARES</h4>
                            <div className="flex flex-wrap gap-2">
                                {/* Base Avatars + Store Avatars in Inventory */}
                                {(() => {
                                    const storeAvatars = [
                                        { id: "avatar_ninja", icon: "🥷" },
                                        { id: "avatar_alien", icon: "👽" },
                                        { id: "avatar_wizard", icon: "🧙‍♂️" },
                                        { id: "avatar_robot", icon: "🤖" },
                                        { id: "avatar_astronaut", icon: "👨‍🚀" }
                                    ];
                                    const ownedStoreIcons = storeAvatars
                                        .filter(sa => inventory[currentUser?.id || ""]?.includes(sa.id))
                                        .map(sa => sa.icon);

                                    const combinedAvatars = [...AVATAR_OPTIONS, ...ownedStoreIcons];

                                    return combinedAvatars.map((emoji) => (
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
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Frames */}
                        {inventory[currentUser?.id || ""]?.some(id => id.startsWith('frame_')) && (
                            <div>
                                <h4 className="text-xs font-bold text-sky-200 mb-2">MARCOS DE PERFIL</h4>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateStudentFrame(null)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${!currentUser?.activeFrame ? 'bg-white text-sky-600' : 'bg-white/10 text-white hover:bg-white/30'}`}
                                    >
                                        Ninguno
                                    </button>

                                    {inventory[currentUser?.id || ""]?.includes('frame_fire') && (
                                        <button
                                            onClick={() => updateStudentFrame('frame_fire')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors ${currentUser?.activeFrame === 'frame_fire' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50 border-2 border-white' : 'bg-white/10 text-orange-300 hover:bg-orange-500/40 border-2 border-transparent'}`}
                                        >
                                            🔥 Fuego
                                        </button>
                                    )}

                                    {inventory[currentUser?.id || ""]?.includes('frame_ice') && (
                                        <button
                                            onClick={() => updateStudentFrame('frame_ice')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors ${currentUser?.activeFrame === 'frame_ice' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 border-2 border-white' : 'bg-white/10 text-cyan-300 hover:bg-cyan-500/40 border-2 border-transparent'}`}
                                        >
                                            ❄️ Hielo
                                        </button>
                                    )}

                                    {inventory[currentUser?.id || ""]?.includes('frame_lightning') && (
                                        <button
                                            onClick={() => updateStudentFrame('frame_lightning')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors ${currentUser?.activeFrame === 'frame_lightning' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50 border-2 border-white' : 'bg-white/10 text-purple-300 hover:bg-purple-500/40 border-2 border-transparent'}`}
                                        >
                                            ⚡ Rayo
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* Scrollable Content (Grades + Achievements) */}
            <div className="flex-1 overflow-y-auto w-full">
                {/* Grades Section */}
                <div className="px-8 pt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                                <Medal className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Calificaciones</h3>
                        </div>
                        <div className="bg-slate-100 px-4 py-2 rounded-2xl flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promedio Global</span>
                            <span className="text-xl font-black text-slate-700">
                                {currentUser?.globalActivityAverage !== undefined && currentUser?.globalActivityAverage !== null 
                                    ? currentUser.globalActivityAverage.toFixed(1) 
                                    : "—"}
                            </span>
                        </div>
                    </div>

                    {!currentUser?.automaticProjectGrades || currentUser.automaticProjectGrades.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50 rounded-3xl border border-slate-100 mb-6">
                            <p className="text-slate-400 text-sm">Aún no tienes actividades calificadas.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {currentUser.automaticProjectGrades.map((pg: any, idx: number) => {
                                const worldTitle = currentUser.assignedWorlds?.find(w => w.id === pg.worldId)?.title || "Proyecto";
                                return (
                                    <div key={`${pg.worldId}-${idx}`} className="bg-white border-2 border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-700 text-sm truncate" title={worldTitle}>{worldTitle}</h4>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">Automático</p>
                                        </div>
                                        <div className="text-2xl font-black text-sky-600 ml-3">
                                            {pg.averageGrade}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Achievements Grid */}
                <div className="p-8 pb-12">
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
        </div>
    );
}
