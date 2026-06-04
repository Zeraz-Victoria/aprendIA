"use client";

import { useState, useEffect } from "react";
import { Trophy, Star, AlertTriangle, BookOpen, Swords, X, Loader2 } from "lucide-react";

interface MapCompletionReportProps {
    worldTitle: string;
    worldTheme: string;
    totalDays: number;
    studentName: string;
    studentId?: string;
    stats: { xp: number; gems: number; streak: number; lives: number };
    onClose: () => void;
    onGoToRaid: () => void;
}

interface ReportData {
    grade: string;
    gradeLabel: string;
    strengths: string[];
    weaknesses: string[];
    reviewTopics: string[];
    message: string;
}

function calculateReport(stats: MapCompletionReportProps["stats"], totalDays: number, worldTheme: string): ReportData {
    // Simple heuristic-based grading
    const xpPerDay = totalDays > 0 ? stats.xp / totalDays : 0;
    const livesLeft = stats.lives;

    let grade: string;
    let gradeLabel: string;

    if (livesLeft === 3 && stats.streak >= 3) {
        grade = "A+";
        gradeLabel = "¡Extraordinario!";
    } else if (livesLeft >= 2 && stats.streak >= 2) {
        grade = "A";
        gradeLabel = "¡Excelente!";
    } else if (livesLeft >= 2) {
        grade = "B+";
        gradeLabel = "¡Muy Bien!";
    } else if (livesLeft >= 1) {
        grade = "B";
        gradeLabel = "Bien Hecho";
    } else {
        grade = "C";
        gradeLabel = "Completado";
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const reviewTopics: string[] = [];

    if (stats.streak >= 3) strengths.push("Racha impresionante — gran consistencia al responder");
    if (livesLeft === 3) strengths.push("Terminaste sin perder ni una vida — dominio total");
    if (stats.gems >= 100) strengths.push("Gran colección de gemas — utilizaste bien tus multiplicadores");
    if (stats.xp >= totalDays * 60) strengths.push("XP alto por nivel — desempeño sobresaliente");

    if (strengths.length === 0) strengths.push("Completaste todo el mapa — ¡eso ya es un gran logro!");

    if (livesLeft === 0) weaknesses.push("Perdiste todas tus vidas — repasa los temas con más calma");
    if (stats.streak === 0) weaknesses.push("Tu racha se rompió — intenta responder más cuidadosamente");
    if (stats.gems < 30) weaknesses.push("Pocas gemas ganadas — intenta mantener tu racha para ganar más");

    if (weaknesses.length === 0) weaknesses.push("¡Sin debilidades notables — sigue así!");

    reviewTopics.push(`Repasa los conceptos clave de "${worldTheme}"`);
    if (livesLeft < 2) reviewTopics.push("Practica los ejercicios donde perdiste vidas");
    reviewTopics.push("Intenta mejorar tu racha en los mini-desafíos");

    const messages = [
        `¡Has conquistado el mapa de ${worldTheme}! Tu aventura no termina aquí...`,
        `¡Eres un verdadero héroe de las ${worldTheme}! Ahora, un desafío mayor te espera...`,
        `¡El mapa ha sido dominado! Pero un terrible monstruo amenaza a todos...`
    ];

    return {
        grade,
        gradeLabel,
        strengths,
        weaknesses,
        reviewTopics,
        message: messages[Math.floor(Math.random() * messages.length)]
    };
}

const GRADE_COLORS: Record<string, string> = {
    "A+": "from-yellow-400 to-amber-500",
    "A": "from-emerald-400 to-green-500",
    "B+": "from-sky-400 to-blue-500",
    "B": "from-blue-400 to-indigo-500",
    "C": "from-orange-400 to-red-500",
};

export default function MapCompletionReport({ worldTitle, worldTheme, totalDays, studentName, stats, onClose, onGoToRaid }: MapCompletionReportProps) {
    const [report, setReport] = useState<ReportData | null>(null);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        // Small delay for dramatic effect
        const timer = setTimeout(() => {
            const data = calculateReport(stats, totalDays, worldTheme);
            setReport(data);
            setTimeout(() => setShowContent(true), 300);
        }, 800);
        return () => clearTimeout(timer);
    }, [stats, totalDays, worldTheme]);

    if (!report) {
        return (
            <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center backdrop-blur-lg">
                <div className="text-center animate-pulse">
                    <Loader2 className="w-16 h-16 text-yellow-400 mx-auto animate-spin mb-4" />
                    <p className="text-white text-xl font-bold">Calculando tu calificación...</p>
                </div>
            </div>
        );
    }

    const gradeGradient = GRADE_COLORS[report.grade] || GRADE_COLORS["B"];

    return (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center backdrop-blur-lg p-4 overflow-y-auto">
            <div className={`w-full max-w-lg transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="bg-[#1c3a60] rounded-3xl border-2 border-[#346297] shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className={`bg-gradient-to-r ${gradeGradient} p-6 text-center relative`}>
                        <button onClick={onClose} className="absolute top-4 right-4 p-1 bg-black/20 rounded-full hover:bg-black/40 transition">
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <div className="text-6xl mb-2">🏆</div>
                        <h2 className="text-3xl font-black text-white mb-1">¡MAPA COMPLETADO!</h2>
                        <p className="text-white/80 text-sm font-medium">{worldTitle}</p>
                    </div>

                    {/* Grade Circle */}
                    <div className="flex justify-center -mt-10 relative z-10">
                        <div className={`w-20 h-20 bg-gradient-to-br ${gradeGradient} rounded-full flex items-center justify-center shadow-2xl border-4 border-[#1c3a60]`}>
                            <span className="text-3xl font-black text-white">{report.grade}</span>
                        </div>
                    </div>
                    <p className="text-center text-[#73a4db] font-bold mt-2 text-lg">{report.gradeLabel}</p>
                    <p className="text-center text-[#73a4db] text-sm px-6 mt-1">{report.message}</p>

                    {/* Stats Bar */}
                    <div className="flex justify-center gap-6 mt-4 px-6">
                        <div className="text-center">
                            <span className="text-2xl">⭐</span>
                            <p className="text-white font-bold text-sm">{stats.xp} XP</p>
                        </div>
                        <div className="text-center">
                            <span className="text-2xl">💎</span>
                            <p className="text-[#73a4db] font-bold text-sm">{stats.gems} Gemas</p>
                        </div>
                        <div className="text-center">
                            <span className="text-2xl">🔥</span>
                            <p className="text-orange-400 font-bold text-sm">x{stats.streak} Racha</p>
                        </div>
                        <div className="text-center">
                            <span className="text-2xl">❤️</span>
                            <p className="text-red-400 font-bold text-sm">{stats.lives} Vidas</p>
                        </div>
                    </div>

                    {/* Report Sections */}
                    <div className="p-6 space-y-4 mt-2">
                        {/* Strengths */}
                        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-4">
                            <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-2">
                                <Star className="w-4 h-4" /> Puntos Fuertes
                            </h3>
                            <ul className="space-y-1">
                                {report.strengths.map((s, i) => (
                                    <li key={i} className="text-emerald-200 text-sm flex items-start gap-2">
                                        <span className="mt-0.5">✅</span> {s}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl p-4">
                            <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4" /> Áreas de Mejora
                            </h3>
                            <ul className="space-y-1">
                                {report.weaknesses.map((w, i) => (
                                    <li key={i} className="text-amber-200 text-sm flex items-start gap-2">
                                        <span className="mt-0.5">⚠️</span> {w}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Review */}
                        <div className="bg-sky-950/40 border border-sky-800/50 rounded-2xl p-4">
                            <h3 className="text-[#73a4db] font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-2">
                                <BookOpen className="w-4 h-4" /> Qué Repasar
                            </h3>
                            <ul className="space-y-1">
                                {report.reviewTopics.map((r, i) => (
                                    <li key={i} className="text-[#cbe0f6] text-sm flex items-start gap-2">
                                        <span className="mt-0.5">📖</span> {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* CTA — Attack Raid Boss */}
                    <div className="p-6 pt-0">
                        <button
                            onClick={onGoToRaid}
                            className="w-full relative group bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black text-lg py-4 rounded-2xl shadow-[0_6px_0_rgba(153,27,27,1)] active:shadow-[0_2px_0_rgba(153,27,27,1)] active:translate-y-1 transition-all flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                            <Swords className="w-6 h-6" />
                            ⚔️ ¡Atacar al Jefe de Incursión!
                        </button>
                        <p className="text-center text-[#73a4db] text-xs mt-3">
                            Únete con tus compañeros para derrotar al monstruo épico
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
