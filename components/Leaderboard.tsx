"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Flame } from "lucide-react";

interface LeaderboardEntry {
    id: string;
    name: string;
    avatar: string;
    activeFrame?: string | null;
    xp: number;
    streak: number;
}

export default function Leaderboard() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/gamification/leaderboard')
            .then(res => res.json())
            .then(data => {
                setLeaders(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading leaderboard", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="animate-pulse bg-white/50 h-32 rounded-3xl w-full"></div>;
    }

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-[#cbe0f6] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                    <Trophy className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#1c3a60]">Salón de la Fama</h2>
                    <p className="text-sm text-[#73a4db] font-medium">Top Alumnos por Experiencia</p>
                </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {leaders.map((student, index) => (
                    <div
                        key={student.id}
                        className={`flex items-center p-3 rounded-2xl border transition-all ${index === 0 ? "bg-amber-50 border-amber-200" :
                            index === 1 ? "bg-[#f0f5fb] border-[#cbe0f6]" :
                                index === 2 ? "bg-orange-50 border-orange-200" :
                                    "border-transparent hover:bg-[#f0f5fb]"
                            }`}
                    >
                        <div className="w-8 text-center font-bold text-[#73a4db] mr-2">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                        </div>

                        <div className={`w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-xl mr-3 border 
                            ${student.activeFrame === 'frame_fire' ? 'border-orange-500 shadow-orange-500/50' :
                                student.activeFrame === 'frame_ice' ? 'border-cyan-300 shadow-cyan-300/50' :
                                    student.activeFrame === 'frame_lightning' ? 'border-purple-500 shadow-purple-500/50' :
                                        'border-[#cbe0f6]'}
                        `}>
                            {student.avatar || "🧑"}
                        </div>

                        <div className="flex-1">
                            <h3 className={`font-bold ${index < 3 ? 'text-[#1c3a60]' : 'text-[#346297]'}`}>
                                {student.name}
                            </h3>
                            {student.streak >= 3 && (
                                <div className="flex items-center text-xs text-orange-500 font-bold">
                                    <Flame className="w-3 h-3 mr-1" /> Racha de {student.streak}
                                </div>
                            )}
                        </div>

                        <div className="text-right">
                            <span className="font-black text-[#1c3a60] font-mono text-lg">{student.xp}</span>
                            <span className="text-xs text-[#73a4db] ml-1 font-bold">XP</span>
                        </div>
                    </div>
                ))}

                {leaders.length === 0 && (
                    <div className="text-center p-6 text-[#73a4db] italic">
                        Aún no hay aventureros en la tabla.
                    </div>
                )}
            </div>
        </div>
    );
}
