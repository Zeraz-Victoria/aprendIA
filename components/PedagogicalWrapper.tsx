import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ChevronRight, ChevronLeft, ChevronDown, CheckCircle, Bot, MessageCircle } from 'lucide-react';
interface PedagogicalWrapperProps {
    content: string;
    studentName: string;
    type?: 'narrative' | 'theory' | 'statement';
}

const markdownComponents: any = {
    code({ node, inline, className, children, ...props }: any) {
        return (
            <code className="bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 text-indigo-600 dark:text-indigo-400 font-bold" {...props}>
                {children}
            </code>
        );
    },
    a({ node, children, href, ...props }: any) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline decoration-2 decoration-indigo-300 underline-offset-2" {...props}>{children}</a>;
    },
    blockquote({ node, children, ...props }: any) {
        return <blockquote className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-r-xl italic my-4 text-slate-700 dark:text-slate-300" {...props}>{children}</blockquote>;
    },
    ul({ node, children, ...props }: any) {
        return <ul className="list-disc pl-6 space-y-2 my-4" {...props}>{children}</ul>;
    },
    ol({ node, children, ...props }: any) {
        return <ol className="list-decimal pl-6 space-y-2 my-4 font-bold text-slate-700 dark:text-slate-300" {...props}>{children}</ol>;
    },
};

const formatText = (text: string, studentName: string) => {
    if (!text) return "";
    return text
        .replace(/\[NOMBRE_DEL_ESTUDIANTE\]/gi, studentName)
        // Clean up basic HTML tags that Gemini sometimes spits out
        .replace(/<br\s*\/?>/gi, '\n\n')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*');
};

const FlashcardView = ({ paragraphs }: { paragraphs: string[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-6">
            <div className="w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border-b-4 border-indigo-200 dark:border-indigo-900 min-h-[250px] flex items-center justify-center relative overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="absolute top-0 right-0 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-bl-xl font-bold text-sm">
                    {currentIndex + 1} / {paragraphs.length}
                </div>
                <div className="prose prose-lg dark:prose-invert text-center max-w-full break-all">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                        {paragraphs[currentIndex]}
                    </ReactMarkdown>
                </div>
            </div>

            <div className="flex gap-4 w-full justify-between">
                <button
                    onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" /> Anterior
                </button>
                <div className="flex gap-1 items-center">
                    {paragraphs.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-300 dark:bg-slate-600'}`} />
                    ))}
                </div>
                <button
                    onClick={() => setCurrentIndex(p => Math.min(paragraphs.length - 1, p + 1))}
                    disabled={currentIndex === paragraphs.length - 1}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 rounded-full font-bold text-indigo-700 dark:text-indigo-300 disabled:opacity-50 transition-colors"
                >
                    Siguiente <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const ChatBubbleDialogue = ({ paragraphs }: { paragraphs: string[] }) => {
    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
            {paragraphs.map((paragraph, index) => {
                const isStudent = index % 2 !== 0; // Alternate between teacher (Bot) and student style

                return (
                    <div key={index} className={`flex w-full ${isStudent ? 'justify-end' : 'justify-start'} animate-fade-in-up`} style={{ animationDelay: `${index * 150}ms` }}>
                        <div className={`flex max-w-[85%] gap-3 ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-1">
                                {isStudent ? (
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border-2 border-emerald-500 flex items-center justify-center">
                                        <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border-2 border-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                )}
                            </div>

                            {/* Bubble */}
                            <div className={`p-4 rounded-2xl shadow-sm min-w-0 overflow-hidden break-all ${isStudent
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-tr-sm'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-md'
                                }`}>
                                <div className="prose prose-md dark:prose-invert max-w-full">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                                        {paragraph}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div >
    );
};

const StepByStepAccordion = ({ paragraphs }: { paragraphs: string[] }) => {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-3">
            {paragraphs.map((paragraph, index) => {
                const isOpen = openIndex === index;
                let title = `Paso ${index + 1}`;
                const firstSentenceMatch = paragraph.match(/^.*?[.?!](?=\s|$)/);
                if (firstSentenceMatch && firstSentenceMatch[0].length < 60) {
                    title = firstSentenceMatch[0].replace(/\*\*/g, ''); // strip markdown bold
                } else if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                    title = `Punto ${index + 1}`;
                }

                return (
                    <div key={index} className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-indigo-400 dark:border-indigo-600 shadow-md transform scale-[1.02]' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                        <button
                            onClick={() => setOpenIndex(isOpen ? -1 : index)}
                            className={`w-full flex items-center justify-between p-4 font-bold text-left transition-colors ${isOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'}`}
                        >
                            <span className="flex items-center gap-3">
                                <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                    {index + 1}
                                </span>
                                {title}
                            </span>
                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
                        </button>

                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-6 bg-white dark:bg-slate-800 prose prose-lg dark:prose-invert max-w-full break-all border-t border-slate-100 dark:border-slate-700/50">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                                    {paragraph}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default function PedagogicalWrapper({ content, studentName, type = 'theory' }: PedagogicalWrapperProps) {
    const formattedContent = formatText(content, studentName);

    // Split into paragraphs (splitting by double newline)
    const rawParagraphs = formattedContent.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    // If it's just one paragraph or very short, don't overcomplicate, render normal Markdown but beautifully wrapped
    if (rawParagraphs.length === 0) return null;

    if (rawParagraphs.length === 1) {
        return (
            <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border ${type === 'narrative' ? 'border-amber-200 bg-amber-50/50' : 'border-indigo-100'} overflow-hidden break-all`}>
                <div className="prose prose-lg dark:prose-invert max-w-full leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                        {formattedContent}
                    </ReactMarkdown>
                </div>
            </div>
        );
    }

    // Heuristics to choose visual wrapper based on content shape & type

    // 1. If it has many bullet points, Accordion is good
    const hasManyLists = rawParagraphs.some(p => p.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* ')).length > 2);

    // 2. Chat Dialogue is cool for narrative/stories
    const isNarrative = type === 'narrative';

    // Deterministic random choice based on string length so it doesn't flicker on re-renders
    const hash = formattedContent.length % 3;

    if (hasManyLists || (hash === 2 && !isNarrative)) {
        return <StepByStepAccordion paragraphs={rawParagraphs} />;
    }

    if (isNarrative || hash === 1) {
        return <ChatBubbleDialogue paragraphs={rawParagraphs} />;
    }

    // Default to Flashcards for theory chunks
    return <FlashcardView paragraphs={rawParagraphs} />;
}
