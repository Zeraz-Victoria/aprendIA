"use client";

import React, { useState } from "react";
import { Plus, Swords, Save, Settings, X, GripVertical, FileText, Target, Sparkles, Bot, Download } from "lucide-react";
import { useLearning, LearningWorld } from "@/contexts/LearningContext";
import { LevelContent, DayContent, BossDayContent } from "@/types/learning-world";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";


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


export default function VisualWorldBuilder({ onClose, initialWorld }: { onClose: () => void, initialWorld?: LearningWorld }) {
    const { addWorld, updateWorld, setActiveWorld, classrooms } = useLearning();
    const [title, setTitle] = useState(initialWorld?.title || "Nueva Aventura Épica");
    const [theme, setTheme] = useState(initialWorld?.theme || "detective");
    const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
        initialWorld?.classrooms?.map((c: any) => c.id) || []
    );

    // AI Generator State
    const [showAIPrompt, setShowAIPrompt] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiDifficulty, setAiDifficulty] = useState("Básico");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    // Default starting node
    const [nodes, setNodes] = useState<LevelContent[]>(initialWorld?.days || [
        {
            dayNumber: 1,
            type: "concept_story",
            title: "Concepto Inicial",
            narrative: "Escribe la historia aquí...",
            content: { explanation: { chunks: ["Paso 1"], analogy: "Imagina que..." } }
        } as DayContent
    ]);

    const [editingNode, setEditingNode] = useState<number | null>(null);
    const [isAppendMode, setIsAppendMode] = useState(false);
    const [insertAfterDay, setInsertAfterDay] = useState<number | null>(null);

    React.useEffect(() => {
        const handleAutoTopic = (e: Event) => {
            const customEvent = e as CustomEvent<{ topic: string, append?: boolean, insertAfterDay?: number } | string>;
            if (customEvent.detail && typeof customEvent.detail === 'object') {
                setAiTopic(customEvent.detail.topic);
                if (customEvent.detail.append) {
                    setIsAppendMode(true);
                    if (customEvent.detail.insertAfterDay) {
                        setInsertAfterDay(customEvent.detail.insertAfterDay);
                    }
                }
            } else {
                setAiTopic(customEvent.detail);
            }
            setShowAIPrompt(true);
        };

        // Listen to the custom event dispatched by TeacherDashboard
        window.addEventListener('openBuilderWithAITopic', handleAutoTopic as EventListener);
        return () => window.removeEventListener('openBuilderWithAITopic', handleAutoTopic as EventListener);
    }, []);

    const handleGenerateWithAI = async () => {
        if (!aiTopic) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/ai/generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme, topic: aiTopic, difficulty: aiDifficulty })
            });
            const data = await res.json();
            if (data.days) {
                if (isAppendMode || initialWorld) {
                    const appendedDays = data.days.map((d: DayContent | BossDayContent, i: number) => ({
                        ...d,
                        title: `Repaso: ${d.title || 'Día ' + (i + 1)}`
                    }));

                    let newNodes = [...nodes];
                    if (insertAfterDay !== null) {
                        const targetIndex = newNodes.findIndex(n => n.dayNumber === insertAfterDay);
                        if (targetIndex !== -1) {
                            newNodes.splice(targetIndex + 1, 0, ...appendedDays);
                        } else {
                            newNodes = [...newNodes, ...appendedDays];
                        }
                    } else {
                        newNodes = [...newNodes, ...appendedDays];
                    }

                    // Re-sequence day numbers so the path flows sequentially
                    newNodes = newNodes.map((n, i) => ({
                        ...n,
                        dayNumber: i + 1
                    }));

                    setNodes(newNodes);

                    if (initialWorld) {
                        const updatedWorld = {
                            ...initialWorld,
                            theme,
                            title,
                            days: newNodes
                        };
                        updateWorld(updatedWorld);
                        setActiveWorld(updatedWorld.id);
                    }
                } else {
                    setNodes(data.days);
                    setTitle(data.title);
                }
                setShowAIPrompt(false);
                setAiTopic("");
                setIsAppendMode(false);
                setInsertAfterDay(null);
            } else {
                alert("Error en la respuesta de la IA.");
            }
        } catch (e) {
            console.error("Error generating with AI:", e);
            alert("Error de conexión con la IA.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddNode = (type: "concept_story" | "guided_practice" | "boss_fight") => {
        const nextDay = nodes.length + 1;
        let newNode: any = { dayNumber: nextDay as any, type, title: `Día ${nextDay}` };

        if (type === "boss_fight") {
            newNode = { ...newNode, originalProblemText: "Problema del jefe", hints: ["Pista 1"] };
        } else {
            newNode = { ...newNode, narrative: "", content: {} };
        }

        setNodes([...nodes, newNode as LevelContent]);
    };

    const handleSaveWorld = () => {
        if (initialWorld) {
            const updatedWorld = {
                ...initialWorld,
                theme,
                title,
                days: nodes,
                classroomIds: selectedClassrooms
            };
            updateWorld(updatedWorld);
            setActiveWorld(updatedWorld.id);
        } else {
            const newWorld = {
                id: crypto.randomUUID(),
                theme,
                title,
                days: nodes,
                createdAt: new Date().toISOString(),
                classroomIds: selectedClassrooms
            };
            addWorld(newWorld);
            setActiveWorld(newWorld.id);
        }
        onClose();
    };

    const handleDownloadCompleteMapPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const element = document.getElementById("full-map-pdf-container");
            if (!element) return;

            // Show element
            element.style.display = "block";

            // Wait for React and the browser to paint the DOM element
            await new Promise(resolve => setTimeout(resolve, 200));

            // Lowered scale to 1 to avoid hitting canvas max-size limits on long maps
            const canvas = await toCanvas(element, { pixelRatio: 1 });
            const imgData = canvas.toDataURL("image/png");

            const pdfWidth = 210; // 210mm is A4 width
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Create a custom-sized PDF so the whole image fits on one continuous page without crashing
            const pdf = new jsPDF({
                orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
                unit: "mm",
                format: [pdfWidth, Math.max(297, pdfHeight + 10)]
            });

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Guia-Docente-${title.replace(/\\s+/g, '-')}.pdf`);

        } catch (error: any) {
            console.error("Error generating PDF:", error);
            alert(`Hubo un error al generar la guía en PDF: ${error?.message || 'Error desconocido'}`);
        } finally {
            const element = document.getElementById("full-map-pdf-container");
            if (element) element.style.display = "none";
            setIsDownloadingPdf(false);
        }
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case "concept_story": return <FileText className="w-5 h-5" />;
            case "guided_practice": return <Target className="w-5 h-5" />;
            case "boss_fight": return <Swords className="w-5 h-5" />;
            default: return <Settings className="w-5 h-5" />;
        }
    };

    return (
        <div className="flex flex-col h-[90vh] bg-slate-50 relative">
            {/* Header */}
            <header className="flex justify-between items-center p-6 bg-white border-b border-slate-200">
                <div className="flex-1">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl font-black text-slate-800 bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-slate-100 rounded px-2 w-full max-w-md"
                    />
                    <div className="flex gap-4 mt-2 px-2 items-center">
                        <label className="text-sm font-medium text-slate-500 whitespace-nowrap">Tema Visual:</label>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            className="text-sm bg-slate-100 border-none rounded px-2 py-1 text-indigo-700 font-bold outline-none cursor-pointer"
                        >
                            <option value="detective">Detective / Misterio</option>
                            <option value="space">Aventura Espacial</option>
                            <option value="fantasy">Fantasía Épica</option>
                        </select>
                        <div className="w-px h-6 bg-slate-200 mx-2"></div>
                        <label className="text-sm font-medium text-slate-500 whitespace-nowrap">Asignar a:</label>
                        <div className="flex gap-2 flex-wrap items-center">
                            <button
                                onClick={() => setSelectedClassrooms([])}
                                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${selectedClassrooms.length === 0 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                Todos (Global)
                            </button>
                            {classrooms.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        if (selectedClassrooms.includes(c.id)) {
                                            setSelectedClassrooms(selectedClassrooms.filter(id => id !== c.id));
                                        } else {
                                            setSelectedClassrooms([...selectedClassrooms, c.id]);
                                        }
                                    }}
                                    className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 ${selectedClassrooms.includes(c.id) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border hover:border-indigo-300 text-slate-600'}`}
                                >
                                    <span>{c.emoji}</span> <span className="max-w-[100px] truncate">{c.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleDownloadCompleteMapPdf} disabled={isDownloadingPdf}
                        className="bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 px-4 py-2 rounded-full font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isDownloadingPdf ? <Sparkles className="w-4 h-4 animate-spin text-sky-500" /> : <Download className="w-4 h-4 text-sky-500" />}
                        {isDownloadingPdf ? "Generando..." : "Descargar Guía PDF"}
                    </button>
                    <button
                        onClick={() => setShowAIPrompt(true)}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-4 py-2 rounded-full font-bold shadow-sm transition flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4 text-amber-500" /> Auto-Generar con IA
                    </button>
                    <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveWorld}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-indigo-200 transition flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Guardar Mundo
                    </button>
                </div>
            </header>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto p-12 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="max-w-4xl mx-auto flex flex-col gap-6 relative">
                    {/* Path Line */}
                    <div className="absolute left-8 top-10 bottom-10 w-1 bg-indigo-200 -z-10"></div>

                    {nodes.map((node, i) => (
                        <div key={i} className="flex gap-6 items-center group">
                            {/* Node Marker */}
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-xl z-10 transition-transform ${node.type === 'boss_fight' ? 'bg-red-500 border-red-800 text-white' : 'bg-white border-indigo-500 text-indigo-600'}`}>
                                {getNodeIcon(node.type)}
                            </div>

                            {/* Node Card */}
                            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition group-hover:border-indigo-300">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-xs font-black tracking-widest text-indigo-400 uppercase">Día {i + 1} • {node.type.replace('_', ' ')}</span>
                                        <h3 className="text-xl font-bold text-slate-800">{node.title}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingNode(i)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        >
                                            <Settings className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-slate-300 hover:text-slate-600 cursor-grab">
                                            <GripVertical className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-slate-500 text-sm line-clamp-2">
                                    {node.type === 'boss_fight' ? safeParsePromptText((node as BossDayContent).originalProblemText) : safeParsePromptText((node as DayContent).narrative) || 'Sin historia configurada.'}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Add Node Buttons */}
                    <div className="flex gap-4 ml-24 mt-4">
                        <button
                            onClick={() => handleAddNode("concept_story")}
                            className="bg-white border-2 border-dashed border-indigo-200 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition"
                        >
                            <Plus className="w-5 h-5" /> Teoría / Historia
                        </button>
                        <button
                            onClick={() => handleAddNode("guided_practice")}
                            className="bg-white border-2 border-dashed border-emerald-200 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition"
                        >
                            <Plus className="w-5 h-5" /> Práctica
                        </button>
                        <button
                            onClick={() => handleAddNode("boss_fight")}
                            className="bg-white border-2 border-dashed border-red-200 text-red-600 hover:border-red-500 hover:bg-red-50 px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition"
                        >
                            <Swords className="w-5 h-5" /> Jefe Final
                        </button>
                    </div>

                </div>
            </div>

            {/* Quick Edit Overlay */}
            {editingNode !== null && (
                <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] border-l border-slate-200 flex flex-col z-20 animate-in slide-in-from-right">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Settings className="w-5 h-5 text-indigo-600" /> Editar Nodo
                        </h3>
                        <button onClick={() => setEditingNode(null)} className="p-2 hover:bg-slate-100 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-auto space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Título del Nivel</label>
                            <input
                                type="text"
                                value={nodes[editingNode].title}
                                onChange={(e) => {
                                    const curr = [...nodes];
                                    curr[editingNode].title = e.target.value;
                                    setNodes(curr);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>

                        {nodes[editingNode].type !== 'boss_fight' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Narrativa (Historia)</label>
                                    <textarea
                                        rows={4}
                                        value={(nodes[editingNode] as DayContent).narrative}
                                        onChange={(e) => {
                                            const curr = [...nodes];
                                            (curr[editingNode] as DayContent).narrative = e.target.value;
                                            setNodes(curr);
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Problema Original (Jefe)</label>
                                    <textarea
                                        rows={4}
                                        value={safeParsePromptText((nodes[editingNode] as BossDayContent).originalProblemText)}
                                        onChange={(e) => {
                                            const curr = [...nodes];
                                            (curr[editingNode] as BossDayContent).originalProblemText = e.target.value;
                                            setNodes(curr);
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                            </>
                        )}
                        <p className="text-xs text-slate-400 mt-4">* El constructor rápido solo permite edición básica de textos por ahora.</p>
                    </div>
                </div>
            )}

            {/* Hidden Container for PDF Download (Complete Map / Teacher Guide) */}
            <div
                id="full-map-pdf-container"
                className="absolute top-[-9999px] left-[-9999px] bg-white w-[900px] p-10 text-black"
                style={{ display: "none" }}
            >
                <div className="border-b-4 border-indigo-600 pb-6 mb-8 text-center">
                    <h1 className="text-4xl font-black text-indigo-900 mb-2">{title}</h1>
                    <p className="text-xl text-slate-600 font-medium">Guía Docente Completa • Tema: {theme}</p>
                </div>

                <div className="space-y-12">
                    {nodes.map((node, idx) => (
                        <div key={idx} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-sm break-inside-avoid">
                            <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${node.type === 'boss_fight' ? 'bg-red-500' : 'bg-indigo-500'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{node.title}</h2>
                                    <p className="text-sm font-bold tracking-wide text-indigo-500 uppercase">{node.type.replace('_', ' ')}</p>
                                </div>
                            </div>

                            <div className="prose prose-lg max-w-none">
                                {node.type === 'boss_fight' ? (
                                    <>
                                        <h3 className="text-lg font-bold text-slate-800">Problema Inicial (Texto del Jefe):</h3>
                                        <div className="bg-white p-4 border border-slate-300 rounded-lg whitespace-pre-wrap">
                                            {(node as BossDayContent).originalProblemText}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-lg font-bold text-slate-800 mt-2">Teoría / Historia:</h3>
                                        <div className="bg-white p-4 border border-slate-300 rounded-lg whitespace-pre-wrap">
                                            {(node as DayContent).narrative || "Sin historia configurada."}
                                        </div>

                                        {(node.type as string) === 'guided_practice' && (node as DayContent).content?.practiceProblem && (
                                            <div className="mt-4 border-t border-dashed border-slate-300 pt-4">
                                                <h3 className="text-lg font-bold text-slate-800 mt-2 text-emerald-700">Práctica / Ejercicio Sugerido:</h3>
                                                <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-lg whitespace-pre-wrap text-emerald-900">
                                                    {(node as DayContent).content?.practiceProblem?.statement || ""}
                                                    <br /><br />
                                                    <strong>Respuesta Correcta:</strong> {(node as DayContent).content?.practiceProblem?.correctValue || "N/A"}
                                                </div>
                                            </div>
                                        )}

                                        {(node as DayContent).content?.miniGame && (
                                            <div className="mt-4 border-t border-dashed border-slate-300 pt-4">
                                                <h3 className="text-lg font-bold text-slate-800 mt-2 text-amber-700">Minijuego:</h3>
                                                <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg text-amber-900">
                                                    <strong>Pregunta:</strong> {(node as DayContent).content?.miniGame?.question || "N/A"}
                                                    <br />
                                                    <strong>Opciones:</strong> {((node as DayContent).content?.miniGame?.options || []).join(', ') || "N/A"}
                                                    <br />
                                                    <strong>Respuesta:</strong> {(node as DayContent).content?.miniGame?.correctAnswer || "N/A"}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Generator Overlay */}
            {showAIPrompt && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border-4 border-amber-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-amber-100 p-3 rounded-xl border border-amber-200 text-amber-600">
                                <Bot className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Asistente Creativo IA</h3>
                                <p className="text-sm text-slate-500">Deja que Gemini construya el mundo.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">¿De qué tema matemático trata?</label>
                                <input
                                    type="text"
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                    placeholder="Ej. Fracciones, Ecuaciones Lineales..."
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Dificultad sugerida</label>
                                <select
                                    value={aiDifficulty}
                                    onChange={(e) => setAiDifficulty(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all"
                                >
                                    <option value="Básico">Fácil (Básico)</option>
                                    <option value="Intermedio">Intermedio (Retador)</option>
                                    <option value="Avanzado">Avanzado (Olimpiada)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setShowAIPrompt(false)}
                                disabled={isGenerating}
                                className="flex-1 px-4 py-3 font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGenerateWithAI}
                                disabled={isGenerating || !aiTopic}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 flex justify-center items-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {isGenerating ? (
                                    <><Sparkles className="w-5 h-5 animate-spin" /> Creando...</>
                                ) : (
                                    <><Sparkles className="w-5 h-5" /> Generar Mundo</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
