"use client";

import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ChevronLeft, ChevronRight, RotateCcw, Lightbulb, BookOpen, Grid3X3, Network, Palette } from "lucide-react";

// ═══════════════════════════════════════════
// THEORY RENDERER — Multiple presentation formats
// ═══════════════════════════════════════════

export type PresentationType =
    | "text"
    | "flashcards"
    | "synoptic_chart"
    | "mind_map"
    | "infographic"
    | "crossword"
    | "word_puzzle";

interface TheoryRendererProps {
    presentationType?: PresentationType;
    title?: string;
    content: string;          // markdown content
    rawChunks?: string[];     // explicit chunks from AI to use as fallback if markdown headers fail
    glossary?: { palabra: string; definicion: string }[];
    accentColor?: string;     // Tailwind color class base e.g. "orange" "cyan"
}

// ═══════════════════════════════════════════
// FLASHCARDS
// ═══════════════════════════════════════════
function FlashcardsView({ cards, accentColor }: { cards: { front: string; back: string }[]; accentColor: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const card = cards[currentIndex];

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <div className="text-xs font-bold uppercase tracking-widest text-[#2e9f6c] flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Tarjeta {currentIndex + 1} de {cards.length}
            </div>

            <div
                className="w-full max-w-sm cursor-pointer px-4"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                {!isFlipped ? (
                    <div className={`rounded-3xl p-5 flex flex-col items-center justify-center text-center bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-2xl border-2 border-teal-400/30 min-h-[160px] w-full`}>
                        <div className="text-2xl mb-2 shrink-0">📖</div>
                        <p className="text-sm font-bold leading-relaxed break-words whitespace-pre-wrap w-full">{card?.front}</p>
                        <p className="text-xs mt-3 opacity-60 shrink-0">Toca para ver respuesta</p>
                    </div>
                ) : (
                    <div className={`rounded-3xl p-5 flex flex-col items-center text-center bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-2xl border-2 border-teal-400/30 min-h-[160px] max-h-[55vh] overflow-y-auto w-full`}>
                        <div className="text-2xl mb-2 shrink-0">💡</div>
                        <p className="text-xs leading-relaxed break-words whitespace-pre-wrap w-full">{card?.back}</p>
                        <p className="text-xs mt-3 opacity-60 shrink-0">Toca para regresar</p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentIndex(Math.max(0, currentIndex - 1)); }}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-full bg-[#165b3d] text-white disabled:opacity-30 hover:bg-slate-600 transition"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-1.5 flex-wrap justify-center max-w-[200px]">
                    {cards.map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full transition ${i === currentIndex ? 'bg-[#2e9f6c]' : 'bg-slate-600'}`} />
                    ))}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1)); }}
                    disabled={currentIndex === cards.length - 1}
                    className="p-2 rounded-full bg-[#165b3d] text-white disabled:opacity-30 hover:bg-slate-600 transition"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// SYNOPTIC CHART (Cuadro Sinóptico)
// ═══════════════════════════════════════════
function SynopticChart({ title, sections, accentColor }: { title: string; sections: { heading: string; items: string[] }[]; accentColor: string }) {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <Grid3X3 className={`w-5 h-5 text-${accentColor}-400`} />
                <h3 className="text-lg font-black text-white">Cuadro Sinóptico</h3>
            </div>
            <div className="relative">
                {/* Main title */}
                <div className={`bg-gradient-to-r from-${accentColor}-600 to-${accentColor}-800 text-white font-bold px-5 py-3 rounded-2xl text-center text-sm shadow-lg mb-4`}>
                    {title}
                </div>

                <div className="space-y-3 pl-4 border-l-4 border-dashed" style={{ borderColor: `var(--tw-${accentColor}-500, #94a3b8)` }}>
                    {sections.map((section, sIdx) => (
                        <div key={sIdx} className="bg-[#0a2d1d]/80 rounded-2xl p-4 border border-[#165b3d]/50 shadow">
                            <h4 className={`font-bold text-${accentColor}-300 text-sm mb-2 flex items-center gap-2`}>
                                <span className={`w-3 h-3 rounded-full bg-${accentColor}-500 inline-block`} />
                                {section.heading}
                            </h4>
                            <ul className="space-y-1.5">
                                {section.items.map((item, iIdx) => (
                                    <li key={iIdx} className="text-[#2e9f6c] text-sm flex items-start gap-2">
                                        <span className="text-[#2e9f6c] mt-0.5">▸</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// MIND MAP (Mapa Mental)
// ═══════════════════════════════════════════
function MindMap({ centerTopic, branches, accentColor }: { centerTopic: string; branches: { label: string; children: string[] }[]; accentColor: string }) {
    const colors = ["from-pink-500 to-rose-600", "from-cyan-500 to-blue-600", "from-amber-500 to-orange-600", "from-emerald-500 to-green-600", "from-violet-500 to-purple-600", "from-red-500 to-pink-600"];

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <Network className={`w-5 h-5 text-${accentColor}-400`} />
                <h3 className="text-lg font-black text-white">Mapa Mental</h3>
            </div>

            {/* Center node */}
            <div className={`mx-auto w-fit bg-gradient-to-br from-${accentColor}-500 to-${accentColor}-700 text-white font-black px-6 py-3 rounded-full text-center text-sm shadow-2xl mb-6 border-2 border-white/20`}>
                {centerTopic}
            </div>

            {/* Branches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map((branch, bIdx) => (
                    <div key={bIdx} className="bg-[#0a2d1d]/80 rounded-2xl p-4 border border-[#165b3d]/50 shadow hover:scale-[1.02] transition-transform">
                        <div className={`bg-gradient-to-r ${colors[bIdx % colors.length]} text-white font-bold px-4 py-2 rounded-xl text-xs mb-3 shadow`}>
                            {branch.label}
                        </div>
                        <ul className="space-y-1.5 pl-2">
                            {branch.children.map((child, cIdx) => (
                                <li key={cIdx} className="text-[#2e9f6c] text-xs flex items-start gap-2">
                                    <span className="text-yellow-400 mt-0.5">★</span>
                                    <span>{child}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// INFOGRAPHIC (Infografía vertical)
// ═══════════════════════════════════════════
function Infographic({ title, steps, accentColor }: { title: string; steps: { icon: string; heading: string; text: string }[]; accentColor: string }) {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <Palette className={`w-5 h-5 text-${accentColor}-400`} />
                <h3 className="text-lg font-black text-white">Infografía</h3>
            </div>

            <div className={`bg-gradient-to-r from-${accentColor}-600 to-${accentColor}-800 text-white font-bold px-5 py-3 rounded-2xl text-center text-sm shadow-lg mb-4`}>
                {title}
            </div>

            <div className="space-y-0">
                {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 items-start">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-${accentColor}-500 to-${accentColor}-700 flex items-center justify-center text-2xl shadow-lg border-2 border-white/20 shrink-0`}>
                                {step.icon}
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`w-0.5 h-full min-h-[24px] bg-${accentColor}-700/50`} />
                            )}
                        </div>

                        <div className="bg-[#0a2d1d]/80 rounded-2xl p-4 border border-[#165b3d]/50 flex-1 mb-3 shadow">
                            <h4 className={`font-bold text-${accentColor}-300 text-sm mb-1`}>{step.heading}</h4>
                            <p className="text-[#2e9f6c] text-xs leading-relaxed">{step.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// CROSSWORD (Crucigrama from glossary)
// ═══════════════════════════════════════════
function CrosswordGame({ words, accentColor }: { words: { palabra: string; definicion: string }[]; accentColor: string }) {
    // Use a map of maps: answers[wordIdx][charIdx] = single character
    const [answers, setAnswers] = useState<Record<number, Record<number, string>>>({});
    const [revealed, setRevealed] = useState<Set<number>>(new Set());

    const getAnswer = (wordIdx: number): string => {
        const cells = answers[wordIdx] || {};
        return words[wordIdx].palabra.split("").map((_, i) => cells[i] || "").join("");
    };

    const setCell = (wordIdx: number, charIdx: number, val: string) => {
        setAnswers(prev => ({
            ...prev,
            [wordIdx]: { ...(prev[wordIdx] || {}), [charIdx]: val }
        }));
    };

    const handleCheck = (idx: number) => {
        const userAnswer = getAnswer(idx).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const correct = words[idx].palabra.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (userAnswer === correct) {
            setRevealed(prev => new Set([...prev, idx]));
        } else {
            alert("❌ No es correcto. ¡Inténtalo de nuevo!");
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <BookOpen className={`w-5 h-5 text-${accentColor}-400`} />
                <h3 className="text-lg font-black text-white">Crucigrama de Conceptos</h3>
            </div>

            <div className="space-y-3">
                {words.map((word, idx) => (
                    <div key={idx} className="bg-[#0a2d1d]/80 rounded-2xl p-4 border border-[#165b3d]/50 shadow">
                        <p className="text-[#2e9f6c] text-xs mb-2 font-medium">
                            <span className={`text-${accentColor}-400 font-black`}>{idx + 1}.</span> {word.definicion}
                        </p>

                        {revealed.has(idx) ? (
                            <div className={`bg-${accentColor}-900/50 border border-${accentColor}-700 rounded-xl px-4 py-2 text-${accentColor}-300 font-black text-sm flex items-center gap-2`}>
                                ✅ {word.palabra}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-1">
                                    {word.palabra.split("").map((_, cIdx) => (
                                        <input
                                            key={cIdx}
                                            id={`cw-${idx}-${cIdx}`}
                                            type="text"
                                            maxLength={1}
                                            inputMode="text"
                                            autoComplete="off"
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#165b3d] border border-[#165b3d] text-white text-center font-bold text-sm uppercase focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition"
                                            value={(answers[idx] || {})[cIdx] || ""}
                                            onChange={(e) => {
                                                const val = e.target.value.slice(-1);
                                                setCell(idx, cIdx, val);
                                                // Auto-focus next input
                                                if (val && cIdx < word.palabra.length - 1) {
                                                    const next = document.getElementById(`cw-${idx}-${cIdx + 1}`);
                                                    if (next) (next as HTMLInputElement).focus();
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace") {
                                                    const currentVal = (answers[idx] || {})[cIdx] || "";
                                                    if (!currentVal && cIdx > 0) {
                                                        e.preventDefault();
                                                        // Clear previous cell and focus it
                                                        setCell(idx, cIdx - 1, "");
                                                        const prev = document.getElementById(`cw-${idx}-${cIdx - 1}`);
                                                        if (prev) (prev as HTMLInputElement).focus();
                                                    }
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleCheck(idx)}
                                    className={`px-4 py-2 bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white rounded-xl font-bold text-xs transition whitespace-nowrap w-full sm:w-auto`}
                                >
                                    Verificar
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {words.length > 0 && revealed.size === words.length && (
                <div className="mt-4 bg-emerald-900/50 border border-emerald-600 rounded-2xl p-4 text-center">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="text-emerald-300 font-bold">¡Completaste el crucigrama!</p>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════
export default function TheoryRenderer({ presentationType = "text", title = "Teoría", content, rawChunks, glossary = [], accentColor = "teal" }: TheoryRendererProps) {
    const structuredData = useMemo(() => {
        const flashcards: { front: string; back: string }[] = [];
        const sections: { heading: string; items: string[] }[] = [];
        const infographicSteps: { icon: string; heading: string; text: string }[] = [];
        const mindMapBranches: { label: string; children: string[] }[] = [];
        let introText = "";

        const icons = ["📌", "🧩", "💡", "🎯", "📐", "🔬", "📊", "✏️"];

        // Strategy 1: The AI perfectly segmented chunks natively via the backend. Use this first!
        if (rawChunks && rawChunks.length > 1) {
            rawChunks.forEach((chunk, idx) => {
                if (!chunk.trim()) return;

                let heading = idx === 0 ? "Introducción" : `Sección ${idx}`;
                let body = chunk.trim();

                // Advanced regex to extract heading and body even if they are on the same line
                // Matches "## Title — Body" or "## Title: Body" or "**Title**: Body"
                const inlineMatch = chunk.match(/^(?:##+\s+|\*\*)([^*\n]+?)(?:\*\*|)?\s*[-—:]+\s+([\s\S]*)/);
                if (inlineMatch && inlineMatch[1].length < 60) {
                    heading = inlineMatch[1].trim();
                    body = inlineMatch[2].trim();
                } else {
                    // Try "## Title \n Body"
                    const blockMatch = chunk.match(/^(?:##+\s+|\*\*)([^*\n]+?)(?:\*\*|)?\s*[\r\n]+([\s\S]*)/);
                    if (blockMatch && blockMatch[1].length < 60) {
                        heading = blockMatch[1].trim();
                        body = blockMatch[2].trim();
                    } else {
                        // Looser checks for chunks that don't start with ## or **
                        const looserInlineMatch = chunk.match(/^([^*\r\n#]+?)\s*[-—:]+\s+([\s\S]*)/);
                        if (looserInlineMatch && looserInlineMatch[1].length < 60) {
                            heading = looserInlineMatch[1].trim();
                            body = looserInlineMatch[2].trim();
                        } else {
                            const looserBlockMatch = chunk.match(/^([^\r\n]+)\s*[\r\n]+([\s\S]*)/);
                            if (looserBlockMatch && looserBlockMatch[1].length < 60) {
                                heading = looserBlockMatch[1].trim();
                                body = looserBlockMatch[2].trim();
                            } else if (idx === 0) {
                                // Narrative rarely has a heading
                                introText += body + "\n\n";
                                return; // skip adding narrative as a flashcard unless it's the only one
                            }
                        }
                    }
                }

                // Split lists if present
                const rawItems = body.split("\n").map(l => l.trim()).filter(Boolean);
                const strippedItems = rawItems.map(l => l.replace(/^[-•▸*]\s*/, "").replace(/^\d+\.\s*/, ""));
                const items = rawItems.length > 1 ? strippedItems : [body];

                flashcards.push({ front: heading, back: body });
                sections.push({ heading: heading, items: items });
                infographicSteps.push({ icon: icons[idx % icons.length] || "📌", heading: heading, text: body });
                mindMapBranches.push({ label: heading, children: items.slice(0, 4) });
            });
        } 
        // Strategy 2: Fallback to old fragile markdown regex if chunks aren't passed
        else {
            const lines = content.split("\n").filter(l => l.trim());
            let currentSection: { heading: string; items: string[] } | null = null;

            lines.forEach((line) => {
                const trimmed = line.trim();
                const isMarkdownHeading = /^(#+)\s+/.test(trimmed);
                const isBoldHeading = trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4;
                const isQuestionHeading = /^[¿A-Z].*\?\s*$/.test(trimmed) && trimmed.length < 50;
                const inlineMatch = trimmed.match(/^([¿A-Z][^*\n#]{1,40})\s*[-—:]+\s+(.+)$/);
                
                if (isMarkdownHeading || isBoldHeading || isQuestionHeading || inlineMatch) {
                    const headingText = inlineMatch 
                        ? inlineMatch[1].trim() 
                        : trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/:$/, "").trim();

                    if (currentSection) {
                        sections.push(currentSection);
                        if (currentSection.items.length > 0) {
                            flashcards.push({ front: currentSection.heading, back: currentSection.items.join("\n") });
                        }
                        infographicSteps.push({ icon: icons[sections.length % icons.length], heading: currentSection.heading, text: currentSection.items.join(" ") });
                        mindMapBranches.push({ label: currentSection.heading, children: currentSection.items.slice(0, 4) });
                    }
                    const firstItem = inlineMatch ? inlineMatch[2].trim() : null;
                    currentSection = { heading: headingText, items: firstItem ? [firstItem] : [] };
                } else if (currentSection && trimmed.length > 0) {
                    const cleanLine = trimmed.replace(/^[-•▸*]\s*/, "");
                    if (cleanLine.length > 0) {
                        currentSection.items.push(cleanLine);
                    }
                } else if (!currentSection && trimmed.length > 0) {
                    introText += trimmed + "\n\n";
                }
            });

            if (currentSection && (currentSection as any).items?.length > 0) {
                sections.push(currentSection);
                flashcards.push({ front: (currentSection as any).heading, back: (currentSection as any).items.join("\n") });
                infographicSteps.push({ icon: icons[sections.length % icons.length], heading: (currentSection as any).heading, text: (currentSection as any).items.join(" ") });
                mindMapBranches.push({ label: (currentSection as any).heading, children: (currentSection as any).items.slice(0, 4) });
            }

            if (flashcards.length === 0) {
                flashcards.push({ front: title || "Teoría", back: content.substring(0, 3000) });
                sections.push({ heading: title || "Teoría", items: [content] });
                infographicSteps.push({ icon: "📌", heading: title || "Teoría", text: content });
                mindMapBranches.push({ label: title || "Teoría", children: [content] });
            }
        }

        // Add glossary as extra flashcards
        glossary.forEach(g => {
            flashcards.push({ front: g.palabra, back: g.definicion });
        });

        return { flashcards, sections, infographicSteps, mindMapBranches, introText: introText.trim() };
    }, [content, title, glossary, rawChunks]);

    // Format-specific badges
    const formatLabel: Record<string, { icon: string; name: string }> = {
        text: { icon: "📖", name: "Lectura" },
        flashcards: { icon: "🃏", name: "Tarjetas" },
        synoptic_chart: { icon: "📊", name: "Cuadro Sinóptico" },
        mind_map: { icon: "🧠", name: "Mapa Mental" },
        infographic: { icon: "🎨", name: "Infografía" },
        crossword: { icon: "✏️", name: "Crucigrama" },
        word_puzzle: { icon: "🔍", name: "Sopa de Letras" },
    };

    const badge = formatLabel[presentationType] || formatLabel.text;

    return (
        <div className="w-full overflow-hidden">
            {/* Format badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-${accentColor}-900/50 border border-${accentColor}-700/50 text-${accentColor}-300 text-xs font-bold mb-6`}>
                <span>{badge.icon}</span> {badge.name}
            </div>

            {/* Introductory Story (if not rendered by full-text views below) */}
            {structuredData.introText && presentationType !== "text" && presentationType !== "word_puzzle" && presentationType !== "crossword" && (
                <div className="prose prose-invert prose-sm max-w-none mb-8 text-slate-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {structuredData.introText}
                    </ReactMarkdown>
                </div>
            )}

            {/* Render based on type */}
            {presentationType === "flashcards" && (
                <FlashcardsView cards={structuredData.flashcards} accentColor={accentColor} />
            )}

            {presentationType === "synoptic_chart" && (
                <SynopticChart title={title} sections={structuredData.sections} accentColor={accentColor} />
            )}

            {presentationType === "mind_map" && (
                <MindMap centerTopic={title} branches={structuredData.mindMapBranches} accentColor={accentColor} />
            )}

            {presentationType === "infographic" && (
                <Infographic title={title} steps={structuredData.infographicSteps} accentColor={accentColor} />
            )}

            {presentationType === "crossword" && glossary.length > 0 && (
                <CrosswordGame words={glossary} accentColor={accentColor} />
            )}

            {/* Siempre mostramos el texto si es 'text', 'word_puzzle' o 'crossword', para que el alumno pueda leer la teoría mientras resuelve el crucigrama */}
            {(presentationType === "text" || presentationType === "word_puzzle" || presentationType === "crossword") && (
                <div className="prose prose-invert prose-sm max-w-none mt-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {content}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
}
