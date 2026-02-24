"use client";

import React from "react";
import { Heart, Flame, Diamond, Trophy } from "lucide-react";
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
    const { stats, currentUser } = useLearning();

    return (
        <div className="fixed top-0 left-0 w-full z-40 px-4 py-3 pointer-events-none">
            <div className="max-w-4xl mx-auto flex items-center justify-between">

                {/* Left: Profile / Avatar */}
                <div
                    className="flex items-center gap-2 pointer-events-auto bg-slate-800/80 cursor-pointer hover:bg-slate-700/90 backdrop-blur rounded-full px-3 py-1 shadow-md border border-slate-600 transition-all hover:scale-105"
                    onClick={onOpenProfile}
                >
                    <span className="text-xl">{currentUser?.avatar || "🧑"}</span>
                    <span className="font-bold text-slate-200 text-sm hidden sm:inline">{currentUser?.name}</span>
                </div>

                {/* Right: Stats */}
                <div className="flex items-center gap-3 sm:gap-6 pointer-events-auto">

                    {/* Leaderboard */}
                    <div
                        className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform"
                        onClick={onOpenLeaderboard}
                    >
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 fill-amber-400 group-hover:fill-amber-500" />
                    </div>

                    {/* Streak */}
                    <div className="flex items-center gap-1 sm:gap-2 group cursor-pointer">
                        <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 fill-orange-500 animate-pulse" />
                        <span className="font-bold text-orange-500 text-sm sm:text-base">{stats.streak}</span>
                    </div>

                    {/* Gems */}
                    <div
                        className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform"
                        onClick={onOpenStore}
                    >
                        <Diamond className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 fill-blue-400 group-hover:fill-blue-500" />
                        <span className="font-bold text-blue-500 text-sm sm:text-base">{stats.gems}</span>
                    </div>

                    {/* Lives */}
                    <div className="flex items-center gap-1 sm:gap-2 group cursor-pointer">
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 fill-red-500" />
                        <span className="font-bold text-red-500 text-sm sm:text-base">{stats.lives}</span>
                    </div>

                </div>

            </div>
        </div>
    );
}
