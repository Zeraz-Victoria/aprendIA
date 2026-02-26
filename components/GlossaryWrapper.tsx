"use client";

import React from "react";

interface GlossaryItem {
    palabra: string;
    definicion: string;
}

interface GlossaryWrapperProps {
    text: string;
    glossaryItems?: GlossaryItem[];
}

export default function GlossaryWrapper({ text, glossaryItems }: GlossaryWrapperProps) {
    if (!glossaryItems || glossaryItems.length === 0) {
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }

    // Escape special regex characters in the glossary words
    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    // Build a regex to match any of the glossary words (case-insensitive, whole word boundaries)
    const wordsPattern = glossaryItems.map(item => escapeRegExp(item.palabra)).join('|');
    const regex = new RegExp(`\\b(${wordsPattern})\\b`, 'gi');

    // Split the text into parts, some of which are glossary words
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, index) => {
                // Find if this part is a glossary word (case-insensitive match)
                const match = glossaryItems.find(item => item.palabra.toLowerCase() === part.toLowerCase());

                if (match) {
                    return (
                        <span key={index} className="relative group inline-block cursor-help z-10">
                            <span className="underline decoration-indigo-400 decoration-wavy text-indigo-700 dark:text-indigo-400 font-medium">
                                {part}
                            </span>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl pointer-events-none text-left z-50">
                                <strong className="block mb-1 text-indigo-300 dark:text-indigo-600 capitalize">{match.palabra}</strong>
                                {match.definicion}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
                            </span>
                        </span>
                    );
                }

                // Just regular HTML text, carefully use dangerouslySetInnerHTML
                return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
            })}
        </span>
    );
}
