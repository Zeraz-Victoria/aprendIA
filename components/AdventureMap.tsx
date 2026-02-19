"use client";

import React, { useState } from "react";
import { Lock, Check, Star, MapPin } from "lucide-react";
import NotebookUploader from "./NotebookUploader";

type LevelStatus = "locked" | "active" | "completed";

interface Level {
    id: number;
    x: number;
    y: number;
    status: LevelStatus;
    label: string;
}

const levels: Level[] = [
    { id: 1, x: 20, y: 80, status: "completed", label: "Día 1" },
    { id: 2, x: 45, y: 70, status: "completed", label: "Día 2" },
    { id: 3, x: 30, y: 50, status: "active", label: "Día 3" },
    { id: 4, x: 60, y: 40, status: "locked", label: "Día 4" },
    { id: 5, x: 80, y: 20, status: "locked", label: "Jefe Final" },
];

export default function AdventureMap() {
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [showUploader, setShowUploader] = useState(false);

    const handleLevelClick = (level: Level) => {
        if (level.status === "locked") return;
        setSelectedLevel(level);
        if (level.status === "active") {
            setShowUploader(true);
        }
    };

    const handleLevelComplete = (success: boolean) => {
        if (success) {
            // Logic to unlock next level would go here
            // For prototype: just close uploader
            setShowUploader(false);
            // You might want to update local state to show completion
        }
    };

    return (
        <div className="relative w-full h-screen bg-[#fdf6e3] overflow-hidden flex items-center justify-center">
            {/* Background Texture mock */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] pointer-events-none"></div>

            {/* Map Container - Maintaining aspect ratio or full screen */}
            <div className="relative w-full max-w-4xl aspect-[4/3] bg-amber-50 rounded-3xl shadow-inner border-8 border-amber-900/20 p-8 overflow-hidden">

                {/* SVG Path connecting nodes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <path
                        d="M 20% 80% Q 45% 90% 45% 70% T 30% 50% T 60% 40% T 80% 20%"
                        fill="none"
                        stroke="#e2bc7d"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray="20,10"
                    />
                    {/* Progress Path (masked for prototype simplicity, just duplicating the path) */}
                    <path
                        d="M 20% 80% Q 45% 90% 45% 70% T 30% 50%"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                </svg>

                {/* Level Nodes */}
                {levels.map((level) => (
                    <div
                        key={level.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 z-10 flex flex-col items-center`}
                        style={{ left: `${level.x}%`, top: `${level.y}%` }}
                        onClick={() => handleLevelClick(level)}
                    >
                        <div
                            className={`
                w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 
                ${level.status === 'locked' ? 'bg-slate-300 border-slate-400 text-slate-500' : ''}
                ${level.status === 'active' ? 'bg-indigo-500 border-white text-white animate-bounce-slow shadow-indigo-500/50' : ''}
                ${level.status === 'completed' ? 'bg-green-500 border-white text-white' : ''}
              `}
                        >
                            {level.status === 'locked' && <Lock className="w-6 h-6" />}
                            {level.status === 'active' && <MapPin className="w-8 h-8" />}
                            {level.status === 'completed' && <Check className="w-8 h-8" />}
                        </div>

                        <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${level.status === 'locked' ? 'bg-slate-200 text-slate-500' : 'bg-white text-slate-800'}`}>
                            {level.label}
                        </div>

                        {/* Stars for completed levels */}
                        {level.status === 'completed' && (
                            <div className="absolute -top-2 -right-2 text-yellow-500 drop-shadow-sm">
                                <Star className="w-6 h-6 fill-current" />
                            </div>
                        )}
                    </div>
                ))}

                {/* Decorative Elements */}
                <div className="absolute top-5 left-5 text-amber-900/30">
                    <h1 className="text-4xl font-black font-serif tracking-tight">MAPA DE MISIONES</h1>
                </div>

            </div>

            {/* Uploader Modal */}
            {showUploader && (
                <NotebookUploader
                    onComplete={(success) => handleLevelComplete(success)}
                    onClose={() => setShowUploader(false)}
                />
            )}
        </div>
    );
}
