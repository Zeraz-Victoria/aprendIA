"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Star, Volume2, Bot, Sparkles, ImageIcon, Heart, Diamond, Flame } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DayContent } from "@/types/learning-world";
import { useLearning } from "@/contexts/LearningContext";
import WordSearch from "./minigames/WordSearch";
import MemoryMatch from "./minigames/MemoryMatch";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import PedagogicalWrapper from "./PedagogicalWrapper";

function safeParsePromptText(text: string | undefined): string {
    if (!text) return "";
    try {
        const trimmed = text.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") {
                if (parsed.originalProblemText) return parsed.originalProblemText;
                if (parsed.statement) return parsed.statement;
                if (parsed.narrative) return parsed.narrative;
                // If it's an array or just has random keys, try to stringify it prettier or just return it
                return JSON.stringify(parsed, null, 2);
            }
        }
    } catch (e) {
        // Not JSON, return as is
    }
    return text;
}


function fixImageUrl(src: string): string {
    // We previously intercepted pollinations.ai URLs to our local API.
    // That was causing issues so we will just use the pollinations.ai URLs directly.
    // Ensure the prompt is properly encoded if we find it.
    if (src.includes("pollinations.ai")) {
        let prompt = "";
        if (src.includes("/p/")) {
            prompt = src.split("/p/")[1]?.split("?")[0]?.replace(/\+/g, " ") || "";
        } else if (src.includes("/prompt/")) {
            prompt = decodeURIComponent(src.split("/prompt/")[1]?.split("?")[0] || "");
        }
        if (prompt) {
            return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=400&nologo=true`;
        }
    }
    return src;
}

function PollinationsImage({ src, alt }: { src?: string; alt?: string }) {
    const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
    const fixedSrc = src ? fixImageUrl(src) : "";

    return status === "error" || !fixedSrc ? (
        <div className="w-full rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-dashed border-indigo-200 p-6 text-center my-4">
            <ImageIcon className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
            <p className="text-indigo-600 font-medium text-sm italic">{alt || "Ilustración"}</p>
        </div>
    ) : (
        <div className="my-4 relative">
            {status === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 rounded-xl animate-pulse">
                    <Sparkles className="w-8 h-8 text-indigo-300 animate-spin" />
                </div>
            )}
            <img
                src={fixedSrc}
                alt={alt || "Ilustración"}
                className="w-full rounded-xl shadow-md border border-indigo-100"
                loading="lazy"
                onLoad={() => setStatus("loaded")}
                onError={() => setStatus("error")}
            />
        </div>
    );
}

const markdownComponents: any = {
    img: ({ src, alt }: { src?: string; alt?: string }) => (
        <PollinationsImage src={src} alt={alt} />
    ),
};

interface InteractiveLessonCardProps {
    data: DayContent;
    studentName?: string;
    studentId?: string;
    worldId?: string;
    levelId?: number;
    onComplete: () => void;
    onClose: () => void;
}

export default function InteractiveLessonCard({ data, studentName = "Aventurero", studentId, worldId, levelId, onComplete, onClose }: InteractiveLessonCardProps) {
    const { stats, setStats } = useLearning();
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [showActivity, setShowActivity] = useState(false);
    const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
    const [wrongCount, setWrongCount] = useState(0);
    const [gemReward, setGemReward] = useState<number | null>(null);
    const [showGameOver, setShowGameOver] = useState(false);
    const [gameOverTimer, setGameOverTimer] = useState(30);
    const [isDownloading, setIsDownloading] = useState(false);

    // TTS State
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
            setSpeechSupported(false);
        }
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleSpeak = (textToSpeak: string) => {
        if (!speechSupported) return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const cleanText = textToSpeak.replace(/[\[\]*#_]/g, '').trim(); // Remove some markdown chars for reading
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-MX'; // Or generic 'es-ES'
        utterance.rate = 0.9;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // AI Tutor and Practice State
    const [studentInput, setStudentInput] = useState("");
    const [aiHint, setAiHint] = useState<string | null>(null);
    const [isGettingHint, setIsGettingHint] = useState(false);

    // Teacher Reveal State
    const [showTeacherAuth, setShowTeacherAuth] = useState(false);
    const [teacherPassword, setTeacherPassword] = useState("");
    const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);

    const handleRevealAnswer = () => {
        if (teacherPassword === "1234") {
            if (data.type === 'guided_practice') {
                setRevealedAnswer(String(data.content.practiceProblem?.correctValue));
            } else if (data.content?.miniGame) {
                setRevealedAnswer(data.content.miniGame.correctAnswer || null);
            }
            setShowTeacherAuth(false);
            setTeacherPassword("");
        } else {
            alert("Contraseña incorrecta");
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const element = document.getElementById("full-lesson-pdf-container");
            if (!element) return;

            element.style.display = "block";
            element.classList.remove("top-[-9999px]", "left-[-9999px]", "z-[-50]");
            element.classList.add("fixed", "top-0", "left-0", "z-[9990]");

            // Wait for paint
            await new Promise(resolve => setTimeout(resolve, 500));

            // Safari workaround: First call warms up the internal SVG/font cache, second call captures
            await toCanvas(element, { pixelRatio: 1.5, backgroundColor: '#ffffff', skipFonts: false }).catch(() => { });
            const canvas = await toCanvas(element, { pixelRatio: 1.5, backgroundColor: '#ffffff', skipFonts: false });
            const imgData = canvas.toDataURL("image/jpeg", 0.95);

            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const pdf = new jsPDF({
                orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
                unit: "mm",
                format: [pdfWidth, Math.max(297, pdfHeight + 10)]
            });

            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Leccion-${data.title.replace(/\s+/g, '-')}.pdf`);

        } catch (error: any) {
            console.error("Error generating PDF:", error);
            alert(`Hubo un error al generar el PDF: ${error?.message || 'Error desconocido'}`);
        } finally {
            const element = document.getElementById("full-lesson-pdf-container");
            if (element) {
                element.style.display = "none";
                element.classList.add("top-[-9999px]", "left-[-9999px]");
                element.classList.remove("fixed", "top-0", "left-0", "z-[9990]");
            }
            setIsDownloading(false);
        }
    };

    // Use chunks from explanation if they exist, otherwise just use the narrative as a single chunk
    const chunks = data.content?.explanation?.chunks || [data.narrative || ""];
    const currentChunk = chunks[currentChunkIndex];

    const handleNextChunk = () => {
        if (currentChunkIndex < chunks.length - 1) {
            setCurrentChunkIndex(prev => prev + 1);
        } else {
            // Reached the end of the narrative
            if (data.type === "concept_story" && !data.content?.miniGame) {
                // If it's just a story with no minigame, we are done
                onComplete();
            } else if (data.type === "boss_fight") {
                // Boss fights just show story here, then pass to BossFightCamera via onComplete
                onComplete();
            } else {
                setShowActivity(true);
            }
        }
    };

    // Flexible answer normalization to handle units, case, whitespace, and common aliases
    const normalizeAnswer = (val: string): string => {
        let s = String(val).trim().toLowerCase();
        // Normalize unicode superscripts and common unit aliases
        s = s.replace(/²/g, '2').replace(/³/g, '3');
        s = s.replace(/\^(\d)/g, '$1'); // cm^2 -> cm2
        // Normalize common unit variations
        s = s.replace(/\s+/g, ' '); // collapse whitespace
        s = s.replace(/\.$/, ''); // remove trailing dot
        // Remove commas in numbers: 3,600 -> 3600
        s = s.replace(/(\d),(\d)/g, '$1$2');
        return s;
    };

    const answersMatch = (student: string, correct: string): boolean => {
        const normStudent = normalizeAnswer(student);
        const normCorrect = normalizeAnswer(correct);
        // Direct match after normalization
        if (normStudent === normCorrect) return true;
        // Check if the numeric parts match (extract numbers)
        const studentNums = normStudent.match(/[\d.]+/g);
        const correctNums = normCorrect.match(/[\d.]+/g);
        if (studentNums && correctNums && studentNums.join(',') === correctNums.join(',')) return true;
        // Check if one contains the other (e.g., student writes "192" and correct is "192 litros")
        if (normStudent.includes(normCorrect) || normCorrect.includes(normStudent)) return true;
        return false;
    };

    // Game Over timer — auto-refill lives after 30 seconds
    useEffect(() => {
        if (!showGameOver) return;
        const timer = setInterval(() => {
            setGameOverTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setStats(s => ({ ...s, lives: 3 }));
                    setShowGameOver(false);
                    setGameOverTimer(30);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [showGameOver, setStats]);

    const loseLife = () => {
        setStats(prev => {
            const newLives = Math.max(0, prev.lives - 1);
            if (newLives === 0) {
                setTimeout(() => setShowGameOver(true), 500);
            }
            return { ...prev, lives: newLives };
        });
    };

    const rewardGems = (amount: number) => {
        setStats(prev => ({
            ...prev,
            gems: prev.gems + amount,
            streak: prev.streak + 1
        }));
        setGemReward(amount);
        setTimeout(() => setGemReward(null), 2000);
    };

    const handleMiniGameAnswer = (option: string) => {
        const isCorrect = answersMatch(option, data.content.miniGame?.correctAnswer || "");

        // Asynchronously log the attempt to the universal evidence endpoint
        if (studentId && worldId && levelId !== undefined) {
            fetch('/api/analyze-evidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId, worldId, levelId,
                    context: `Interactive Quiz: ${data.content.miniGame?.question}`,
                    narrative: data.narrative,
                    textEvidence: option
                })
            }).catch(e => console.error("Failed to sync minigame evidence", e));
        }

        if (isCorrect) {
            const bonus = wrongCount === 0 ? 10 : 5; // Perfect answer bonus
            rewardGems(bonus);
            setFeedback("success");
            setTimeout(() => {
                onComplete();
            }, 2000);
        } else {
            setWrongCount(prev => prev + 1);
            loseLife();
            setFeedback("error");
        }
    };

    const handleAlternativeGameComplete = () => {
        const bonus = 15; // standard bonus for word searches / memory matches
        rewardGems(bonus);
        setFeedback("success");
        setTimeout(() => {
            onComplete();
        }, 2500);
    };

    const handlePracticeCheck = () => {
        const isCorrect = answersMatch(studentInput, String(data.content.practiceProblem?.correctValue));

        // Asynchronously log the attempt to the universal evidence endpoint
        if (studentId && worldId && levelId !== undefined) {
            fetch('/api/analyze-evidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId, worldId, levelId,
                    context: `Guided Practice: ${data.content.practiceProblem?.statement}`,
                    narrative: data.narrative,
                    textEvidence: studentInput
                })
            }).catch(e => console.error("Failed to sync practice evidence", e));
        }

        if (isCorrect) {
            const bonus = wrongCount === 0 ? 15 : 5; // Perfect answer bonus
            rewardGems(bonus);
            setFeedback("success");
            setTimeout(() => onComplete(), 2000);
        } else {
            setWrongCount(prev => prev + 1);
            loseLife();
            setFeedback("error");
        }
    };

    const handleGetHint = async () => {
        setIsGettingHint(true);
        setAiHint(null);
        try {
            const res = await fetch('/api/ai/tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    problemText: data.content.practiceProblem?.statement || data.narrative,
                    studentAttempt: studentInput || "Aún no sé cómo empezar."
                })
            });
            const d = await res.json();
            setAiHint(d.hint);
        } catch (e) {
            setAiHint("No se pudo conectar con el Tutor IA.");
        } finally {
            setIsGettingHint(false);
        }
    };

    const renderGuidedPractice = () => {
        const statement = safeParsePromptText(
            data.content?.practiceProblem?.statement ||
            (data.content as any)?.evidenceProblem?.statement ||
            (data as any).originalProblemText ||
            data.content?.explanation?.analogy ||
            data.narrative
        );

        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-indigo-100 dark:border-slate-700">
                    <div className="bg-indigo-50 dark:bg-slate-700 p-6 rounded-xl border border-indigo-100 dark:border-slate-600">
                        <div className="prose prose-indigo dark:prose-invert prose-lg max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                            >
                                {(statement || "Resuelve el siguiente acertijo.")
                                    .replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName)
                                    .replace(/<br\s*\/?>/gi, '\n\n')
                                    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                                    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                                    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                                    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                                }
                            </ReactMarkdown>
                        </div>

                        {speechSupported && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => handleSpeak((statement || "Resuelve el siguiente acertijo.").replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName))}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${isSpeaking ? 'bg-indigo-200 text-indigo-700 animate-pulse' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                                    title="Leer en voz alta"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    {isSpeaking ? "Escuchando..." : "Escuchar"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        value={studentInput}
                        onChange={(e) => setStudentInput(e.target.value)}
                        placeholder="Tu respuesta aquí..."
                        className="w-full text-center text-2xl p-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={handlePracticeCheck}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
                        >
                            Verificar Respuesta
                        </button>
                        <button
                            type="button"
                            onClick={handleGetHint}
                            disabled={isGettingHint}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
                        >
                            {isGettingHint ? <Sparkles className="animate-spin" /> : <Bot />}
                            Tutor IA
                        </button>
                    </div>
                </div>

                {aiHint && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 p-4 rounded-r-xl animate-fade-in-up">
                        <div className="flex items-start gap-3">
                            <Bot className="text-amber-600 dark:text-amber-400 mt-1" />
                            <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                                {aiHint}
                            </p>
                        </div>
                    </div>
                )}

                {feedback === "success" && (
                    <div className="text-center animate-bounce-slow">
                        <span className="text-6xl">🎉</span>
                        <p className="text-green-600 font-bold text-xl mt-2">¡Correcto! Excelente trabajo.</p>
                        <button
                            type="button"
                            onClick={onComplete}
                            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-md transition"
                        >
                            Subir Evidencia (Cuaderno)
                        </button>
                    </div>
                )}
                {feedback === "error" && (
                    <div className="text-center animate-shake">
                        <p className="text-red-500 font-bold text-lg mt-2">No es correcto. ¡Intenta de nuevo o pide ayuda a la IA! 🤖</p>
                    </div>
                )}
            </div>
        );
    };

    const renderMiniGame = () => {
        const type = data.content?.miniGame?.type;

        if (type === "word_search" && data.content?.miniGame?.words) {
            return (
                <div className="space-y-6 animate-fade-in-up">
                    <WordSearch words={data.content.miniGame.words} onComplete={handleAlternativeGameComplete} />
                    {feedback === "success" && (
                        <div className="text-center animate-bounce-slow mt-4">
                            <span className="text-6xl">🎉</span>
                            <p className="text-green-600 font-bold text-xl mt-2">¡Excelente! ¡Encontraste todas!</p>
                        </div>
                    )}
                </div>
            );
        }

        if (type === "memory_match" && data.content?.miniGame?.pairs) {
            return (
                <div className="space-y-6 animate-fade-in-up">
                    <MemoryMatch pairs={data.content.miniGame.pairs} onComplete={handleAlternativeGameComplete} />
                    {feedback === "success" && (
                        <div className="text-center animate-bounce-slow mt-4">
                            <span className="text-6xl">🎉</span>
                            <p className="text-green-600 font-bold text-xl mt-2">¡Memoria fabulosa!</p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-fade-in-up">
                <h2 className="text-2xl font-bold text-center text-indigo-900 mb-6 font-display">
                    ¡Mini-Desafío! 🧠
                </h2>

                <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-indigo-100 text-center">
                    <p className="text-xl text-slate-700 mb-8">{data.content?.miniGame?.question}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(data.content?.miniGame?.options || []).map((option, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleMiniGameAnswer(option)}
                                className={`
                            p-4 rounded-xl text-lg font-bold border-2 transition-all
                            ${feedback === 'success' && option === data.content?.miniGame?.correctAnswer
                                        ? 'bg-green-100 border-green-500 text-green-700 scale-105'
                                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400'}
                            ${feedback === 'error' && option !== data.content?.miniGame?.correctAnswer ? 'opacity-50' : ''}
                        `}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {feedback === "success" && (
                    <div className="text-center animate-bounce-slow">
                        <span className="text-6xl">🎉</span>
                        <p className="text-green-600 font-bold text-xl mt-2">{data.content?.miniGame?.feedbackSuccess}</p>
                    </div>
                )}

                {feedback === "error" && (
                    <div className="text-center animate-shake">
                        <p className="text-amber-600 font-bold text-lg mt-2">{data.content?.miniGame?.feedbackError}</p>
                    </div>
                )}
            </div>
        );
    };

    // Main Layout
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            {/* Game Over Overlay */}
            {showGameOver && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center backdrop-blur-lg">
                    <div className="text-center animate-fade-in-up">
                        <div className="text-8xl mb-6 animate-bounce">💀</div>
                        <h2 className="text-5xl font-black text-red-500 mb-4 tracking-wider">GAME OVER</h2>
                        <p className="text-slate-300 text-lg mb-2">¡Se acabaron tus vidas!</p>
                        <p className="text-slate-400 text-sm mb-8">Tus vidas se recargarán automáticamente...</p>
                        <div className="w-32 h-32 mx-auto relative mb-6">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(gameOverTimer / 30) * 283} 283`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-black text-white">{gameOverTimer}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setStats(s => ({ ...s, gems: Math.max(0, s.gems - 10), lives: 3 }));
                                setShowGameOver(false);
                                setGameOverTimer(30);
                            }}
                            disabled={stats.gems < 10}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                        >
                            <Diamond className="w-5 h-5" /> Revivir por 10 💎
                        </button>
                    </div>
                </div>
            )}

            {/* Gem Reward Popup */}
            {gemReward && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[55] animate-bounce">
                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xl shadow-2xl flex items-center gap-2">
                        <Diamond className="w-6 h-6 fill-white" /> +{gemReward} 💎
                        {wrongCount === 0 && <span className="text-sm font-bold ml-2 bg-white/20 px-2 py-0.5 rounded-full">PERFECTO</span>}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-4 border-amber-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                <div className="bg-amber-100 dark:bg-slate-800 p-4 flex justify-between items-center border-b border-amber-200 dark:border-slate-700">
                    <h3 className="font-bold text-xl text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <span className="text-2xl">{data.type === 'guided_practice' ? '🎯' : (data.type === 'boss_fight' ? '👹' : '🎒')}</span> {data.title}
                    </h3>
                    <div className="flex gap-2 items-center">
                        {/* Inline Lives/Gems/Streak */}
                        <div className="flex items-center gap-3 mr-2 bg-white/60 dark:bg-slate-700/60 px-3 py-1 rounded-full">
                            <div className="flex items-center gap-0.5">
                                {Array.from({ length: Math.max(stats.lives, 0) }).map((_, i) => (
                                    <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />
                                ))}
                                {Array.from({ length: Math.max(0, 5 - stats.lives) }).map((_, i) => (
                                    <Heart key={`empty-${i}`} className="w-4 h-4 text-slate-300" />
                                ))}
                            </div>
                            <div className="flex items-center gap-0.5">
                                <Diamond className="w-4 h-4 text-blue-500 fill-blue-400" />
                                <span className="text-xs font-bold text-blue-600">{stats.gems}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                                <span className="text-xs font-bold text-orange-600">{stats.streak}</span>
                            </div>
                        </div>
                        {(data.type === 'guided_practice' || data.content?.miniGame) && showActivity && (
                            <button type="button" onClick={() => setShowTeacherAuth(!showTeacherAuth)} className="text-slate-500 hover:text-slate-700 bg-white/50 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                                👁️ Docente
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="text-amber-800 hover:text-amber-950 px-3 py-1 rounded-full bg-amber-200/50 hover:bg-amber-200 font-bold text-sm">
                            Salir
                        </button>
                    </div>
                </div>

                {showTeacherAuth && !revealedAnswer && (
                    <div className="bg-slate-800 p-4 text-white flex gap-3 items-center justify-center animate-fade-in-up">
                        <span className="text-sm font-bold text-slate-300">Contraseña Docente:</span>
                        <input
                            type="password"
                            className="text-black px-3 py-1.5 rounded-lg text-sm w-32 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={teacherPassword}
                            onChange={e => setTeacherPassword(e.target.value)}
                            placeholder="****"
                            onKeyDown={e => e.key === 'Enter' && handleRevealAnswer()}
                        />
                        <button type="button" onClick={handleRevealAnswer} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">
                            Revelar
                        </button>
                    </div>
                )}
                {revealedAnswer && (
                    <div className="bg-green-100 border-b border-green-200 p-3 text-center text-green-800 font-bold text-sm flex items-center justify-center gap-4 animate-fade-in-up">
                        <span>💡 Respuesta Correcta: <span className="text-lg bg-green-200 px-2 py-0.5 rounded ml-2">{revealedAnswer}</span></span>
                        <button type="button" onClick={handleDownloadPDF} disabled={isDownloading} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm transition-colors shadow-sm">
                            {isDownloading ? "Generando..." : "Descargar PDF de Lección"}
                        </button>
                        <button type="button" onClick={() => setRevealedAnswer(null)} className="text-green-600 hover:text-green-900 text-xs bg-white/50 hover:bg-white px-2 py-1 rounded-full transition-colors">Ocultar</button>
                    </div>
                )}

                <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] bg-amber-50">
                    {!showActivity ? (
                        <div className="space-y-6">
                            <div className="relative">
                                {data.type === 'guided_practice' && <span className="absolute -top-3 -right-3 z-10 bg-indigo-500 text-white text-xs px-2 py-1 rounded font-bold shadow-sm">Teoría</span>}
                                <PedagogicalWrapper
                                    content={currentChunk || ""}
                                    studentName={studentName || "Aventurero"}
                                    type={data.type === 'guided_practice' ? 'theory' : 'narrative'}
                                />
                            </div>

                            <div className="flex justify-between pt-4">
                                {currentChunkIndex > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentChunkIndex(prev => prev - 1)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                    >
                                        <ChevronLeft /> Atrás
                                    </button>
                                ) : <div />}
                                <button
                                    type="button"
                                    onClick={handleNextChunk}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                >
                                    {currentChunkIndex < chunks.length - 1 ?
                                        "Continuar Leyendo" :
                                        (data.type === "boss_fight" ? "¡Enfrentar al Jefe!" :
                                            (data.type === "guided_practice" || data.content?.miniGame ? "¡Listo para el Reto!" : "Finalizar Lección"))
                                    } <ChevronRight />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={() => { setShowActivity(false); setCurrentChunkIndex(0); }}
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Volver a la Lectura
                            </button>
                            {data.type === 'guided_practice' ? renderGuidedPractice() : renderMiniGame()}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading Overlay */}
            {isDownloading && (
                <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-16 h-16 text-sky-400 animate-spin mb-6" />
                    <h2 className="text-3xl font-bold text-white mb-2">Construyendo Documento...</h2>
                    <p className="text-slate-300 text-lg">Añadiendo historia y minijuegos. Esto tomará unos segundos.</p>
                </div>
            )}

            {/* Hidden Container for PDF Download */}
            <div
                id="full-lesson-pdf-container"
                className="absolute top-[-9999px] left-[-9999px] bg-white w-[800px] p-8 text-black min-h-screen"
                style={{ display: "none" }}
            >
                <h1 className="text-3xl font-bold text-center mb-6 text-indigo-900 border-b-2 border-indigo-200 pb-4">{data.title}</h1>

                <div className="space-y-6 prose prose-lg max-w-none mb-10">
                    {chunks.map((chunk, idx) => (
                        <div key={idx} className="mb-4">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {(chunk || "")
                                    .replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)
                                    .replace(/<br\s*\/?>/gi, '\n\n')
                                    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                                    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                                    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                                    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                                }
                            </ReactMarkdown>
                        </div>
                    ))}
                </div>

                <div className="border-t-4 border-indigo-500 pt-6 mt-8">
                    <h2 className="text-2xl font-bold text-indigo-900 mb-4">Actividad Práctica</h2>
                    {data.type === 'guided_practice' ? (
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <div className="prose max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {(data.content?.practiceProblem?.statement || "")
                                        .replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)
                                        .replace(/<br\s*\/?>/gi, '\n\n')
                                        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                                        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                                        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                                        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                                    }
                                </ReactMarkdown>
                            </div>
                            <div className="mt-8">
                                <p className="font-bold mb-2">Respuesta (Escribe tu procedimiento abajo):</p>
                                <div className="border border-dashed border-gray-400 p-4 h-32 bg-white w-full rounded"></div>
                            </div>
                        </div>
                    ) : data.content?.miniGame ? (
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-xl font-bold mb-4">{data.content.miniGame.question || "Resuelve el reto de la clase"}</h3>
                            {data.content.miniGame.type === 'word_search' && data.content.miniGame.words && (
                                <div className="mb-6">
                                    <p className="mb-2 font-medium">Encuentra las siguientes palabras:</p>
                                    <ul className="list-disc pl-6 space-y-1">
                                        {data.content.miniGame.words.map(w => <li key={w}>{w}</li>)}
                                    </ul>
                                </div>
                            )}
                            {data.content.miniGame.options && data.content.miniGame.options.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    {data.content.miniGame.options.map((opt, i) => (
                                        <div key={i} className="border border-gray-300 bg-white p-3 rounded-lg text-center font-medium shadow-sm">{opt}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
