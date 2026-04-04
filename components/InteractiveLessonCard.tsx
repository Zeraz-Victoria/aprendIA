"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Star, Volume2, Bot, Sparkles, ImageIcon, Heart, Diamond, Flame, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { DayContent } from "@/types/learning-world";
import { useLearning } from "@/contexts/LearningContext";
import WordSearch from "./minigames/WordSearch";
import MemoryMatch from "./minigames/MemoryMatch";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import PedagogicalWrapper from "./PedagogicalWrapper";
import GlossaryWrapper from "./GlossaryWrapper";
import TheoryRenderer, { PresentationType } from "./TheoryRenderer";

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

                // CRITICAL FIX: Extract specific fields if present, NEVER show raw JSON that might contain the answer
                let customText = "";
                if (parsed.oraculo_teoria) customText += parsed.oraculo_teoria + "\n\n";
                if (parsed.instruccion_fiel) customText += parsed.instruccion_fiel;
                if (customText) return customText.trim();

                // If no known fields, stringify but remove correct answer explicitly just in case
                if (parsed.respuesta_correcta) delete parsed.respuesta_correcta;
                if (parsed.correctValue) delete parsed.correctValue;
                return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
            }
        }
    } catch (e) {
        // Not JSON, return as is
    }
    return typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text || "");
}

