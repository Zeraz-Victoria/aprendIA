"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Lock, Check, Star, MapPin, AlertCircle, Shield, Swords, Skull, Zap } from "lucide-react";
import NotebookUploader from "./NotebookUploader";
import InteractiveLessonCard from "./InteractiveLessonCard";
import BossFightCamera from "./BossFightCamera";
import MapCompletionReport from "./MapCompletionReport";
import { DayContent, BossDayContent } from "@/types/learning-world";
import { useLearning } from "@/contexts/LearningContext";
import { getTheme } from "@/lib/themes";

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
    hasAvatar?: boolean;
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
    const theme = getTheme(world?.theme);

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
                if (seenBoss) return false;
                seenBoss = true;
            }
            return true;
        });
        allDays = allDays.map((d, i) => ({ ...d, dayNumber: i + 1 }));
        return allDays;
    }, [world, studentMissions]);

    const numLevels = mergedDays.length;
    const minHeight = Math.max(600, numLevels * 160);

    const dynamicCoords = React.useMemo(() => {
        if (numLevels === 0) return [];
        return Array.from({ length: numLevels }, (_, i) => {
            if (numLevels === 1) return { x: 50, y: 50 };
            const progressRatio = i / (numLevels - 1);
            
            // Keep fixed pixel margins from top and bottom so large maps don't waste 20% of 2000px
            const topMarginPx = 100; 
            const bottomMarginPx = 120;
            
            const startY = (topMarginPx / minHeight) * 100;
            const endY = 100 - ((bottomMarginPx / minHeight) * 100);
            
            const y = startY + (progressRatio * (endY - startY));
            const x = 50 + Math.sin(i * 1.5) * 35;
            return { x, y };
        });
    }, [numLevels, minHeight]);

    if (!world) {
        return null;
    }

    const totalCompletedLevels = studentProgress.length;

    const levels: Level[] = mergedDays.map((day, index) => {
        const isCompleted = index < totalCompletedLevels;
        const isActive = index === totalCompletedLevels;
        const hasAvatar = isActive || (totalCompletedLevels >= numLevels && index === numLevels - 1);

        let status: LevelStatus = "locked";
        if (isCompleted) status = "completed";
        else if (isActive) status = "active";

        const coords = dynamicCoords[index] || { x: 50, y: 50 };

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
            isStudentMission: (day as any).isStudentMission || false,
            hasAvatar
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

        const levelContent = world.days.find(d => d.dayNumber === level.id);
        if (!levelContent) return;

        setShowLesson(true);
    };

    const handleLessonComplete = () => {
        setShowLesson(false);

        if (selectedLevel?.type === 'boss_fight') {
            setShowBoss(true);
        } else {
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
            setShowReport(true);
        }
    };

    const getDayContent = (dayNumber: number) => {
        return world.days.find(d => d.dayNumber === dayNumber) as DayContent;
    };

    const getBossContent = () => {
        return world.days.find(d => d.dayNumber === selectedLevel?.id) as BossDayContent;
    };

    // ═══════════════════════════════════════════
    // FREE FIRE INSPIRED RENDER
    // ═══════════════════════════════════════════

    return (
        <div className={`relative w-full min-h-screen ${theme.mapBg} overflow-y-auto flex flex-col items-center pt-4 pb-16 px-4 md:px-8`}>
            {/* Background Image Container */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <img 
                    src={theme.mapImage} 
                    alt="" 
                    className="w-full h-full object-cover scale-105 opacity-30 blur-sm" 
                />
            </div>

            {/* Background Texture Overlay */}
            <div
                className="absolute inset-0 opacity-[0.1] pointer-events-none fixed z-[1]"
                style={{ backgroundImage: `url('${theme.texture}')` }}
            />

            {/* Animated particles effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden fixed">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full animate-pulse"
                        style={{
                            left: `${15 + (i * 12)}%`,
                            top: `${10 + (i * 10)}%`,
                            backgroundColor: theme.pathProgress,
                            opacity: 0.3,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${2 + (i % 3)}s`,
                        }}
                    />
                ))}
            </div>

            {/* Map Container — Battle Arena Style */}
            <div
                className={`relative w-full max-w-4xl rounded-[2rem] shadow-2xl border-2 ${theme.mapBorder} overflow-hidden shrink-0 z-10`}
                style={{ minHeight: `${minHeight}px` }}
            >
                {/* High quality container background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img 
                        src={theme.mapImage} 
                        alt="" 
                        className="w-full h-full object-cover" 
                    />
                    <div className={`absolute inset-0 ${theme.mapCardBg}`} style={{ opacity: 0.85 }}></div>
                </div>



                {/* SVG Path connecting nodes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {dynamicCoords.length > 1 && (
                        <>
                            {/* Base path — dashed */}
                            <path
                                d={generatePathData(dynamicCoords)}
                                fill="none"
                                stroke={theme.pathBase}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray="6,6"
                                vectorEffect="non-scaling-stroke"
                            />
                            {/* Progress path — solid glow */}
                            <path
                                d={generatePathData(dynamicCoords.slice(0, totalCompletedLevels + 1))}
                                fill="none"
                                stroke={theme.pathProgress}
                                strokeWidth="4"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                                className={theme.pathGlow}
                            />
                        </>
                    )}
                </svg>

                {/* Level Nodes — Hexagonal Battle Nodes */}
                {levels.map((level) => (
                    <div
                        key={level.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10 flex flex-col items-center ${level.status === 'locked' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                        style={{ left: `${level.x}%`, top: `${level.y}%` }}
                        onClick={() => handleLevelClick(level)}
                    >
                        {/* Node circle with themed styling */}
                        <div
                            className={`
                                w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center shadow-lg border-[3px] transition-all duration-300 relative
                                ${level.status === 'locked' ? `${theme.nodeLocked} text-[#73a4db]` : ''}
                                ${level.status === 'active' ? `${theme.nodeActive} border-white text-white` : ''}
                                ${level.status === 'completed' ? `${theme.nodeCompleted} border-white/60 text-white` : ''}
                            `}
                            style={level.status === 'active' ? { boxShadow: theme.nodeActiveGlow } : undefined}
                        >
                            {/* Inner ring for active nodes */}
                            {level.status === 'active' && (
                                <div className="absolute inset-1 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '2s' }} />
                            )}

                            {level.status === 'locked' && <Lock className="w-6 h-6" />}
                            {level.status !== 'locked' && level.type === 'guided_practice' && !level.isGenerating && <Swords className="w-6 h-6" />}
                            {level.label === 'Jefe Final' && level.status !== 'locked' && !level.isGenerating && <Skull className="w-7 h-7" />}
                            
                            {/* Avatar Indicator */}
                            {level.hasAvatar && !level.isGenerating && (
                                <div className="text-4xl animate-bounce drop-shadow-2xl z-20 absolute -top-8">
                                    {currentUser?.avatar || "🧑"}
                                </div>
                            )}

                            {level.status === 'completed' && <Check className="w-8 h-8" strokeWidth={3} />}
                            {level.isGenerating && (
                                <svg className="animate-spin w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                        </div>

                        {/* Label badge — military tag style */}
                        <div className={`mt-2.5 px-4 py-1.5 rounded-lg text-[11px] font-black shadow-md tracking-wide uppercase ${level.status === 'locked' ? `${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} border opacity-50` : `${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} border`}`}>
                            {level.isGenerating ? '⚡ Generando...' : level.label}
                        </div>

                        {/* Stars for completed levels */}
                        {level.status === 'completed' && (
                            <div className="absolute -top-1 -right-1 flex items-center">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                            </div>
                        )}

                        {/* Mission indicator */}
                        {level.isStudentMission && level.status !== 'locked' && (
                            <div className="absolute -top-2 -left-2">
                                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-lg animate-pulse" />
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
