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

                    // Re-sequence day numbers and remove old boss fights
                    newNodes = newNodes.map((n, i) => {
                        let safeType = n.type;
                        if (safeType === "boss_fight" && i !== newNodes.length - 1) {
                            safeType = "guided_practice";
                        }
                        return {
                            ...n,
                            type: safeType,
                            dayNumber: i + 1
                        } as LevelContent;
                    });

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

    const handleRetryDayBake = async (nodeIndex: number) => {
        const node = nodes[nodeIndex];
        // Optimistic UI for specifically this node
        const updatedNodes = [...nodes];
        updatedNodes[nodeIndex] = { ...node, isRetrying: true, isGenerating: true };
        setNodes(updatedNodes);

        try {
            const payload = {
                day: node,
                pedagogy: initialWorld?.pedagogy || { topic: title, pda: "General", grade: "Fase General" },
                theme: theme,
                documentText: (node as any).session_start || node.title || "Generación solicitada manualmente por el profesor",
                isFinalBoss: (node as any).isFinalBoss || false
            };

            const res = await fetch('/api/ai/generate-day', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const bakedStory = await res.json();
                const finishedNodes = [...updatedNodes];
                finishedNodes[nodeIndex] = {
                    ...node,
                    narrative: bakedStory.narrative,
                    content: bakedStory.content,
                    presentationType: bakedStory.presentationType || "text",
                    glosario: bakedStory.glosario || [],
                    isGenerating: false,
                    isRetrying: false
                };
                setNodes(finishedNodes);

                if (initialWorld) {
                    const savedWorld = {
                        ...initialWorld,
                        days: finishedNodes
                    };
                    updateWorld(savedWorld);
                }
            } else {
                const finishedNodes = [...updatedNodes];
                finishedNodes[nodeIndex] = { ...node, isRetrying: false, isGenerating: false };
                setNodes(finishedNodes);
                alert("Error de la IA al reintentar generar esta sesión.");
            }
        } catch (e) {
            console.error(e);
            const finishedNodes = [...updatedNodes];
            finishedNodes[nodeIndex] = { ...node, isRetrying: false, isGenerating: false };
            setNodes(finishedNodes);
            alert("Error de red al intentar reconectar con la IA.");
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

            element.style.display = "block";
            element.style.position = "absolute";
            element.style.top = "0";
            element.style.left = "0";
            element.style.width = "900px";
            element.style.zIndex = "9990";
            element.style.overflow = "visible";

            await new Promise(resolve => setTimeout(resolve, 600));

            // PDF setup
            const pdfWidth = 210;  // A4 mm
            const pdfPageHeight = 297;
            const margin = 10;
            const contentWidth = pdfWidth - (margin * 2);
            const maxContentHeight = pdfPageHeight - (margin * 2);

            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            // Capture each child section individually to avoid cutting text
            const sections = element.querySelectorAll("[data-pdf-section]");
            let currentY = margin;

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i] as HTMLElement;

                // Safari workaround + capture
                await toCanvas(section, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: false }).catch(() => { });
                const sectionCanvas = await toCanvas(section, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: false });

                const scale = contentWidth / sectionCanvas.width; // mm per pixel
                const sectionHeightMm = sectionCanvas.height * scale;

                // If section won't fit on current page, start a new page
                if (currentY + sectionHeightMm > pdfPageHeight - margin && currentY > margin + 5) {
                    pdf.addPage();
                    currentY = margin;
                }

                // If section is taller than a full page, we need to slice it
                if (sectionHeightMm > maxContentHeight) {
                    const pageHeightInPx = maxContentHeight / scale;
                    const totalSlices = Math.ceil(sectionCanvas.height / pageHeightInPx);

                    for (let s = 0; s < totalSlices; s++) {
                        if (s > 0) { pdf.addPage(); currentY = margin; }

                        const sliceCanvas = document.createElement("canvas");
                        sliceCanvas.width = sectionCanvas.width;
                        const sliceH = Math.min(pageHeightInPx, sectionCanvas.height - (s * pageHeightInPx));
                        sliceCanvas.height = sliceH;

                        const ctx = sliceCanvas.getContext("2d");
                        if (ctx) {
                            ctx.fillStyle = "#ffffff";
                            ctx.fillRect(0, 0, sliceCanvas.width, sliceH);
                            ctx.drawImage(sectionCanvas, 0, s * pageHeightInPx, sectionCanvas.width, sliceH, 0, 0, sliceCanvas.width, sliceH);
                        }

                        const imgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
                        pdf.addImage(imgData, "JPEG", margin, currentY, contentWidth, sliceH * scale);
                        currentY += sliceH * scale + 4;
                    }
                } else {
                    const imgData = sectionCanvas.toDataURL("image/jpeg", 0.92);
                    pdf.addImage(imgData, "JPEG", margin, currentY, contentWidth, sectionHeightMm);
                    currentY += sectionHeightMm + 4; // 4mm gap between sections
                }
            }

            pdf.save(`Guia-Docente-${title.replace(/\s+/g, '-')}.pdf`);

        } catch (error: any) {
            console.error("Error generating PDF:", error);
            alert(`Hubo un error al generar la guía en PDF: ${error?.message || 'Error desconocido'}`);
        } finally {
            const element = document.getElementById("full-map-pdf-container");
            if (element) {
                element.style.display = "none";
                element.style.position = "absolute";
                element.style.top = "-9999px";
                element.style.left = "-9999px";
                element.style.zIndex = "";
            }
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
            <header className="flex flex-wrap gap-4 justify-between items-center p-6 bg-white border-b border-slate-200">
                <div className="flex-1 min-w-[300px]">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl font-black text-slate-800 bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-slate-100 rounded px-2 w-full max-w-md"
                    />
                    <div className="flex gap-4 mt-2 px-2 items-center">
                        <label className="text-sm font-medium text-slate-500 whitespace-nowrap shrink-0">Tema Visual:</label>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            className="text-sm bg-slate-100 border-none rounded px-2 py-1 text-indigo-700 font-bold outline-none cursor-pointer shrink-0"
                        >
                            <option value="detective">Detective / Misterio</option>
                            <option value="space">Aventura Espacial</option>
                            <option value="fantasy">Fantasía Épica</option>
                        </select>
                        <div className="w-px h-6 bg-slate-200 mx-2 shrink-0"></div>
                        <label className="text-sm font-medium text-slate-500 whitespace-nowrap shrink-0">Asignar a:</label>
                        <div className="flex gap-2 flex-wrap items-center">
                            <button
                                onClick={() => setSelectedClassrooms([])}
                                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap shrink-0 ${selectedClassrooms.length === 0 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                                    className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${selectedClassrooms.includes(c.id) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border hover:border-indigo-300 text-slate-600'}`}
                                >
                                    <span>{c.emoji}</span> <span className="max-w-[100px] truncate">{c.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                        onClick={handleDownloadCompleteMapPdf} disabled={isDownloadingPdf}
                        className="bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 px-4 py-2 rounded-full font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                        {isDownloadingPdf ? <Sparkles className="w-4 h-4 animate-spin text-sky-500 shrink-0" /> : <Download className="w-4 h-4 text-sky-500 shrink-0" />}
                        {isDownloadingPdf ? "Generando..." : "Descargar Guía PDF"}
                    </button>
                    <button
                        onClick={() => setShowAIPrompt(true)}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-4 py-2 rounded-full font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" /> Auto-Generar con IA
                    </button>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-5 py-2 rounded-full font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0">
                        <X className="w-5 h-5 shrink-0" /> Cerrar
                    </button>
                    <button
                        onClick={handleSaveWorld}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-indigo-200 transition flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                        <Save className="w-4 h-4 shrink-0" /> Guardar Mundo
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
                                {(node.isGenerating ||
                                    (node.type !== 'boss_fight' && (node as DayContent).narrative?.includes('Generando contenido con IA')) ||
                                    (node.type === 'boss_fight' && ((node as BossDayContent).originalProblemText?.includes('Generando contenido con IA') || (node as any).content?.originalProblemText?.includes('Generando contenido con IA')))
                                ) && (
                                        <div className="mt-3">
                                            <button
                                                onClick={() => handleRetryDayBake(i)}
                                                disabled={node.isRetrying}
                                                className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition disabled:opacity-50"
                                            >
                                                {node.isRetrying ? <Sparkles className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                                {node.isRetrying ? 'Reconstruyendo...' : 'Reintentar Generación con IA'}
                                            </button>
                                            {!node.isRetrying && <p className="text-xs text-slate-400 mt-1">Este nivel quedó atascado. Haz clic para forzar su regeneración.</p>}
                                        </div>
                                    )}
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

            {/* Loading Overlay for PDF */}
            {isDownloadingPdf && (
                <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-16 h-16 text-sky-400 animate-spin mb-6" />
                    <h2 className="text-3xl font-bold text-white mb-2">Construyendo Guía Docente...</h2>
                    <p className="text-slate-300 text-lg">Ensamblando el mundo de aprendizaje. Esto tomará unos segundos.</p>
                </div>
            )}

            {/* Hidden Container for PDF Download (Complete Map / Teacher Guide) */}
            <div
                id="full-map-pdf-container"
                className="bg-white p-10 text-black"
                style={{ display: "none", position: "absolute", top: "-9999px", left: "-9999px", width: "900px", minHeight: "100vh" }}
            >
                <div data-pdf-section className="border-b-4 border-indigo-600 pb-6 mb-8 text-center">
                    <h1 className="text-4xl font-black text-indigo-900 mb-2">{title}</h1>
                    <p className="text-xl text-slate-600 font-medium">Guía Docente Completa • Tema: {theme}</p>
                </div>

                <div className="space-y-12">
                    {nodes.map((node, idx) => (
                        <div key={idx} data-pdf-section className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-sm break-inside-avoid">
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
