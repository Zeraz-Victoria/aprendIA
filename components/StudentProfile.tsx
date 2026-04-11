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

    const getFrameStyle = (frame: string | undefined | null) => {
        if (frame === 'frame_fire') return { borderColor: '#FD7E14', boxShadow: '0 0 20px rgba(253,126,20,0.6)' };
        if (frame === 'frame_ice') return { borderColor: '#AD74C3', boxShadow: '0 0 20px rgba(173,116,195,0.6)' };
        if (frame === 'frame_lightning') return { borderColor: '#7A3A8E', boxShadow: '0 0 20px rgba(122,58,142,0.6)' };
        return { borderColor: 'rgba(255,255,255,0.3)' };
    };

    return (
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative shadow-2xl flex flex-col"
            style={{ boxShadow: '0 25px 60px rgba(82,37,102,0.2)' }}>
            
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:opacity-80 transition z-10"
                style={{ background: 'rgba(248,237,251,0.2)' }}
            >
                <X className="w-5 h-5 text-white" />
            </button>

            {/* Header */}
            <div className="p-8 text-white relative overflow-hidden shrink-0"
                style={{ background: 'linear-gradient(135deg, #522566 0%, #7A3A8E 100%)' }}>
                <div className="absolute -right-10 -bottom-10 opacity-10">
                    <Medal className="w-48 h-48" />
                </div>
                <div className="absolute top-[-20px] right-[80px] w-32 h-32 rounded-full opacity-10" style={{ background: '#AD74C3' }} />
                
                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative group">
                        <div
                            className="w-24 h-24 backdrop-blur rounded-full flex items-center justify-center text-5xl border-4 shadow-xl transition-transform group-hover:scale-105"
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                ...getFrameStyle(currentUser?.activeFrame),
                            }}
                        >
                            {isSavingAvatar ? "⏳" : (currentUser?.avatar || "🧑")}
                        </div>
                        {!isEditingAvatar && (
                            <button
                                onClick={() => setIsEditingAvatar(true)}
                                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Editar Apariencia"
                                style={{ color: '#522566' }}
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">{currentUser?.name}</h2>
                        <p className="font-medium text-lg mt-1" style={{ color: '#EADFF0' }}>Aventurero Matemático</p>
                    </div>
                </div>

                {/* Appearance Editing */}
                {isEditingAvatar && (
                    <div className="mt-8 p-4 rounded-2xl relative z-10 animate-slide-up"
                        style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm border-b pb-2 font-bold uppercase tracking-wide" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                                Elige tu nuevo estilo
                            </h3>
                            <button onClick={() => setIsEditingAvatar(false)} style={{ color: '#EADFF0' }}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Avatars */}
                        <div className="mb-4">
                            <h4 className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#EADFF0' }}>AVATARES</h4>
                            <div className="flex flex-wrap gap-2">
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
                                            className="w-12 h-12 text-2xl rounded-xl flex items-center justify-center transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={currentUser?.avatar === emoji
                                                ? { background: 'rgba(255,255,255,0.9)', transform: 'scale(1.1)', boxShadow: '0 0 0 3px rgba(255,255,255,0.5)' }
                                                : { background: 'rgba(255,255,255,0.1)' }
                                            }
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
                                <h4 className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#EADFF0' }}>MARCOS DE PERFIL</h4>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateStudentFrame(null)}
                                        className="px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                                        style={!currentUser?.activeFrame
                                            ? { background: 'white', color: '#522566' }
                                            : { background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    >
                                        Ninguno
                                    </button>

                                    {inventory[currentUser?.id || ""]?.includes('frame_fire') && (
                                        <button
                                            onClick={() => updateStudentFrame('frame_fire')}
                                            className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors border-2"
                                            style={currentUser?.activeFrame === 'frame_fire'
                                                ? { background: '#FD7E14', color: 'white', boxShadow: '0 0 12px rgba(253,126,20,0.5)', borderColor: 'white' }
                                                : { background: 'rgba(255,255,255,0.1)', color: '#FD7E14', borderColor: 'transparent' }}
                                        >
                                            🔥 Fuego
                                        </button>
                                    )}

                                    {inventory[currentUser?.id || ""]?.includes('frame_ice') && (
                                        <button
                                            onClick={() => updateStudentFrame('frame_ice')}
                                            className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors border-2"
                                            style={currentUser?.activeFrame === 'frame_ice'
                                                ? { background: '#AD74C3', color: 'white', boxShadow: '0 0 12px rgba(173,116,195,0.5)', borderColor: 'white' }
                                                : { background: 'rgba(255,255,255,0.1)', color: '#AD74C3', borderColor: 'transparent' }}
                                        >
                                            ❄️ Hielo
                                        </button>
                                    )}

                                    {inventory[currentUser?.id || ""]?.includes('frame_lightning') && (
                                        <button
                                            onClick={() => updateStudentFrame('frame_lightning')}
                                            className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors border-2"
                                            style={currentUser?.activeFrame === 'frame_lightning'
                                                ? { background: '#7A3A8E', color: 'white', boxShadow: '0 0 12px rgba(122,58,142,0.5)', borderColor: 'white' }
                                                : { background: 'rgba(255,255,255,0.1)', color: '#EADFF0', borderColor: 'transparent' }}
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto w-full" style={{ background: '#F8EDFB' }}>
                
                {/* Grades Section */}
                <div className="px-8 pt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ background: '#EADFF0' }}>
                                <Medal className="w-6 h-6" style={{ color: '#522566' }} />
                            </div>
                            <h3 className="text-xl font-bold" style={{ color: '#522566' }}>Calificaciones</h3>
                        </div>
                        <div className="px-4 py-2 rounded-2xl flex flex-col items-end"
                            style={{ background: '#EADFF0' }}>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#AD74C3' }}>Promedio Global</span>
                            <span className={`text-xl font-black ${
                                currentUser?.globalActivityAverage !== undefined && currentUser?.globalActivityAverage !== null
                                    ? (currentUser.globalActivityAverage >= 8 ? 'text-emerald-500' : currentUser.globalActivityAverage >= 6 ? 'text-amber-500' : 'text-rose-500')
                                    : ''
                            }`} style={currentUser?.globalActivityAverage === undefined || currentUser?.globalActivityAverage === null 
                                ? { color: '#AD74C3' } : {}}>
                                {currentUser?.globalActivityAverage !== undefined && currentUser?.globalActivityAverage !== null
                                    ? currentUser.globalActivityAverage.toFixed(1)
                                    : "—"}
                            </span>
                        </div>
                    </div>

                    {!currentUser?.automaticProjectGrades || currentUser.automaticProjectGrades.length === 0 ? (
                        <div className="text-center py-6 rounded-3xl border mb-6"
                            style={{ background: '#EADFF0', borderColor: 'transparent' }}>
                            <p className="text-sm" style={{ color: '#AD74C3' }}>Aún no tienes actividades calificadas.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {currentUser.automaticProjectGrades.map((pg: any, idx: number) => {
                                const worldTitle = currentUser.assignedWorlds?.find((w: any) => w.id === pg.worldId)?.title || "Proyecto";
                                return (
                                    <div key={`${pg.worldId}-${idx}`} className="bg-white border-2 p-4 rounded-2xl flex justify-between items-center shadow-sm"
                                        style={{ borderColor: '#EADFF0' }}>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-sm truncate" title={worldTitle} style={{ color: '#522566' }}>{worldTitle}</h4>
                                            <p className="text-[10px] uppercase font-black" style={{ color: '#AD74C3' }}>Automático</p>
                                        </div>
                                        <div className={`text-2xl font-black ml-3 ${
                                            pg.averageGrade >= 8 ? 'text-emerald-500' : pg.averageGrade >= 6 ? 'text-amber-500' : 'text-rose-500'
                                        }`}>
                                            {pg.averageGrade.toFixed(1)}
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
                        <div className="p-2 rounded-xl" style={{ background: '#EADFF0' }}>
                            <Medal className="w-6 h-6" style={{ color: '#7A3A8E' }} />
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: '#522566' }}>Tus Logros</h3>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 rounded-2xl w-full animate-pulse" style={{ background: '#EADFF0' }}></div>
                            ))}
                        </div>
                    ) : achievements.length > 0 ? (
                        <div className="grid gap-4">
                            {achievements.map((ach) => (
                                <div key={ach.id} className="flex items-center gap-4 bg-white border p-4 rounded-2xl hover:shadow-md transition"
                                    style={{ borderColor: '#EADFF0' }}>
                                    <div className="w-14 h-14 bg-white border rounded-full flex items-center justify-center text-3xl shadow-sm shrink-0"
                                        style={{ borderColor: '#EADFF0' }}>
                                        {ach.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg" style={{ color: '#522566' }}>{ach.name}</h4>
                                        <p className="text-sm leading-snug" style={{ color: '#7A3A8E' }}>{ach.description}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-xs font-bold mb-1" style={{ color: '#AD74C3' }}>RECOMPENSA</span>
                                        <span className="font-black px-3 py-1 rounded-full text-sm"
                                            style={{ background: '#EADFF0', color: '#522566' }}>
                                            +{ach.xpReward} XP
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 rounded-3xl border"
                            style={{ background: '#EADFF0', borderColor: 'transparent' }}>
                            <div className="text-4xl mb-4 grayscale opacity-50">🏆</div>
                            <h4 className="font-bold mb-1" style={{ color: '#522566' }}>Aún no tienes logros</h4>
                            <p className="text-sm" style={{ color: '#7A3A8E' }}>
                                Completa niveles y mantén tu racha para desbloquear premios especiales.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
