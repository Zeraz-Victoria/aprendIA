"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Brain, Check } from "lucide-react";

interface Pair {
    concept: string;
    definition: string;
}

interface MemoryMatchProps {
    pairs: Pair[];
    onComplete: () => void;
}

interface CardType {
    id: string;
    text: string;
    isConcept: boolean;
    pairIndex: number;
}

export default function MemoryMatch({ pairs, onComplete }: MemoryMatchProps) {
    const [cards, setCards] = useState<CardType[]>([]);
    const [flippedIds, setFlippedIds] = useState<string[]>([]);
    const [matchedIndices, setMatchedIndices] = useState<number[]>([]);
    const [isLocking, setIsLocking] = useState(false);

    // Shuffle and setup cards
    useEffect(() => {
        if (!pairs || pairs.length === 0) {
            onComplete();
            return;
        }

        const newCards: CardType[] = [];
        pairs.forEach((p, idx) => {
            newCards.push({ id: `c_${idx}`, text: p.concept, isConcept: true, pairIndex: idx });
            newCards.push({ id: `d_${idx}`, text: p.definition, isConcept: false, pairIndex: idx });
        });

        // Simple Fisher-Yates shuffle
        for (let i = newCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
        }

        setCards(newCards);
        setFlippedIds([]);
        setMatchedIndices([]);
        setIsLocking(false);
    }, [pairs, onComplete]);

    const handleCardClick = (card: CardType) => {
        if (isLocking) return;
        if (flippedIds.includes(card.id)) return;
        if (matchedIndices.includes(card.pairIndex)) return;

        const newFlipped = [...flippedIds, card.id];
        setFlippedIds(newFlipped);

        if (newFlipped.length === 2) {
            setIsLocking(true);
            const firstCard = cards.find(c => c.id === newFlipped[0]);
            const secondCard = card;

            if (firstCard && firstCard.pairIndex === secondCard.pairIndex) {
                // Match
                setTimeout(() => {
                    const newMatched = [...matchedIndices, firstCard.pairIndex];
                    setMatchedIndices(newMatched);
                    setFlippedIds([]);
                    setIsLocking(false);

                    if (newMatched.length === pairs.length) {
                        setTimeout(onComplete, 1500);
                    }
                }, 800);
            } else {
                // No Match
                setTimeout(() => {
                    setFlippedIds([]);
                    setIsLocking(false);
                }, 1200);
            }
        }
    };

    if (cards.length === 0) return <div className="p-8 text-center text-indigo-500 font-bold animate-pulse">Generando juego...</div>;

    return (
        <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-sm border-2 border-indigo-100">
            <h2 className="text-2xl font-bold text-indigo-900 mb-2 font-display">Memorama de Conceptos</h2>
            <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">Encuentra los pares correctos relacionando el concepto con su significado.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                {cards.map(card => {
                    const isFlipped = flippedIds.includes(card.id);
                    const isMatched = matchedIndices.includes(card.pairIndex);
                    const showFace = isFlipped || isMatched;

                    return (
                        <button
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            disabled={showFace || isLocking}
                            className={`
                                relative aspect-[4/3] w-full [transform-style:preserve-3d] transition-transform duration-500 ease-out cursor-pointer
                                ${showFace ? '[transform:rotateY(180deg)]' : 'hover:-translate-y-1 hover:shadow-lg'}
                            `}
                        >
                            {/* Card Front (Face Down conceptually, but backface logic requires this to be the initial face) */}
                            <div className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl border-2 border-indigo-400 shadow-md flex items-center justify-center group z-10">
                                <Brain className="w-8 h-8 text-white/50 group-hover:text-white/80 transition-colors" />
                            </div>

                            {/* Card Back (Hidden, shown when flipped 180deg) */}
                            <div
                                className={`
                                    absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl border-2 shadow-sm
                                    flex items-center justify-center p-2
                                    ${card.isConcept ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold text-lg' : 'bg-slate-50 border-slate-200 text-slate-700 text-xs sm:text-sm font-medium'}
                                    ${isMatched ? '!bg-green-100 !border-green-300 opacity-80' : ''}
                                `}
                            >
                                <div className="flex flex-col items-center justify-center w-full h-full text-center">
                                    {isMatched && <Check className="absolute top-2 right-2 w-4 h-4 text-green-600 opacity-50" />}
                                    <span className="line-clamp-4 px-1">{card.text}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {matchedIndices.length === pairs.length && pairs.length > 0 && (
                <div className="mt-8 text-center animate-bounce-slow">
                    <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                    <h3 className="text-2xl font-black text-amber-500">¡Reto Completado!</h3>
                </div>
            )}
        </div>
    );
}
