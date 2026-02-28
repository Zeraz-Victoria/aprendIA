"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Lock, Check, Star, MapPin, AlertCircle } from "lucide-react";
import NotebookUploader from "./NotebookUploader";
import InteractiveLessonCard from "./InteractiveLessonCard";
import BossFightCamera from "./BossFightCamera";
import MapCompletionReport from "./MapCompletionReport";
import { DayContent, BossDayContent } from "@/types/learning-world";
import { useLearning } from "@/contexts/LearningContext";

type LevelStatus = "locked" | "active" | "completed";

interface Level {
    id: number;
    x: number;
    y: number;
    status: LevelStatus;
    label: string;
    type: string;
    isGenerating?: boolean;
    isStudentMission?: boolean;
}

export default function AdventureMap({ onOpenRaid }: { onOpenRaid?: () => void }) {
    const { worlds, activeWorldId, setActiveWorld, progress, currentUser, markLevelComplete, stats } = useLearning();
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [showLesson, setShowLesson] = useState(false);
    const [showBoss, setShowBoss] = useState(false);
    const [showUploader, setShowUploader] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [studentMissions, setStudentMissions] = useState<any[]>([]);

    // Derive active world
    const world = worlds.find(w => w.id === activeWorldId);

    // Move all hooks to the top before any early returns to obey Rules of Hooks
    const studentProgress = currentUser && activeWorldId ? progress[currentUser.id]?.[activeWorldId] || [] : [];
    const highestCompleted = studentProgress.length > 0 ? Math.max(...studentProgress) : 0;

    // Fetch per-student missions
    const fetchStudentMissions = useCallback(async () => {
        if (!currentUser?.id || !activeWorldId) return;
        try {
            const res = await fetch(`/api/student-missions?studentId=${currentUser.id}&worldId=${activeWorldId}`);
            if (res.ok) {
                const data = await res.json();
                setStudentMissions(data.days || []);
            }
        } catch (e) {
            console.error("Failed to fetch student missions:", e);
        }
    }, [currentUser?.id, activeWorldId]);

    useEffect(() => {
        fetchStudentMissions();
    }, [fetchStudentMissions]);

    // Merge shared world days with per-student missions
    const mergedDays = React.useMemo(() => {
        if (!world) return [];
        let allDays = [...world.days];

        // Group student missions by insertAfterDay
        for (const mission of studentMissions) {
            const insertAfter = mission.insertAfterDay || allDays.length;
            const targetIndex = allDays.findIndex(d => d.dayNumber === insertAfter);
            const insertIndex = targetIndex !== -1 ? targetIndex + 1 : allDays.length;
            allDays.splice(insertIndex, 0, {
                ...mission,
                isStudentMission: true
            });
        }

        // Re-sequence day numbers
        // Also deduplicate boss_fight: keep only the FIRST one
        let seenBoss = false;
        allDays = allDays.filter(d => {
            if (d.type === 'boss_fight') {
                if (seenBoss) return false; // skip duplicate boss
                seenBoss = true;
            }
            return true;
        });
        allDays = allDays.map((d, i) => ({ ...d, dayNumber: i + 1 }));
        return allDays;
    }, [world, studentMissions]);

    const numLevels = mergedDays.length;
    const dynamicCoords = React.useMemo(() => {
        if (numLevels === 0) return [];
        return Array.from({ length: numLevels }, (_, i) => {
            if (numLevels === 1) return { x: 50, y: 50 };
            const progressRatio = i / (numLevels - 1);
            // From top (15%) to bottom (95%) — compact banner leaves more space
            const y = 15 + (progressRatio * 80);
            const x = 50 + Math.sin(i * 1.5) * 35; // Sine wave
            return { x, y };
        });
    }, [numLevels]);

    // If no world is generated yet, show empty state
    // If no world is selected yet, let the parent component (student lobby) handle it
    if (!world) {
        return null;
    }

    const levels: Level[] = mergedDays.map((day, index) => {
        const isCompleted = studentProgress.includes(day.dayNumber);
        const isActive = !isCompleted && day.dayNumber === highestCompleted + 1;

        let status: LevelStatus = "locked";
        if (isCompleted) status = "completed";
        else if (isActive) status = "active";

        const coords = dynamicCoords[index] || { x: 50, y: 50 }; // fallback coords

        return {
            id: day.dayNumber,
            x: coords.x,
            y: coords.y,
            status,
            label: (day as any).isStudentMission
                ? `Repaso ${day.dayNumber}`
                : (day.type === 'boss_fight' ? 'Jefe Final' : `Día ${day.dayNumber}`),
            type: (day as any).isStudentMission ? 'guided_practice' : (day.type || 'concept_story'),
            isGenerating: (day as any).isGenerating,
            isStudentMission: (day as any).isStudentMission || false
        };
    });

    const generatePathData = (coords: { x: number, y: number }[]) => {
        if (coords.length < 2) return "";
        let path = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            const prev = coords[i - 1];
            const curr = coords[i];
            const midY = (prev.y + curr.y) / 2;
            path += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
        }
        return path;
    };

    const handleLevelClick = (level: Level) => {
        if (level.status === "locked") {
            alert("🔒 Debes aprobar el nivel anterior para desbloquear este nivel.");
            return;
        }
        if (level.isGenerating) {
            alert("🪄 La IA está tejiendo la historia de este nivel. ¡Espera un segundito!");
            return;
        }

        setSelectedLevel(level);

        // Find content for this level from Context
        const levelContent = world.days.find(d => d.dayNumber === level.id);

        if (!levelContent) return;

        // ALL nodes now go through the InteractiveLessonCard first for pedagogical flow
        setShowLesson(true);
    };

    const handleLessonComplete = () => {
        setShowLesson(false);

        if (selectedLevel?.type === 'boss_fight') {
            setShowBoss(true);
        } else {
            // Both guided_practice and concept_story require evidence now!
            setShowUploader(true);
        }
    };

    const handleUploadComplete = (success: boolean) => {
        if (success) {
            setShowUploader(false);
            if (currentUser && activeWorldId && selectedLevel) {
                markLevelComplete(currentUser.id, activeWorldId, selectedLevel.id, selectedLevel.type === 'boss_fight');
            }
        }
    };

    const handleBossComplete = (success: boolean) => {
        if (success) {
            setShowBoss(false);
            if (currentUser && activeWorldId && selectedLevel) {
                markLevelComplete(currentUser.id, activeWorldId, selectedLevel.id, true);
            }
            // Show the completion report instead of just closing
            setShowReport(true);
        }
    };

    // Helper to get content safely
    const getDayContent = (dayNumber: number) => {
        return world.days.find(d => d.dayNumber === dayNumber) as DayContent;
    };

    const getBossContent = () => {
        return world.days.find(d => d.dayNumber === selectedLevel?.id) as BossDayContent;
    };

    return (
        <div className="relative w-full min-h-screen bg-slate-900 overflow-y-auto flex flex-col items-center py-16 px-4 md:px-8">
            {/* Background Texture mock */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none fixed"></div>

            {/* Map Container - Dynamic Vertical Height based on nodes */}
            <div
                className="relative w-full max-w-4xl bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-700/50 overflow-hidden shrink-0"
                style={{ minHeight: `${Math.max(600, numLevels * 160)}px` }}
            >
                {/* World Title Banner — Compact */}
                <div className="absolute top-0 left-0 w-full z-20 pointer-events-none p-3">
                    <div className="max-w-sm mx-auto bg-slate-900/80 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-xl border border-slate-700 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-slate-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">{world.theme}</span>
                            </div>
                            <h1 className="text-sm font-bold text-slate-100 leading-tight truncate">{world.title}</h1>
                        </div>
                    </div>
                </div>

                {/* SVG Path connecting nodes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {dynamicCoords.length > 1 && (
                        <>
                            <path
                                d={generatePathData(dynamicCoords)}
                                fill="none"
                                stroke="#334155" // slate-700
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray="6,6"
                                vectorEffect="non-scaling-stroke"
                            />
                            {/* Progress Path (could be masked in advanced version, just simple dash for now) */}
                            <path
                                d={generatePathData(dynamicCoords.slice(0, highestCompleted + 1))}
                                fill="none"
                                stroke="#818cf8" // teal-400
                                strokeWidth="4"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                                className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                            />
                        </>
                    )}
                </svg>

                {/* Level Nodes */}
                {levels.map((level) => (
                    <div
                        key={level.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform z-10 flex flex-col items-center ${level.status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                        style={{ left: `${level.x}%`, top: `${level.y}%` }}
                        onClick={() => handleLevelClick(level)}
                    >
                        <div
                            className={`
                w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 transition-all duration-300
                ${level.status === 'locked' ? 'bg-slate-800 border-slate-700 text-slate-500' : ''}
                ${level.status === 'active' && level.type === 'guided_practice' ? 'bg-teal-600 border-white text-white animate-pulse shadow-[0_0_20px_rgba(79,70,229,0.5)]' : ''}
                ${level.status === 'active' && level.type !== 'guided_practice' ? 'bg-blue-600 border-white text-white animate-pulse shadow-[0_0_20px_rgba(37,99,235,0.5)]' : ''}
                ${level.status === 'completed' ? 'bg-emerald-500 border-emerald-300 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}
              `}
                        >
                            {level.status === 'locked' && <Lock className="w-6 h-6" />}
                            {level.status !== 'locked' && level.type === 'guided_practice' && !level.isGenerating && <div className="text-2xl">🎯</div>}
                            {level.label === 'Jefe Final' && level.status !== 'locked' && !level.isGenerating && <div className="text-2xl">👹</div>}
                            {level.status === 'active' && !level.isGenerating && level.label !== 'Jefe Final' && level.type !== 'guided_practice' && (
                                <div className="text-4xl animate-bounce drop-shadow-lg z-20 absolute -top-4">
                                    {currentUser?.avatar || "🧑"}
                                </div>
                            )}
                            {level.status === 'completed' && <Check className="w-8 h-8" />}
                            {level.isGenerating && (
                                <svg className="animate-spin w-8 h-8 text-teal-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                        </div>

                        <div className={`mt-3 px-4 py-1.5 rounded-full text-xs font-bold shadow-md tracking-wide ${level.status === 'locked' ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-700 text-slate-200 border border-slate-600'}`}>
                            {level.isGenerating ? 'Generando...' : level.label}
                        </div>

                        {/* Stars for completed levels */}
                        {level.status === 'completed' && (
                            <div className="absolute -top-2 -right-2 text-yellow-500 drop-shadow-sm">
                                <Star className="w-6 h-6 fill-current" />
                            </div>
                        )}
                    </div>
                ))}

            </div>

            {/* Modals sequence */}
            {showLesson && selectedLevel && (
                <InteractiveLessonCard
                    data={getDayContent(selectedLevel.id)}
                    studentName={currentUser?.name?.split(' ')[0] || "Aventurero"}
                    studentId={currentUser?.id}
                    worldId={activeWorldId || undefined}
                    levelId={selectedLevel.id}
                    onComplete={handleLessonComplete}
                    onClose={() => setShowLesson(false)}
                />
            )}

            {showUploader && selectedLevel && (
                <NotebookUploader
                    context={JSON.stringify(getDayContent(selectedLevel.id))}
                    narrative={getDayContent(selectedLevel.id)?.narrative}
                    studentName={currentUser?.name?.split(' ')[0] || "Aventurero"}
                    studentId={currentUser?.id}
                    worldId={activeWorldId || undefined}
                    levelId={selectedLevel.id}
                    onComplete={(success) => handleUploadComplete(success)}
                    onClose={() => setShowUploader(false)}
                />
            )}

            {showBoss && (
                <BossFightCamera
                    data={getBossContent()}
                    studentName={currentUser?.name?.split(' ')[0] || "Aventurero"}
                    studentId={currentUser?.id}
                    worldId={activeWorldId || undefined}
                    levelId={selectedLevel?.id}
                    onComplete={(success) => handleBossComplete(success)}
                    onClose={() => setShowBoss(false)}
                />
            )}

            {showReport && world && (
                <MapCompletionReport
                    worldTitle={world.title || "Mapa"}
                    worldTheme={world.theme || "General"}
                    totalDays={mergedDays.length}
                    studentName={currentUser?.name?.split(' ')[0] || "Aventurero"}
                    studentId={currentUser?.id}
                    stats={stats}
                    onClose={() => setShowReport(false)}
                    onGoToRaid={() => {
                        setShowReport(false);
                        onOpenRaid?.();
                    }}
                />
            )}
        </div>
    );
}
