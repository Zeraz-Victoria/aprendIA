"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface WordSearchProps {
    words: string[];
    onComplete: () => void;
}

interface CellPos {
    r: number;
    c: number;
}

const GRID_SIZE = 10;
const DIRECTIONS = [
    { r: 0, c: 1 },  // Horizontal Right
    { r: 1, c: 0 },  // Vertical Down
    // For kids, let's stick to easy directions (no backwards, no diagonals to keep it simple but fun)
];

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

export default function WordSearch({ words, onComplete }: WordSearchProps) {
    const [grid, setGrid] = useState<string[][]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
    const [selectionStart, setSelectionStart] = useState<CellPos | null>(null);
    const [hoverCell, setHoverCell] = useState<CellPos | null>(null);

    // Normalize words
    const cleanWords = useMemo(() => {
        return words.map(w => w.toUpperCase().replace(/[^A-ZÑ]/g, "").trim()).filter(w => w.length > 0 && w.length <= GRID_SIZE);
    }, [words]);

    const generateGrid = useCallback(() => {
        let newGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
        let wordsPlaced: string[] = [];

        for (const word of cleanWords) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 100) {
                const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
                const startR = Math.floor(Math.random() * GRID_SIZE);
                const startC = Math.floor(Math.random() * GRID_SIZE);

                // Check bounds
                if (
                    startR + dir.r * (word.length - 1) >= GRID_SIZE ||
                    startC + dir.c * (word.length - 1) >= GRID_SIZE
                ) {
                    attempts++;
                    continue;
                }

                // Check collisions
                let collision = false;
                for (let i = 0; i < word.length; i++) {
                    const r = startR + dir.r * i;
                    const c = startC + dir.c * i;
                    if (newGrid[r][c] !== "" && newGrid[r][c] !== word[i]) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    for (let i = 0; i < word.length; i++) {
                        const r = startR + dir.r * i;
                        const c = startC + dir.c * i;
                        newGrid[r][c] = word[i];
                    }
                    wordsPlaced.push(word);
                    placed = true;
                }
                attempts++;
            }
        }

        // Fill empty
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (newGrid[r][c] === "") {
                    newGrid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
                }
            }
        }

        setGrid(newGrid);
        setFoundWords([]);
        setFoundCells(new Set());
        setSelectionStart(null);
    }, [cleanWords]);

    // Use a stable string key to prevent unnecessary regenerations if parent re-renders
    const wordsKey = cleanWords.join(',');

    useEffect(() => {
        if (cleanWords.length > 0) {
            generateGrid();
        } else {
            // Failsafe if no valid words
            onComplete();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wordsKey]); // Only regenerate when the actual words change

    const getCellsInPath = (start: CellPos, end: CellPos): CellPos[] => {
        const dr = end.r - start.r;
        const dc = end.c - start.c;
        const steps = Math.max(Math.abs(dr), Math.abs(dc));

        // Must be a straight line (horizontal, vertical, or diagonal)
        if (steps === 0) return [start];
        if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return []; // Not straight/diagonal

        const stepR = dr / steps;
        const stepC = dc / steps;

        const path: CellPos[] = [];
        for (let i = 0; i <= steps; i++) {
            path.push({ r: Math.round(start.r + stepR * i), c: Math.round(start.c + stepC * i) });
        }
        return path;
    };

    const handleCellClick = (r: number, c: number) => {
        if (!selectionStart) {
            setSelectionStart({ r, c });
            setHoverCell({ r, c });
        } else {
            // Finish selection
            const end = { r, c };
            const path = getCellsInPath(selectionStart, end);
            if (path.length > 0) {
                const wordExtracted = path.map(p => grid[p.r][p.c]).join('');
                const wordRev = wordExtracted.split('').reverse().join('');

                // Sometimes rounding or fast mouse movement misses the exact final letter length if not perfectly aligned to a square grid dimension.
                // It's a kids game, so if they select a prefix/exact match we can be a bit forgiving, but let's stick to exact path matching first with the rounding fix above.
                const matchedWord = cleanWords.find(w => !foundWords.includes(w) && (w === wordExtracted || w === wordRev));

                if (matchedWord) {
                    const newFoundWords = [...foundWords, matchedWord];
                    setFoundWords(newFoundWords);

                    const newFoundCells = new Set(foundCells);
                    path.forEach(p => newFoundCells.add(`${p.r},${p.c}`));
                    setFoundCells(newFoundCells);

                    if (newFoundWords.length === cleanWords.length) {
                        setTimeout(onComplete, 1500);
                    }
                }
            }
            setSelectionStart(null);
            setHoverCell(null);
        }
    };

    const currentSelectionPath = useMemo(() => {
        if (!selectionStart || !hoverCell) return [];
        return getCellsInPath(selectionStart, hoverCell).map(p => `${p.r},${p.c}`);
    }, [selectionStart, hoverCell]);

    if (grid.length === 0) return <div className="p-8 text-center text-indigo-500 font-bold animate-pulse">Generando juego...</div>;

    return (
        <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-sm border-2 border-indigo-100">
            <h2 className="text-2xl font-bold text-indigo-900 mb-2 font-display">Sopa de Letras</h2>
            <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">Toca la primera y la última letra de las palabras escondidas.</p>

            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start w-full justify-center">
                {/* Grid */}
                <div
                    className="grid gap-1.5 p-3 sm:p-4 bg-indigo-50 rounded-2xl shadow-inner border border-indigo-100"
                    style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                    onMouseLeave={() => setHoverCell(null)}
                >
                    {grid.map((row, r) =>
                        row.map((char, c) => {
                            const isFound = foundCells.has(`${r},${c}`);
                            const isSelected = currentSelectionPath.includes(`${r},${c}`);
                            const isStart = selectionStart?.r === r && selectionStart?.c === c;

                            return (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => handleCellClick(r, c)}
                                    onMouseEnter={() => selectionStart && setHoverCell({ r, c })}
                                    className={`
                                        w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-200
                                        flex items-center justify-center select-none
                                        ${isFound ? 'bg-green-400 text-white shadow-sm scale-[0.98]' :
                                            isSelected ? 'bg-amber-300 text-amber-900 shadow-md scale-105' :
                                                isStart ? 'bg-amber-400 text-white shadow-md scale-110' :
                                                    'bg-white text-slate-700 hover:bg-indigo-100 shadow-sm hover:-translate-y-0.5'}
                                    `}
                                >
                                    {char}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Word List */}
                <div className="flex flex-col gap-3 w-full md:w-48">
                    <h3 className="font-bold text-slate-700 text-center md:text-left mb-2">Palabras a buscar:</h3>
                    {cleanWords.map(word => {
                        const wordFound = foundWords.includes(word);
                        return (
                            <div
                                key={word}
                                className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl transition-all duration-300 ${wordFound ? 'bg-green-100 text-green-700 strike line-through opacity-60' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
                            >
                                {wordFound ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <div className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-slate-300" />}
                                <span className="font-bold tracking-wide text-sm">{word}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {foundWords.length === cleanWords.length && cleanWords.length > 0 && (
                <div className="mt-8 text-center animate-bounce-slow">
                    <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                    <h3 className="text-2xl font-black text-amber-500">¡Reto Completado!</h3>
                </div>
            )}
        </div>
    );
}
