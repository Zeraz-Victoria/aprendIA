"use client";

import React, { useState } from "react";
import { Plus, Swords, Save, Settings, X, GripVertical, FileText, Target, Sparkles, Bot, Download, Users, ChevronDown, Compass, BookOpen } from "lucide-react";
import { useLearning, LearningWorld } from "@/contexts/LearningContext";
import { LevelContent, DayContent, BossDayContent } from "@/types/learning-world";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import { THEME_LIST, ThemeKey } from "@/lib/themes";


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


export default function VisualWorldBuilder({ onClose, initialWorld, initialShowAIPrompt = false }: { onClose: () => void, initialWorld?: LearningWorld, initialShowAIPrompt?: boolean }) {
    const { addWorld, updateWorld, setActiveWorld, classrooms, students } = useLearning();
    const [title, setTitle] = useState(initialWorld?.title || "Nueva Aventura Épica");
    const [theme, setTheme] = useState(initialWorld?.theme || "detective");
    const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
        initialWorld?.classrooms?.map((c: any) => c.id) || []
    );

    // Compute which students are individually assigned (not via a classroom already assigned to this world)
    const initialAssignedClassroomIds = initialWorld?.classrooms?.map((c: any) => c.id) || [];
    const [selectedStudents, setSelectedStudents] = useState<string[]>(() => {
        const allAssigned = initialWorld?.assignedStudents?.map((s: any) => s.id) || [];
        if (initialAssignedClassroomIds.length === 0) return allAssigned; // global — don't pre-mark everyone
        // Only mark as "individual" those who are NOT in an assigned classroom
        const classroomStudentIds = new Set(
            students
                .filter(s => s.classroomId && initialAssignedClassroomIds.includes(s.classroomId))
                .map(s => s.id)
        );
        return allAssigned.filter((id: string) => !classroomStudentIds.has(id));
    });
    const [showStudentPicker, setShowStudentPicker] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");

    // AI Generator State
    const [showAIPrompt, setShowAIPrompt] = useState(initialShowAIPrompt);
    const [aiTopic, setAiTopic] = useState("");
    const [aiProblemDescription, setAiProblemDescription] = useState("");
    const [aiDifficulty, setAiDifficulty] = useState("Básico");
    const [aiPhase, setAiPhase] = useState("3"); // Phase 1-6
    const [aiSessionCount, setAiSessionCount] = useState(3);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    // Default starting node
    const [nodes, setNodes] = useState<LevelContent[]>(initialShowAIPrompt ? [] : (initialWorld?.days || [
        {
            dayNumber: 1,
            type: "concept_story",
            title: "Concepto Inicial",
            narrative: "Escribe la historia aquí...",
            content: { explanation: { chunks: ["Paso 1"], analogy: "Imagina que..." } }
        } as DayContent
    ]));

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
                body: JSON.stringify({ 
                    theme, 
                    topic: aiTopic, 
                    problemDescription: aiProblemDescription,
                    difficulty: aiDifficulty, 
                    phase: aiPhase, 
                    sessionCount: aiSessionCount 
                })
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

    const handleRepairAllStuckLevels = async () => {
        const stuckIndices = nodes.map((n, i) => {
            const isStuck = (n.type !== 'boss_fight' && (n as DayContent).narrative?.includes('Generando contenido con IA')) ||
                (n.type === 'boss_fight' && ((n as BossDayContent).originalProblemText?.includes('Generando contenido con IA') || (n as any).content?.originalProblemText?.includes('Generando contenido con IA')));
            return isStuck ? i : -1;
        }).filter(idx => idx !== -1);

        if (stuckIndices.length === 0) {
            alert("No se encontraron sesiones atascadas.");
            return;
        }

        if (!confirm(`Se encontraron ${stuckIndices.length} sesiones incompletas. ¿Deseas repararlas todas automáticamente?`)) return;

        for (const idx of stuckIndices) {
            await handleRetryDayBake(idx);
            // Small pause to avoid hitting rate limits too hard
            await new Promise(r => setTimeout(r, 2000));
        }
        alert("Proceso de reparación finalizado.");
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
                
                // Fetch the MOST CURRENT nodes state (in case others updated in background)
                setNodes(prev => {
                    const finishedNodes = [...prev];
                    finishedNodes[nodeIndex] = {
                        ...node,
                        narrative: bakedStory.narrative,
                        content: bakedStory.content,
                        presentationType: bakedStory.presentationType || "text",
                        glosario: bakedStory.glosario || [],
                        isGenerating: false,
                        isRetrying: false
                    };
                    
                    if (initialWorld) {
                        const savedWorld = {
                            ...initialWorld,
                            days: finishedNodes
                        };
                        updateWorld(savedWorld);
                    }
                    return finishedNodes;
                });
            } else {
                setNodes(prev => {
                    const finishedNodes = [...prev];
                    finishedNodes[nodeIndex] = { ...node, isRetrying: false, isGenerating: false };
                    return finishedNodes;
                });
                console.error("Error de la IA al reintentar generar esta sesión.");
            }
        } catch (e) {
            console.error(e);
            setNodes(prev => {
                const finishedNodes = [...prev];
                finishedNodes[nodeIndex] = { ...node, isRetrying: false, isGenerating: false };
                return finishedNodes;
            });
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
                classroomIds: selectedClassrooms,
                studentIds: selectedStudents
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
                classroomIds: selectedClassrooms,
                studentIds: selectedStudents
            };
            addWorld(newWorld);
            setActiveWorld(newWorld.id);
        }
        onClose();
    };

    const handleDownloadCompleteMapPdf = () => {
        setIsDownloadingPdf(true);
        try {
            const pedagogy = initialWorld?.pedagogy;

            const sessionHtml = nodes.map((node, idx) => {
                const isBoss = node.type === 'boss_fight';
                const day = node as DayContent;
                const boss = node as BossDayContent;
                const miniGame = day.content?.miniGame;
                const practice = day.content?.practiceProblem;
                const explanation = day.content?.explanation;

                const headerColor = isBoss ? '#dc2626' : '#4f46e5';
                const typeLabel = isBoss ? '⚔️ Batalla Final' : node.type === 'concept_story' ? '📖 Historia Conceptual' : '✏️ Práctica Guiada';

                return `
                <div style="border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:32px;page-break-inside:avoid;">
                    <div style="background:${headerColor};padding:16px 24px;display:flex;align-items:center;gap:16px;">
                        <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:18px;flex-shrink:0;">${idx + 1}</div>
                        <div>
                            <div style="color:white;font-size:18px;font-weight:900;">${node.title}</div>
                            <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${typeLabel}</div>
                        </div>
                        ${day.pda_objetivo ? `<div style="margin-left:auto;text-align:right;"><div style="color:rgba(255,255,255,0.6);font-size:9px;font-weight:700;text-transform:uppercase;">Objetivo PDA</div><div style="color:white;font-size:11px;max-width:220px;">${day.pda_objetivo}</div></div>` : ''}
                    </div>
                    <div style="padding:24px;display:flex;flex-direction:column;gap:18px;">
                        ${isBoss ? `
                            <div>
                                <div style="font-size:10px;font-weight:900;color:#ef4444;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">⚔️ Problema del Jefe Final</div>
                                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;font-size:13px;line-height:1.7;white-space:pre-wrap;">${boss.originalProblemText || ''}</div>
                                ${boss.tipo_evidencia_requerida ? `<div style="margin-top:8px;font-size:11px;color:#64748b;"><strong>Evidencia requerida:</strong> ${boss.tipo_evidencia_requerida}</div>` : ''}
                            </div>
                        ` : `
                            ${day.narrative ? `
                                <div>
                                    <div style="font-size:10px;font-weight:900;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📖 Historia / Narrativa (Lo que lee el alumno)</div>
                                    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:16px;font-size:13px;line-height:1.7;white-space:pre-wrap;">${day.narrative}</div>
                                </div>
                            ` : ''}
                            ${explanation ? `
                                <div>
                                    <div style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🧠 Explicación Teórica</div>
                                    <div style="display:flex;flex-direction:column;gap:8px;">
                                        ${(explanation.chunks || []).map(chunk => `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:13px;">${chunk}</div>`).join('')}
                                        ${explanation.analogy ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:13px;color:#92400e;"><strong>💡 Analogía:</strong> ${explanation.analogy}</div>` : ''}
                                    </div>
                            ` : ''}
                            ${(day as any).lecturas_sugeridas && (day as any).lecturas_sugeridas.length > 0 ? `
                                <div>
                                    <div style="font-size:10px;font-weight:900;color:#047857;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📚 Lecturas Sugeridas (Libro Físico)</div>
                                    <div style="background:#f0fbf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px;font-size:13px;color:#065f46;">
                                        ${(day as any).lecturas_sugeridas.map((lectura: any) => `
                                            <div style="line-height:1.5;">
                                                📌 Consulta la página <strong>${lectura.pagina}</strong> de tu libro de texto físico <strong>"${lectura.libro}"</strong>${lectura.tema ? ` con el tema <em>"${lectura.tema}"</em>` : ''} para profundizar en este tema.
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${practice ? `
                                <div>
                                    <div style="font-size:10px;font-weight:900;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">✏️ Problema de Práctica</div>
                                    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px;">
                                        <div style="font-size:13px;color:#1e293b;font-weight:600;">${practice.statement}</div>
                                        ${practice.hint ? `<div style="font-size:12px;color:#047857;"><strong>Pista:</strong> ${practice.hint}</div>` : ''}
                                        <div style="font-size:13px;font-weight:900;color:#065f46;">✅ Respuesta correcta: ${practice.correctValue}</div>
                                        ${practice.tipo_evidencia_requerida ? `<div style="font-size:11px;color:#64748b;"><strong>Tipo de evidencia:</strong> ${practice.tipo_evidencia_requerida}</div>` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            ${miniGame ? `
                                <div>
                                    <div style="font-size:10px;font-weight:900;color:#d97706;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🎮 Minijuego — ${miniGame.type || 'Actividad'}</div>
                                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px;font-size:13px;">
                                        ${miniGame.question ? `<div><strong>Pregunta:</strong> ${miniGame.question}</div>` : ''}
                                        ${miniGame.options && miniGame.options.length > 0 ? `
                                            <div><strong>Opciones:</strong>
                                            <ul style="margin:4px 0 0 20px;padding:0;">
                                                ${miniGame.options.map(opt => `<li style="color:${opt === miniGame.correctAnswer ? '#065f46' : '#374151'};font-weight:${opt === miniGame.correctAnswer ? '700' : '400'};">${opt} ${opt === miniGame.correctAnswer ? '✅' : ''}</li>`).join('')}
                                            </ul></div>
                                        ` : ''}
                                        ${miniGame.pairs && miniGame.pairs.length > 0 ? `
                                            <div><strong>Pares a conectar:</strong>
                                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;">
                                                ${miniGame.pairs.map(p => `<div style="background:white;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;font-size:12px;"><strong>${p.concept}</strong> → ${p.definition}</div>`).join('')}
                                            </div></div>
                                        ` : ''}
                                        ${miniGame.words && miniGame.words.length > 0 ? `<div><strong>Palabras:</strong> ${miniGame.words.join(', ')}</div>` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            ${day.glosario && day.glosario.length > 0 ? `
                                <div>
                                    <div style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📚 Glosario</div>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                                        ${day.glosario.map((g: any) => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:12px;"><strong>${g.term || g.palabra}:</strong> ${g.definition || g.definicion}</div>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${day.cierre_metacognicion ? `
                                <div>
                                    <div style="font-size:10px;font-weight:900;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🪞 Cierre Metacognitivo</div>
                                    <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:16px;font-size:13px;font-style:italic;color:#374151;">${day.cierre_metacognicion}</div>
                                </div>
                            ` : ''}
                        `}
                    </div>
                </div>`;
            }).join('');

            const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Guía Docente — ${title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; color: #1e293b; padding: 40px; max-width: 900px; margin: 0 auto; }
        @media print {
            body { padding: 20px; }
            button { display: none !important; }
        }
    </style>
</head>
<body>
    <div style="text-align:center;border-bottom:4px solid #4f46e5;padding-bottom:32px;margin-bottom:40px;">
        <div style="font-size:11px;font-weight:900;color:#818cf8;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Guía Docente Completa</div>
        <h1 style="font-size:32px;font-weight:900;color:#1e1b4b;margin-bottom:10px;">${title}</h1>
        <p style="font-size:15px;color:#64748b;">Tema Visual: <strong style="color:#334155;">${theme}</strong> &nbsp;•&nbsp; ${nodes.length} sesiones</p>
        ${pedagogy ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px;text-align:left;">
            ${pedagogy.pda ? `<div style="background:#eef2ff;padding:12px 16px;border-radius:10px;"><div style="font-size:10px;font-weight:900;color:#6366f1;text-transform:uppercase;margin-bottom:4px;">PDA</div><div style="font-size:13px;">${pedagogy.pda}</div></div>` : ''}
            ${pedagogy.contenidos ? `<div style="background:#f8fafc;padding:12px 16px;border-radius:10px;"><div style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Contenidos</div><div style="font-size:13px;">${pedagogy.contenidos}</div></div>` : ''}
            ${pedagogy.proposito ? `<div style="background:#ecfdf5;padding:12px 16px;border-radius:10px;grid-column:span 2;"><div style="font-size:10px;font-weight:900;color:#059669;text-transform:uppercase;margin-bottom:4px;">Propósito</div><div style="font-size:13px;">${pedagogy.proposito}</div></div>` : ''}
        </div>
        ${pedagogy.planoOficial?.secuencia_didactica ? `
        <div style="margin-top:40px;text-align:left;">
            <h2 style="font-size:20px;font-weight:900;color:#1e1b4b;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Plano Didáctico Oficial (NEM)</h2>
            ${pedagogy.planoOficial.secuencia_didactica.map((seq: any) => `
                <div style="margin-bottom:24px;background:#f8fafc;padding:20px;border-radius:12px;border:1px solid #e2e8f0;page-break-inside:avoid;">
                    <div style="font-size:16px;font-weight:900;color:#4f46e5;margin-bottom:12px;">Sesión ${seq.numero}: ${seq.titulo}</div>
                    <div style="font-size:12px;color:#64748b;margin-bottom:16px;"><strong>Duración:</strong> ${seq.duracion} | <strong>Evidencia:</strong> ${seq.evidencia}</div>
                    
                    <div style="margin-bottom:12px;">
                        <strong style="font-size:12px;color:#0f172a;">INICIO:</strong>
                        <ul style="font-size:13px;color:#334155;margin-left:20px;margin-top:6px;line-height:1.5;">
                            ${seq.inicio ? seq.inicio.map((i: string) => `<li>${i}</li>`).join('') : ''}
                        </ul>
                    </div>
                    
                    <div style="margin-bottom:12px;">
                        <strong style="font-size:12px;color:#0f172a;">DESARROLLO (Modelaje y Acción):</strong>
                        <ul style="font-size:13px;color:#334155;margin-left:20px;margin-top:6px;line-height:1.5;">
                            ${seq.desarrollo ? seq.desarrollo.map((d: string) => `<li>${d}</li>`).join('') : ''}
                        </ul>
                    </div>
                    
                    <div>
                        <strong style="font-size:12px;color:#0f172a;">CIERRE:</strong>
                        <ul style="font-size:13px;color:#334155;margin-left:20px;margin-top:6px;line-height:1.5;">
                            ${seq.cierre ? seq.cierre.map((c: string) => `<li>${c}</li>`).join('') : ''}
                        </ul>
                    </div>
                    
                    ${(() => {
                        const relatedNode = nodes[seq.numero - 1] as any;
                        const readings = relatedNode?.lecturas_sugeridas || [];
                        if (readings.length === 0) return '';
                        return `
                        <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #cbd5e1;">
                            <strong style="font-size:12px;color:#0f172a;">📚 LECTURAS SUGERIDAS (LIBRO FÍSICO):</strong>
                            <ul style="font-size:12px;color:#047857;margin-left:20px;margin-top:6px;line-height:1.5;list-style-type:none;padding-left:0;">
                                ${readings.map((lectura: any) => `
                                    <li style="margin-bottom:4px;">
                                        📌 Consulta la página <strong>${lectura.pagina}</strong> de tu libro de texto físico <strong>"${lectura.libro}"</strong>${lectura.tema ? ` con el tema <em>"${lectura.tema}"</em>` : ''} para profundizar en este tema.
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        `;
                    })()}
                </div>
            `).join('')}
        </div>
        <div style="page-break-after:always; margin-top:40px;"></div>
        ` : ''}` : ''}
    </div>

    <div style="text-align:center;margin-bottom:32px;">
        <button onclick="window.print()" style="background:#4f46e5;color:white;border:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;">🖨️ Guardar / Imprimir como PDF</button>
    </div>

    ${sessionHtml}
</body>
</html>`;

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio e intenta de nuevo.');
                return;
            }
            printWindow.document.write(htmlContent);
            printWindow.document.close();

        } catch (error: any) {
            console.error("Error generating PDF guide:", error);
            alert(`Error al generar la guía: ${error?.message || 'Error desconocido'}`);
        } finally {
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
            <header className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center p-6 bg-white border-b border-slate-200 shadow-sm z-20">
                <div className="flex-1 w-full min-w-0">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl font-black text-slate-800 bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-slate-100 rounded px-2 w-full max-w-full"
                        placeholder="Nombre de la Aventura"
                    />
                    <div className="flex flex-wrap gap-4 mt-4 px-2 items-center">
                        <div className="flex items-center gap-2">
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
                        </div>
                        <div className="w-px h-6 bg-slate-200 hidden sm:block shrink-0"></div>
                        <div className="flex items-center gap-2 flex-wrap">
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

                                {/* Individual student picker toggle */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowStudentPicker(!showStudentPicker)}
                                        className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                                            selectedStudents.length > 0
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-600'
                                        }`}
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        {selectedStudents.length > 0 ? `${selectedStudents.length} alumno${selectedStudents.length !== 1 ? 's' : ''}` : 'Individuales'}
                                        <ChevronDown className={`w-3 h-3 transition-transform ${showStudentPicker ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showStudentPicker && (
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                                            <div className="p-2 border-b border-slate-100">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar alumno..."
                                                    value={studentSearch}
                                                    onChange={e => setStudentSearch(e.target.value)}
                                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-400"
                                                />
                                            </div>
                                            <div className="max-h-52 overflow-y-auto">
                                                {students
                                                    .filter(s => s.name?.toLowerCase().includes(studentSearch.toLowerCase()))
                                                    .map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => {
                                                                if (selectedStudents.includes(s.id)) {
                                                                    setSelectedStudents(selectedStudents.filter(id => id !== s.id));
                                                                } else {
                                                                    setSelectedStudents([...selectedStudents, s.id]);
                                                                }
                                                            }}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${
                                                                selectedStudents.includes(s.id) ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700'
                                                            }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                                selectedStudents.includes(s.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                                            }`}>
                                                                {selectedStudents.includes(s.id) && <span className="text-white text-[8px] font-black">✓</span>}
                                                            </div>
                                                            <span className="text-lg">{s.avatar || '🧑'}</span>
                                                            <span className="truncate">{s.name}</span>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                            {selectedStudents.length > 0 && (
                                                <div className="p-2 border-t border-slate-100">
                                                    <button
                                                        onClick={() => setSelectedStudents([])}
                                                        className="w-full text-xs text-rose-500 font-bold hover:text-rose-700 py-1"
                                                    >
                                                        Quitar todos
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap flex-row items-center gap-3 w-full xl:w-auto xl:justify-end shrink-0 pt-2 xl:pt-0 border-t xl:border-none border-slate-100">
                    <button
                        onClick={handleDownloadCompleteMapPdf} disabled={isDownloadingPdf}
                        className="bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 px-4 py-2 rounded-full font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                        {isDownloadingPdf ? <Sparkles className="w-4 h-4 animate-spin text-sky-500 shrink-0" /> : <Download className="w-4 h-4 text-sky-500 shrink-0" />}
                        {isDownloadingPdf ? "Generando..." : "Descargar Guía PDF"}
                    </button>
                    {nodes.some(n => (n.type !== 'boss_fight' && (n as DayContent).narrative?.includes('Generando contenido con IA')) ||
                        (n.type === 'boss_fight' && ((n as BossDayContent).originalProblemText?.includes('Generando contenido con IA')))) && (
                            <button
                                onClick={handleRepairAllStuckLevels}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-4 py-2 rounded-full font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap shrink-0"
                            >
                                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Reparar Mapa (Stuck)
                            </button>
                        )}
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

                    {nodes.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white/50 backdrop-blur rounded-3xl border border-dashed border-slate-300 mb-8 max-w-2xl mx-auto shadow-sm">
                            <Bot className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="font-bold text-xl mb-2 text-slate-600">Lienzo en Blanco</h3>
                            <p className="text-center text-sm">Genera un mundo completo con IA usando el asistente, o agrega nodos manualmente debajo.</p>
                            <button
                                onClick={() => setShowAIPrompt(true)}
                                className="mt-6 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-sm border border-amber-200"
                            >
                                <Sparkles className="w-5 h-5" /> Abrir Asistente IA
                            </button>
                        </div>
                    )}

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
                className="bg-white p-10 text-black font-sans"
                style={{ display: "none", position: "absolute", top: "-9999px", left: "-9999px", width: "900px", minHeight: "100vh" }}
            >
                {/* Cover */}
                <div data-pdf-section className="border-b-4 border-indigo-600 pb-8 mb-10 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Guía Docente Completa</p>
                    <h1 className="text-4xl font-black text-indigo-900 mb-3">{title}</h1>
                    <p className="text-lg text-slate-500 font-medium">Tema Visual: <span className="font-bold text-slate-700">{theme}</span> • {nodes.length} sesiones</p>
                    {initialWorld?.pedagogy && (
                        <div className="mt-6 grid grid-cols-2 gap-4 text-left text-sm">
                            {initialWorld.pedagogy.pda && (
                                <div className="bg-indigo-50 p-3 rounded-xl">
                                    <p className="font-black text-indigo-600 text-xs uppercase mb-1">PDA</p>
                                    <p className="text-slate-700">{initialWorld.pedagogy.pda}</p>
                                </div>
                            )}
                            {initialWorld.pedagogy.contenidos && (
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <p className="font-black text-slate-500 text-xs uppercase mb-1">Contenidos</p>
                                    <p className="text-slate-700">{initialWorld.pedagogy.contenidos}</p>
                                </div>
                            )}
                            {initialWorld.pedagogy.proposito && (
                                <div className="bg-emerald-50 p-3 rounded-xl col-span-2">
                                    <p className="font-black text-emerald-600 text-xs uppercase mb-1">Propósito</p>
                                    <p className="text-slate-700">{initialWorld.pedagogy.proposito}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sessions */}
                <div className="space-y-14">
                    {nodes.map((node, idx) => {
                        const day = node as DayContent;
                        const boss = node as BossDayContent;
                        const isBoss = node.type === 'boss_fight';
                        const miniGame = day.content?.miniGame;
                        const practice = day.content?.practiceProblem;
                        const explanation = day.content?.explanation;

                        return (
                            <div key={idx} data-pdf-section className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                {/* Session header */}
                                <div className={`flex items-center gap-4 px-6 py-4 ${isBoss ? 'bg-red-600' : 'bg-indigo-600'}`}>
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-xl">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">{node.title}</h2>
                                        <p className="text-xs text-white/70 font-bold uppercase tracking-widest">
                                            {isBoss ? '⚔️ Batalla Final' : node.type === 'concept_story' ? '📖 Historia Conceptual' : '✏️ Práctica Guiada'}
                                        </p>
                                    </div>
                                    {(node as DayContent).pda_objetivo && (
                                        <div className="ml-auto text-right">
                                            <p className="text-[10px] text-white/60 uppercase font-bold mb-0.5">Objetivo PDA</p>
                                            <p className="text-xs text-white font-medium max-w-xs">{(node as DayContent).pda_objetivo}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Boss fight */}
                                    {isBoss && (
                                        <div>
                                            <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-2">⚔️ Problema del Jefe Final</p>
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 whitespace-pre-wrap text-slate-800 text-sm leading-relaxed">
                                                {boss.originalProblemText || 'Sin contenido.'}
                                            </div>
                                            {boss.tipo_evidencia_requerida && (
                                                <p className="mt-2 text-xs text-slate-500"><span className="font-bold">Evidencia requerida:</span> {boss.tipo_evidencia_requerida}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Story / Narrative */}
                                    {!isBoss && day.narrative && (
                                        <div>
                                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">📖 Historia / Narrativa (Lo que lee el alumno)</p>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 whitespace-pre-wrap text-slate-800 text-sm leading-relaxed">
                                                {day.narrative}
                                            </div>
                                        </div>
                                    )}

                                    {/* Explanation chunks */}
                                    {!isBoss && explanation && (
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">🧠 Explicación Teórica</p>
                                            <div className="space-y-2">
                                                {(explanation.chunks || []).map((chunk, ci) => (
                                                    <div key={ci} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700">
                                                        {chunk}
                                                    </div>
                                                ))}
                                                {explanation.analogy && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
                                                        <span className="font-black">💡 Analogía: </span>{explanation.analogy}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Practice problem */}
                                    {!isBoss && practice && (
                                        <div>
                                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">✏️ Problema de Práctica</p>
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                                                <p className="text-sm text-slate-800 font-medium">{practice.statement}</p>
                                                {practice.hint && (
                                                    <p className="text-xs text-emerald-700"><span className="font-black">Pista:</span> {practice.hint}</p>
                                                )}
                                                <p className="text-sm font-black text-emerald-800">✅ Respuesta correcta: {practice.correctValue}</p>
                                                {practice.tipo_evidencia_requerida && (
                                                    <p className="text-xs text-slate-500"><span className="font-bold">Tipo de evidencia:</span> {practice.tipo_evidencia_requerida}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mini game */}
                                    {!isBoss && miniGame && (
                                        <div>
                                            <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2">🎮 Minijuego — {miniGame.type || 'Actividad'}</p>
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-sm">
                                                {miniGame.question && <p className="font-medium text-slate-800"><span className="font-black">Pregunta:</span> {miniGame.question}</p>}
                                                {miniGame.options && miniGame.options.length > 0 && (
                                                    <div>
                                                        <p className="font-black text-slate-600 text-xs mb-1">Opciones:</p>
                                                        <ul className="list-disc list-inside space-y-0.5">
                                                            {miniGame.options.map((opt, oi) => (
                                                                <li key={oi} className={opt === miniGame.correctAnswer ? 'text-emerald-700 font-bold' : 'text-slate-700'}>{opt} {opt === miniGame.correctAnswer ? '✅' : ''}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {miniGame.pairs && miniGame.pairs.length > 0 && (
                                                    <div>
                                                        <p className="font-black text-slate-600 text-xs mb-1">Pares a conectar:</p>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            {miniGame.pairs.map((p, pi) => (
                                                                <div key={pi} className="text-xs bg-white border border-amber-200 rounded px-2 py-1">
                                                                    <span className="font-bold">{p.concept}</span> → {p.definition}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {miniGame.words && miniGame.words.length > 0 && (
                                                    <p><span className="font-black">Palabras:</span> {miniGame.words.join(', ')}</p>
                                                )}
                                                {miniGame.feedbackSuccess && <p className="text-emerald-700 text-xs"><span className="font-black">Msg. éxito:</span> {miniGame.feedbackSuccess}</p>}
                                                {miniGame.feedbackError && <p className="text-red-600 text-xs"><span className="font-black">Msg. error:</span> {miniGame.feedbackError}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Glossary */}
                                    {!isBoss && day.glosario && day.glosario.length > 0 && (
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">📚 Glosario</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {day.glosario.map((g: any, gi: number) => (
                                                    <div key={gi} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                                                        <span className="font-black text-slate-700">{g.term || g.palabra}: </span>
                                                        <span className="text-slate-600">{g.definition || g.definicion}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Metacognitive closure */}
                                    {!isBoss && day.cierre_metacognicion && (
                                        <div>
                                            <p className="text-xs font-black text-purple-500 uppercase tracking-widest mb-2">🪞 Cierre Metacognitivo</p>
                                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-slate-700 italic">
                                                {day.cierre_metacognicion}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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
                                <label className="block text-sm font-bold text-slate-700 mb-2">Describe la problemática (opcional)</label>
                                <textarea
                                    value={aiProblemDescription}
                                    onChange={(e) => setAiProblemDescription(e.target.value)}
                                    placeholder="Ej. Falta de interés en cuidar el agua, reciclaje..."
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all font-medium min-h-[60px] resize-none text-slate-800 text-sm"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Fase / Grado</label>
                                    <select
                                        value={aiPhase}
                                        onChange={(e) => setAiPhase(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all font-medium text-slate-700"
                                    >
                                        <option value="1">Fase 1 (Inicial)</option>
                                        <option value="2">Fase 2 (Preescolar)</option>
                                        <option value="3">Fase 3 (1º y 2º Primaria)</option>
                                        <option value="4">Fase 4 (3º y 4º Primaria)</option>
                                        <option value="5">Fase 5 (5º y 6º Primaria)</option>
                                        <option value="6">Fase 6 (Secundaria)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Dificultad</label>
                                    <select
                                        value={aiDifficulty}
                                        onChange={(e) => setAiDifficulty(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all text-sm font-medium"
                                    >
                                        <option value="Básico">Fácil (Básico)</option>
                                        <option value="Intermedio">Intermedio (Retador)</option>
                                        <option value="Avanzado">Avanzado (Olimpiada)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-700">Número de Sesiones (Niveles)</label>
                                    <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">{aiSessionCount}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="20" 
                                    value={aiSessionCount}
                                    onChange={(e) => setAiSessionCount(Number(e.target.value))}
                                    className="w-full accent-amber-500"
                                />
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold px-1 mt-1">
                                    <span>Básico (1-5)</span>
                                    <span>Medio (6-12)</span>
                                    <span>Completo (13-20)</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tema Visual</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {THEME_LIST.map((t) => (
                                        <button
                                            key={t.key}
                                            onClick={() => setTheme(t.key)}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                                                theme === t.key 
                                                    ? 'border-amber-500 bg-amber-50 shadow-sm scale-105' 
                                                    : 'border-slate-100 bg-slate-50 hover:border-amber-200 hover:bg-white'
                                            }`}
                                        >
                                            <span className="text-2xl mb-1">{t.emoji}</span>
                                            <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
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