const renderSafeContent = (content: any) => {
    if (typeof content === 'object' && content !== null) {
        return <pre className="whitespace-pre-wrap text-sm bg-gray-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-4 rounded-xl overflow-x-auto my-4 border border-slate-200 shadow-inner max-w-full">{JSON.stringify(content, null, 2)}</pre>;
    }
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
            {String(content || '')}
        </ReactMarkdown>
    );
};


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
        <div className="w-full rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 border-2 border-dashed border-teal-200 p-6 text-center my-4">
            <ImageIcon className="w-12 h-12 text-teal-300 mx-auto mb-3" />
            <p className="text-teal-600 font-medium text-sm italic">{alt || "Ilustración"}</p>
        </div>
    ) : (
        <div className="my-4 relative">
            {status === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-teal-50 rounded-xl animate-pulse">
                    <Sparkles className="w-8 h-8 text-teal-300 animate-spin" />
                </div>
            )}
            <img
                src={fixedSrc}
                alt={alt || "Ilustración"}
                className="w-full rounded-xl shadow-md border border-teal-100"
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
    const { stats, setStats, inventory, consumeItem } = useLearning();
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [showActivity, setShowActivity] = useState(false);
    const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
    const [wrongCount, setWrongCount] = useState(0);
    const [gemReward, setGemReward] = useState<number | null>(null);
    const [showGameOver, setShowGameOver] = useState(false);
    const [gameOverTimer, setGameOverTimer] = useState(30);
    const [isDownloading, setIsDownloading] = useState(false);

    // Multi-stage activity logic: "minigame" -> "practice"
    const hasMiniGame = !!data.content?.miniGame;
    const hasPractice = !!(data.content?.practiceProblem || (data as any).reto_gameplay?.instruccion_fiel || (data as any).originalProblemText || data.type === 'guided_practice');
    const [activityStage, setActivityStage] = useState<"minigame" | "practice">(hasMiniGame && data.type !== 'guided_practice' ? "minigame" : "practice");

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

    // --- Lupa Mágica State ---
    const [isLupaActive, setIsLupaActive] = useState(false);
    const [disabledOptions, setDisabledOptions] = useState<Record<string, boolean>>({});

    const handleBuyLupa = () => {
        if (!data.content?.miniGame?.options || data.content.miniGame.options.length <= 2) {
            alert("La lupa mágica no es útil en esta pregunta.");
            return;
        }
        if (stats.gems < 50) {
            alert("No tienes suficientes gemas (50💎) para usar la Lupa Mágica.");
            return;
        }

        // Deduct 50 Gems Optimistically & Sync
        setStats(prev => ({ ...prev, gems: Math.max(0, prev.gems - 50) }));
        if (studentId) {
            fetch('/api/users/sync-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, gemsToAdd: -50 })
            }).catch(e => console.error("Failed to charge for Lupa", e));
        }

        // Calculate half of the wrong options to disable
        const options = data.content?.miniGame?.options || [];
        const correct = data.content?.miniGame?.correctAnswer || "";
        const wrongOptions = options.filter(opt => !answersMatch(opt, correct));

        // Pick half to eliminate
        const numToEliminate = Math.max(1, Math.floor(wrongOptions.length / 2));
        const eliminated: Record<string, boolean> = {};

        for (let i = 0; i < numToEliminate; i++) {
            eliminated[wrongOptions[i]] = true;
        }

        setDisabledOptions(eliminated);
        setIsLupaActive(true);
    };

    // Teacher Reveal State
    const [isTeacherUnlocked, setIsTeacherUnlocked] = useState(false);
    const [showTeacherAuth, setShowTeacherAuth] = useState(false);
    const [teacherPassword, setTeacherPassword] = useState("");

    const handleRevealAnswer = () => {
        if (teacherPassword === "1234") {
            setIsTeacherUnlocked(true);
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
            await toCanvas(element, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: false }).catch(() => { });
            const canvas = await toCanvas(element, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: false });

            // PDF dimensions in mm (Letter size)
            const pdfWidth = 210;
            const pdfPageHeight = 297;
            const margin = 5; // mm margin

            // Calculate how many pixels of the canvas fit on one PDF page
            const contentWidth = pdfWidth - (margin * 2);
            const scale = contentWidth / canvas.width; // mm per pixel
            const pageHeightInPx = (pdfPageHeight - (margin * 2)) / scale;
            const totalPages = Math.ceil(canvas.height / pageHeightInPx);

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) pdf.addPage();

                // Create a temporary canvas for this page slice
                const pageCanvas = document.createElement("canvas");
                pageCanvas.width = canvas.width;
                const sliceHeight = Math.min(pageHeightInPx, canvas.height - (page * pageHeightInPx));
                pageCanvas.height = sliceHeight;

                const ctx = pageCanvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                    ctx.drawImage(
                        canvas,
                        0, page * pageHeightInPx,           // source x, y
                        canvas.width, sliceHeight,           // source width, height
                        0, 0,                                // dest x, y
                        pageCanvas.width, sliceHeight        // dest width, height
                    );
                }

                const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
                const imgHeight = sliceHeight * scale;
                pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, imgHeight);
            }

            pdf.save(`Leccion-${(data.title || 'lesson').replace(/\s+/g, '-')}.pdf`);

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

    // Determine presentation type early to adapt chunks
    const formats: PresentationType[] = ["flashcards", "mind_map", "synoptic_chart", "infographic", "crossword"];
    const stored = (data as any).presentationType;
    const effectiveType: PresentationType = stored && stored !== "text"
        ? stored
        : data.type === "concept_story"
            ? formats[((data.dayNumber || 1) - 1) % formats.length]
            : "text";

    // For AI-generated levels with rich chunks, show narrative first then all explanation chunks.
    // For PDF-uploaded levels, keep using only the narrative (they embed all content in it).
    const hasRichChunks = (data.content?.explanation?.chunks?.length || 0) > 1;
    const baseChunks: string[] = hasRichChunks
        ? [
            data.narrative, 
            ...(data.content?.explanation?.chunks || []),
            data.content?.explanation?.analogy ? `## 💡 Analogía\n${data.content.explanation.analogy}` : null
          ].filter(Boolean) as string[]
        : (data.narrative 
            ? [data.narrative, data.content?.explanation?.analogy ? `## 💡 Analogía\n${data.content.explanation.analogy}` : null].filter(Boolean) as string[]
            : (data.content?.explanation?.chunks || [""]));

    // If using a visual renderer (flashcards, mind maps, etc), we paginate everything at once
    // but preserve baseChunks for the TheoryRenderer to use as sections natively!
    const paginationChunks = effectiveType !== "text" ? [baseChunks.join("\n\n")] : baseChunks;

    const currentChunk = paginationChunks[currentChunkIndex];

    const handleNextChunk = () => {
        if (currentChunkIndex < paginationChunks.length - 1) {
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
        // --- Escudo Protector Mechanic ---
        if (studentId) {
            const studentInventory = inventory[studentId] || [];
            if (studentInventory.includes('shield_protect')) {
                // Consume Shield using context method which updates local inventory immediately
                consumeItem(studentId, 'shield_protect');

                alert("🛡️ ¡Tu Escudo Protector se ha roto pero ha salvado tu Racha y tu Vida!");
                return; // Exit early, no life lost!
            }
        }
        // ---------------------------------

        setStats(prev => {
            const newLives = Math.max(0, prev.lives - 1);
            if (newLives === 0) {
                setTimeout(() => setShowGameOver(true), 500);
            }

            // Sync penalty to DB asynchronously
            if (studentId) {
                setTimeout(() => {
                    fetch('/api/users/sync-stats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ studentId, modifyStreak: 'reset', livesToAdd: -1 })
                    }).catch(e => console.error("Failed to sync penalty", e));
                }, 0);
            }

            return { ...prev, lives: newLives, streak: 0 };
        });
    };

    const rewardGems = (baseAmount: number) => {
        setStats(prev => {
            const newStreak = prev.streak + 1;
            const multiplier = Math.min(newStreak, 5); // Max x5 multiplier
            const totalGems = baseAmount * multiplier;

            // Trigger visual rewards and DB sync asynchronously so it doesn't block the state update
            setTimeout(() => {
                setGemReward(totalGems);
                setTimeout(() => setGemReward(null), 2500);

                if (studentId) {
                    fetch('/api/users/sync-stats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            studentId,
                            gemsToAdd: totalGems,
                            modifyStreak: 'increment'
                        })
                    }).catch(e => console.error("Failed to sync reward", e));
                }
            }, 0);

            return {
                ...prev,
                gems: prev.gems + totalGems,
                streak: newStreak
            };
        });
    };

    const handleMiniGameAnswer = (option: string) => {
        const isCorrect = answersMatch(option, data.content?.miniGame?.correctAnswer || "");

        // Asynchronously log the attempt to the universal evidence endpoint
        if (studentId && worldId && levelId !== undefined) {
            fetch('/api/analyze-evidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId, worldId, levelId,
                    context: `Interactive Quiz: ${data.content?.miniGame?.question}`,
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
                if (hasPractice) {
                    setActivityStage("practice");
                    setFeedback(null); // reset feedback for next screen
                } else {
                    onComplete();
                }
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
            if (hasPractice) {
                setActivityStage("practice");
                setFeedback(null);
            } else {
                onComplete();
            }
        }, 2500);
    };

    const handlePracticeCheck = () => {
        const isCorrect = answersMatch(studentInput, String(data.content?.practiceProblem?.correctValue));

        // Asynchronously log the attempt to the universal evidence endpoint
        if (studentId && worldId && levelId !== undefined) {
            fetch('/api/analyze-evidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId, worldId, levelId,
                    context: `Guided Practice: ${data.content?.practiceProblem?.statement}`,
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
                    problemText: data.content?.practiceProblem?.statement || data.narrative,
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
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-teal-100 dark:border-slate-700">
                    <div className="bg-teal-50 dark:bg-slate-700 p-6 rounded-xl border border-teal-100 dark:border-slate-600">
                        <div className="prose prose-sky dark:prose-invert prose-lg max-w-full break-words min-w-0 overflow-hidden">
                            {renderSafeContent(
                                (statement || "Resuelve el siguiente acertijo.")
                                    .replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName)
                                    .replace(/<br\s*\/?>/gi, '\n\n')
                                    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                                    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                                    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                                    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                            )}
                        </div>

                        {speechSupported && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => handleSpeak((statement || "Resuelve el siguiente acertijo.").replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName))}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${isSpeaking ? 'bg-teal-200 text-teal-700 animate-pulse' : 'bg-teal-100 text-teal-600 hover:bg-teal-200'}`}
                                    title="Leer en voz alta"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    {isSpeaking ? "Escuchando..." : "Escuchar"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {(() => {
                    let ejemplosText = "";
                    const rawStatement = data.content?.practiceProblem?.statement || (data.content as any)?.evidenceProblem?.statement;
                    if (rawStatement && typeof rawStatement === "string") {
                        try {
                            const parsed = JSON.parse(rawStatement);
                            if (parsed.ejemplos_resolucion) {
                                ejemplosText = parsed.ejemplos_resolucion;
                            } else if (parsed.reto_gameplay?.ejemplos_resolucion) {
                                ejemplosText = parsed.reto_gameplay.ejemplos_resolucion;
                            }
                        } catch (e) { }
                    }
                    if (!ejemplosText) return null;

                    return (
                        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-6 rounded-r-xl shadow-sm my-6">
                            <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300 mb-2">
                                <span className="text-xl">💡</span>
                                <span className="uppercase tracking-wider text-sm">Ejemplo de Resolución</span>
                            </div>
                            <div className="prose prose-blue dark:prose-invert text-blue-900 dark:text-blue-200 font-medium">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                    {ejemplosText}
                                </ReactMarkdown>
                            </div>
                        </div>
                    );
                })()}

                <div className="flex gap-4 mt-6">
                    <button
                        type="button"
                        onClick={onComplete}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-600/30 transition-transform active:scale-95"
                    >
                        📝 Subir Evidencia
                    </button>
                    <button
                        type="button"
                        onClick={handleGetHint}
                        disabled={isGettingHint}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-6 rounded-xl font-bold text-lg shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
                    >
                        {isGettingHint ? <Sparkles className="animate-spin" /> : <Bot />}
                        <span className="hidden sm:inline">Tutor IA</span>
                    </button>
                </div>

                {aiHint && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 p-4 rounded-r-xl animate-fade-in-up mt-4">
                        <div className="flex items-start gap-3">
                            <Bot className="text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
                            <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                                {aiHint}
                            </p>
                        </div>
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
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-6 font-display">
                    ¡Mini-Desafío! 🧠
                </h2>

                <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-teal-100 text-center w-full max-w-full">
                    <p className="text-xl text-slate-700 mb-8 break-words whitespace-pre-wrap w-full max-w-full overflow-hidden relative">
                        {data.content?.miniGame?.question}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {(data.content?.miniGame?.options || []).map((option, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleMiniGameAnswer(option)}
                                disabled={disabledOptions[option]}
                                className={`
                            p-4 rounded-xl text-lg font-bold border-2 transition-all relative break-words whitespace-pre-wrap w-full text-center flex items-center justify-center
                            ${feedback === 'success' && option === data.content?.miniGame?.correctAnswer
                                        ? 'bg-green-100 border-green-500 text-green-700 scale-105'
                                        : disabledOptions[option]
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                            : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:border-teal-400'}
                            ${feedback === 'error' && option !== data.content?.miniGame?.correctAnswer ? 'opacity-50' : ''}
                        `}
                            >
                                <span className={disabledOptions[option] ? "line-through" : ""}>{option}</span>
                            </button>
                        ))}
                    </div>

                    {/* Hint Button (Lupa Mágica) */}
                    {(data.content?.miniGame?.options?.length || 0) > 2 && !isLupaActive && feedback === null && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={handleBuyLupa}
                                className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2 rounded-full font-bold text-sm shadow-sm border border-amber-300 transition-colors"
                            >
                                <span>🔎 Usar Lupa Mágica</span>
                                <span className="bg-amber-500 text-white flex items-center gap-1 px-2 py-0.5 rounded-full text-xs">
                                    50 <Diamond className="w-3 h-3 fill-white" />
                                </span>
                            </button>
                        </div>
                    )}
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

                                if (studentId) {
                                    fetch('/api/users/sync-stats', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ studentId, gemsToAdd: -10 }) // Use a negative value to deduct server gems securely if needed or trust UI. Note: The backend schema only checks `gemsToAdd > 0` right now, so we need to either expand sync-stats to allow negative gems or just let UI hold it temporarily. Since it's a minor penalty, DB consistency is acceptable. Let's fix the API!
                                    }).catch(console.error);
                                }
                            }}
                            disabled={stats.gems < 10}
                            className="bg-gradient-to-r from-blue-500 to-teal-600 text-white px-8 py-3 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                        >
                            <Diamond className="w-5 h-5" /> Revivir por 10 💎
                        </button>
                    </div>
                </div>
            )}

            {/* Gem Reward Popup */}
            {gemReward && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[55] animate-bounce-in">
                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xl shadow-2xl flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Diamond className="w-8 h-8 fill-white" />
                            <span className="text-3xl">+{gemReward} 💎</span>
                        </div>
                        {stats.streak >= 1 && (
                            <div className="flex items-center gap-1 mt-1 text-amber-100 text-sm font-black bg-black/20 px-3 py-1 rounded-full uppercase tracking-widest">
                                <Flame className="w-4 h-4 fill-orange-500 text-orange-500" /> Racha x{Math.min(stats.streak, 5)}
                            </div>
                        )}
                        {wrongCount === 0 && stats.streak < 1 && (
                            <div className="mt-1 text-sm font-bold bg-white/20 px-3 py-0.5 rounded-full uppercase tracking-wider">PERFECTO</div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-4 border-amber-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                <div className="bg-amber-100 dark:bg-slate-800 p-3 sm:p-4 flex justify-between items-start border-b border-amber-200 dark:border-slate-700 gap-2">
                    <h3 className="font-bold text-base sm:text-xl text-amber-900 dark:text-amber-100 flex items-start gap-2 min-w-0 flex-1">
                        <span className="text-xl sm:text-2xl flex-shrink-0 mt-0.5">{data.type === 'guided_practice' ? '🎯' : (data.type === 'boss_fight' ? '👹' : '🎒')}</span> 
                        <span className="break-words leading-tight">{data.title}</span>
                    </h3>
                    <div className="flex gap-2 items-center">
                        {/* Inline Lives/Gems/Streak */}
                        <div className="flex items-center gap-2 sm:gap-3 mr-1 sm:mr-2 bg-white/60 dark:bg-slate-700/60 px-2 sm:px-3 py-1 rounded-full">
                            <div className="flex gap-0.5 sm:gap-1 animate-fade-in-up">
                                {/* Painted hearts for current lives */}
                                {Array.from({ length: Math.max(stats.lives, 0) }).map((_, i) => (
                                    <Heart key={`full-${i}`} className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 text-red-500 fill-red-500 drop-shadow-md animate-pulse" />
                                ))}
                                {/* Empty hearts for lost lives */}
                                {Array.from({ length: Math.max(0, 3 - stats.lives) }).map((_, i) => (
                                    <Heart key={`empty-${i}`} className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 text-slate-300 fill-slate-200" />
                                ))}
                            </div>
                            <div className="hidden sm:flex items-center gap-0.5">
                                <Diamond className="w-4 h-4 text-blue-500 fill-blue-400" />
                                <span className="text-xs font-bold text-blue-600">{stats.gems}</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-0.5">
                                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                                <span className="text-xs font-bold text-orange-600">{stats.streak}</span>
                            </div>
                        </div>

                        {(data.type === 'guided_practice' || data.content?.miniGame) && showActivity && !isTeacherUnlocked && (
                            <button type="button" onClick={() => setShowTeacherAuth(!showTeacherAuth)} className="text-slate-500 hover:text-slate-700 bg-white/50 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                                👁️ Docente
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="text-amber-800 hover:text-amber-950 px-3 py-1 rounded-full bg-amber-200/50 hover:bg-amber-200 font-bold text-sm">
                            Salir
                        </button>
                    </div>
                </div>

                {showTeacherAuth && !isTeacherUnlocked && (
                    <div className="bg-slate-800 p-4 text-white flex gap-3 items-center justify-center animate-fade-in-up">
                        <span className="text-sm font-bold text-slate-300">Contraseña Docente:</span>
                        <input
                            type="password"
                            className="text-black px-3 py-1.5 rounded-lg text-sm w-32 outline-none focus:ring-2 focus:ring-teal-500"
                            value={teacherPassword}
                            onChange={e => setTeacherPassword(e.target.value)}
                            placeholder="****"
                            onKeyDown={e => e.key === 'Enter' && handleRevealAnswer()}
                        />
                        <button type="button" onClick={handleRevealAnswer} className="bg-teal-600 hover:bg-teal-500 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">
                            Desbloquear
                        </button>
                    </div>
                )}

                <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] bg-amber-50">
                    {isTeacherUnlocked && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm animate-fade-in-up">
                            <p className="font-bold flex items-center">
                                <ShieldCheck className="w-5 h-5 mr-2" />
                                Vista de Docente - Respuesta Esperada:
                            </p>
                            <div className="mt-2 text-lg font-medium prose prose-green max-w-none text-green-900">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                    {String((data as any).reto_gameplay?.respuesta_correcta || data.content?.practiceProblem?.correctValue || data.content?.miniGame?.correctAnswer || "No definida")}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                    {!showActivity ? (
                        <div className="space-y-6">
                            <div className="relative">
                                {data.type === 'guided_practice' && <span className="absolute -top-3 -right-3 z-10 bg-teal-500 text-white text-xs px-2 py-1 rounded font-bold shadow-sm">Teoría</span>}
                                {/* Use TheoryRenderer for interactive formats, fallback to PedagogicalWrapper */}
                                {(() => {
                                    if (effectiveType !== "text") {
                                        return (
                                            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-700 shadow-xl">
                                                <TheoryRenderer
                                                    presentationType={effectiveType}
                                                    title={data.title}
                                                    content={(currentChunk || "").replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName)}
                                                    rawChunks={baseChunks.map(c => (c || "").replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName))}
                                                    glossary={(data as any).glosario}
                                                    accentColor="teal"
                                                />
                                            </div>
                                        );
                                    }
                                    return (
                                        <PedagogicalWrapper
                                            content={currentChunk || ""}
                                            studentName={studentName || "Aventurero"}
                                            type={data.type === 'guided_practice' ? 'theory' : 'narrative'}
                                        />
                                    );
                                })()}
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
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg shadow-teal-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                >
                                    {currentChunkIndex < paginationChunks.length - 1 ?
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
                                className="flex items-center gap-2 text-teal-600 hover:text-slate-800 font-bold text-sm transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Volver a la Lectura
                            </button>
                            {activityStage === "practice" ? renderGuidedPractice() : renderMiniGame()}
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
                <h1 className="text-3xl font-bold text-center mb-6 text-slate-900 border-b-2 border-teal-200 pb-4">{data.title}</h1>

                <div className="space-y-6 prose prose-lg max-w-none mb-10">
                    {baseChunks.map((chunk: string, idx: number) => (
                        <div key={idx} className="mb-4">
                            <GlossaryWrapper
                                text={(chunk || "")
                                    .replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)
                                    .replace(/<br\s*\/?>/gi, '\n\n')
                                    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                                    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                                    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                                    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                                }
                                glossaryItems={(data as any).glosario || []}
                            />
                        </div>
                    ))}
                </div>

                <div className="border-t-4 border-teal-500 pt-6 mt-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Actividad Práctica</h2>
                    {data.type === 'guided_practice' ? (
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <div className="prose max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
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
