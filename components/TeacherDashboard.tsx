"use client";
/* eslint-disable react/no-unescaped-entities */import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useLearning, LearningWorld, Student, Grade, Classroom } from "@/contexts/LearningContext";
import { THEME_COLORS, ThemeKey } from "@/lib/themes";
import UploadEngine from "./UploadEngine";
import VisualWorldBuilder from "./VisualWorldBuilder";
import AiProjectGenerator from "./AiProjectGenerator";
import BulkEvidenceUploader from "./BulkEvidenceUploader";
import { Users, BrainCircuit, BookOpen, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, X, Library, Plus, UploadCloud, Map, FileText, Pencil, Trash2, UserPlus, LogOut, Swords, Send, MessageSquare, RotateCcw, Sparkles, Search, GraduationCap, Layers, Globe, Activity, Target, PlusCircle, Share2, Star, Wrench, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import BehaviorTracker from "./BehaviorTracker";
import TeacherToolkit from "./TeacherToolkit";
import ClassStoryFeed from "./ClassStoryFeed";
import PerformanceDashboard from "./PerformanceDashboard";

type Tab = "students" | "library" | "reports" | "raid" | "messages" | "behavior" | "toolkit" | "story";

// Helper functions moved to top for scope visibility
function getClassColor(progress: number) {
    if (progress < 30) return "bg-red-500";
    if (progress < 70) return "bg-yellow-500";
    return "bg-green-500";
}

function calculateStudentProgress(studentId: string, progressObj: Record<string, Record<string, number[]>>, worlds: LearningWorld[]): number {
    if (!worlds || worlds.length === 0) return 0;
    let totalLevels = 0;
    let completedLevels = 0;
    for (const world of worlds) {
        totalLevels += world.days?.length || 0;
        const studentWorldProgress = progressObj[studentId]?.[world.id] || [];
        completedLevels += studentWorldProgress.length;
    }
    if (totalLevels === 0) return 0;
    return Math.round((completedLevels / totalLevels) * 100);
}

function calculateStudentProgressForWorld(studentId: string, progressObj: Record<string, Record<string, number[]>>, world: LearningWorld): number {
    const totalLevels = world.days?.length || 0;
    if (totalLevels === 0) return 0;
    const completedLevels = (progressObj[studentId]?.[world.id] || []).length;
    return Math.round((completedLevels / totalLevels) * 100);
}

export default function TeacherDashboard() {
    useSessionGuard();
    const {
        students, setStudents, worlds, activeWorldId, setActiveWorld, deleteWorld,
        addStudent, updateStudent, deleteStudent, progress, toggleWorldAssignment, setProjectGrade,
        classrooms, addClassroom, updateClassroom, deleteClassroom, assignStudentToClassroom,
        grades, addGrade, updateGrade, deleteGrade
    } = useLearning();
    const [activeTab, setActiveTab] = useState<Tab>("reports");
    const [showGlobalStatsModal, setShowGlobalStatsModal] = useState(false);
    const [selectedInsightWorldId, setSelectedInsightWorldId] = useState<string>("");
    const [insightClassroomId, setInsightClassroomId] = useState<string>("all");
    const [selectedClassroomId, setSelectedClassroomId] = useState<string>("all");
    const [showAddClassroomModal, setShowAddClassroomModal] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [newClassDescription, setNewClassDescription] = useState("");
    const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
    const [newClassEmoji, setNewClassEmoji] = useState("📚");
    const [selectedGradeIdInModal, setSelectedGradeIdInModal] = useState<string>("");
    const [showAddGradeModal, setShowAddGradeModal] = useState(false);
    const [newGradeName, setNewGradeName] = useState("");
    const [newGradeDescription, setNewGradeDescription] = useState("");
    const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showAiGeneratorModal, setShowAiGeneratorModal] = useState(false);
    const [showCreationChoiceModal, setShowCreationChoiceModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showBuilderModal, setShowBuilderModal] = useState(false);
    const [builderInitialAIPrompt, setBuilderInitialAIPrompt] = useState(false);
    const [builderWorld, setBuilderWorld] = useState<LearningWorld | null>(null);

    const [showAiReviewModal, setShowAiReviewModal] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiDiagnosis, setAiDiagnosis] = useState<{ diagnosis?: string, suggestedMissionTopic?: string, recommendations?: { title: string, description: string }[] } | null>(null);
    const [strugglingStudentContext, setStrugglingStudentContext] = useState<{ student: { id: string, name: string }, world: { id: string, title?: string, theme: string }, level?: { title?: string, dayNumber?: number } | any } | null>(null);


    const [worldToDelete, setWorldToDelete] = useState<LearningWorld | null>(null);

    // AI Analysis Selected Student & Interventions
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [activeStudentProfileId, setActiveStudentProfileId] = useState<string | null>(null);
    const [profileScopeWorldId, setProfileScopeWorldId] = useState<string>('global');
    const [studentEvidence, setStudentEvidence] = useState<any[]>([]);
    const [isFetchingEvidence, setIsFetchingEvidence] = useState(false);
    const [studentForHintId, setStudentForHintId] = useState<string | null>(null);
    const [isSendingHint, setIsSendingHint] = useState(false);
    const [hintSentSuccess, setHintSentSuccess] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // Multi-Map Assignment State
    const [showAssignMapModal, setShowAssignMapModal] = useState(false);
    const [studentForAssignMap, setStudentForAssignMap] = useState<Student | null>(null);
    const [isAssigningMap, setIsAssigningMap] = useState(false);

    // Gem Award State
    const [showAwardGemsModal, setShowAwardGemsModal] = useState(false);
    const [studentForGems, setStudentForGems] = useState<Student | null>(null);
    const [gemAmountToAward, setGemAmountToAward] = useState(10);
    const [isAwardingGems, setIsAwardingGems] = useState(false);

    // Raid Boss Management State
    const [raidBossName, setRaidBossName] = useState("Dragón del Caos");
    const [raidBossEmoji, setRaidBossEmoji] = useState("🐉");
    const [raidBossHP, setRaidBossHP] = useState(3000);
    const [isCreatingBoss, setIsCreatingBoss] = useState(false);
    const [currentRaidBoss, setCurrentRaidBoss] = useState<any>(null);
    const [isResettingBoss, setIsResettingBoss] = useState(false);

    // Messaging State
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [messageRecipients, setMessageRecipients] = useState<string[]>([]);
    const [isMessageGlobal, setIsMessageGlobal] = useState(true);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [messageSent, setMessageSent] = useState(false);
    const [searchTermLibrary, setSearchTermLibrary] = useState("");

    // Bulk report state — separate flags per button so only the clicked one shows "Generando"
    const [isGeneratingTeacherBulk, setIsGeneratingTeacherBulk] = useState(false);
    const [isGeneratingParentBulk, setIsGeneratingParentBulk] = useState(false);
    const [bulkReportWorldId, setBulkReportWorldId] = useState<string>('global'); // 'global' | worldId

    // ── Shared report window opener ────────────────────────────────────────────
    /**
     * Opens a new browser tab with the report HTML ready to print/save as PDF.
     * reportType: 'teacher' | 'parent'
     * scope: { label, students: [{name, xp, gems, progress, aiText, worldTitle?}] }
     */
    const openReportWindow = (reportType: 'teacher' | 'parent', scopeLabel: string, reportItems: {
        studentName: string;
        xp: number;
        gems: number;
        progress: number;
        aiText: string;
        worldTitle?: string;
        homeActivity?: string;
    }[]) => {
        const isParent = reportType === 'parent';
        const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

        const cardHtml = reportItems.map(item => `
            <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;page-break-inside:avoid;">
                <div style="background:${isParent ? '#0f172a' : '#1e3a8a'};padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="color:white;font-size:16px;font-weight:900;">${item.studentName}</div>
                        ${item.worldTitle ? `<div style="color:rgba(255,255,255,0.6);font-size:11px;">${item.worldTitle}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:16px;">
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:900;color:#fbbf24;">${item.xp.toLocaleString()}</div>
                            <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;">XP</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:900;color:#34d399;">${item.progress}%</div>
                            <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Avance</div>
                        </div>
                    </div>
                </div>
                <div style="padding:16px 20px;">
                    <p style="font-size:13px;line-height:1.7;color:#374151;">${item.aiText}</p>
                    ${isParent && item.homeActivity ? `
                        <div style="margin-top:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">
                            <p style="font-size:11px;font-weight:900;color:#065f46;text-transform:uppercase;margin-bottom:4px;">Actividad en casa</p>
                            <p style="font-size:13px;color:#1e293b;">${item.homeActivity}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${isParent ? 'Reporte para Padres' : 'Reporte Docente'} — ${scopeLabel}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; color: #1e293b; padding: 40px; max-width: 900px; margin: 0 auto; }
        @media print { body { padding: 20px; } button { display: none !important; } }
    </style>
</head>
<body>
    <div style="text-align:center;border-bottom:4px solid ${isParent ? '#0f172a' : '#1e3a8a'};padding-bottom:24px;margin-bottom:32px;">
        <div style="font-size:11px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">AprendIA • ${today}</div>
        <h1 style="font-size:28px;font-weight:900;color:#0f172a;margin-bottom:6px;">${isParent ? '📋 Reporte para Padres de Familia' : '🏫 Reporte para Docente'}</h1>
        <p style="font-size:15px;color:#64748b;">Alcance: <strong>${scopeLabel}</strong> • ${reportItems.length} alumno${reportItems.length !== 1 ? 's' : ''}</p>
    </div>
    <div style="text-align:center;margin-bottom:28px;">
        <button onclick="window.print()" style="background:${isParent ? '#0f172a' : '#1e3a8a'};color:white;border:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">🖨️ Guardar / Imprimir como PDF</button>
    </div>
    ${cardHtml}
</body>
</html>`;

        const win = window.open('', '_blank');
        if (!win) { alert('El navegador bloqueó la ventana. Permite los popups para este sitio.'); return; }
        win.document.write(html);
        win.document.close();
    };
    // ──────────────────────────────────────────────────────────────────────────

    const handleSendMessage = async () => {
        if (!messageText.trim()) return;
        setIsSendingMessage(true);
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    isGlobal: isMessageGlobal,
                    recipientIds: isMessageGlobal ? [] : messageRecipients
                })
            });
            if (res.ok) {
                setMessageSent(true);
                setMessageText("");
                setMessageRecipients([]);
                setTimeout(() => {
                    setMessageSent(false);
                    setShowMessageModal(false);
                }, 2000);
            } else {
                alert('Error al enviar el mensaje');
            }
        } catch (e) {
            alert('Error de conexión');
        } finally {
            setIsSendingMessage(false);
        }
    };

    // Progress Reset State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetStudentIds, setResetStudentIds] = useState<string[]>([]);
    const [isResetAll, setIsResetAll] = useState(true);
    const [isResettingProgress, setIsResettingProgress] = useState(false);
    const [resetDone, setResetDone] = useState(false);

    const handleResetProgress = async () => {
        const ids = isResetAll ? students.map(s => s.id) : resetStudentIds;
        if (ids.length === 0) return;
        if (!confirm(`¿Estás seguro de reiniciar el progreso de ${ids.length} alumno(s)? Esta acción no se puede deshacer.`)) return;

        setIsResettingProgress(true);
        try {
            const res = await fetch('/api/progress/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds: ids })
            });
            if (res.ok) {
                setResetDone(true);
                setTimeout(() => {
                    setResetDone(false);
                    setShowResetModal(false);
                    window.location.reload();
                }, 2000);
            } else {
                alert('Error al reiniciar progreso');
            }
        } catch (e) {
            alert('Error de conexión');
        } finally {
            setIsResettingProgress(false);
        }
    };

    const MONSTER_NAMES: Record<string, string> = {
        "🐉": "Dragon del Cálculo", "🦑": "Kraken de la Sintaxis", "🐲": "Hidra de la Ecuación",
        "👹": "Ogro de la Historia", "👺": "Demonio de la Lógica", "🧛": "Vampiro de la Literatura",
        "🧟": "Zombie de los Conceptos", "🦖": "Rex del Conocimiento", "🐙": "Pulpo de la Aritmética",
        "🕷️": "Araña de la Geometría", "🦂": "Escorpión de la Ciencia", "🐍": "Cobra de la Química",
        "💀": "Esqueleto de la Filosofía", "👾": "Alien del Algoritmo", "🤖": "Robot de la Innovación",
        "🔥": "Llama del Saber", "🦇": "Murciélago de la Mitología", "👻": "Fantasma del Pasado"
    };
    const MONSTER_EMOJIS = Object.keys(MONSTER_NAMES);
    const HP_PRESETS = [
        { label: "Fácil", value: 1000 },
        { label: "Normal", value: 3000 },
        { label: "Difícil", value: 5000 },
        { label: "Épico", value: 10000 },
    ];

    // Fetch active raid boss
    useEffect(() => {
        fetch('/api/gamification/raid')
            .then(r => r.json())
            .then(data => {
                if (data && data.status === 'ACTIVE') {
                    setCurrentRaidBoss(data);
                    setRaidBossName(data.name || "Dragón del Caos");
                    setRaidBossEmoji(data.imageUrl || "🐉");
                    setRaidBossHP(data.maxHealth || 3000);
                }
            })
            .catch(() => { });
    }, []);

    const handleCreateBoss = async () => {
        setIsCreatingBoss(true);
        try {
            const res = await fetch('/api/gamification/raid', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: raidBossName, imageUrl: raidBossEmoji, maxHealth: raidBossHP })
            });
            const data = await res.json();
            setCurrentRaidBoss(data);
        } catch (e) { console.error(e); }
        setIsCreatingBoss(false);
    };

    const handleResetBoss = async () => {
        setIsResettingBoss(true);
        try {
            const res = await fetch('/api/gamification/raid', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset', maxHealth: raidBossHP })
            });
            const data = await res.json();
            setCurrentRaidBoss(data);
        } catch (e) { console.error(e); }
        setIsResettingBoss(false);
    };
    const [hintText, setHintText] = useState("");

    const handleAwardGems = async () => {
        if (!studentForGems || !gemAmountToAward || isNaN(gemAmountToAward) || gemAmountToAward === 0) return;
        setIsAwardingGems(true);
        try {
            const res = await fetch('/api/teacher/award-gems', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: studentForGems.id, gemsToAdd: gemAmountToAward })
            });
            const data = await res.json();
            if (res.ok) {
                // Instantly update the UI local state for immediate feedback
                setStudentForGems(prev => prev ? { ...prev, gems: data.newTotal } : prev);
                const updatedStudentRow = document.getElementById(`student-gems-${studentForGems.id}`);
                if (updatedStudentRow) updatedStudentRow.innerText = data.newTotal + " Gemas";
                alert(`¡Éxito! El alumno ahora tiene ${data.newTotal} gemas.`);
                setShowAwardGemsModal(false);
                setGemAmountToAward(10);
            } else {
                alert(data.error || "Error entregando gemas.");
            }
        } catch (e) {
            console.error(e);
            alert("Error de red al entregar gemas.");
        }
        setIsAwardingGems(false);
    };

    // Subscription & Limits State
    const [schoolInfo, setSchoolInfo] = useState<any>(null);

    useEffect(() => {
        fetch('/api/school')
            .then(res => res.json())
            .then(data => {
                if (!data.error) setSchoolInfo(data);
            })
            .catch(console.error);
    }, []);

    const isSuspended = schoolInfo?.subscriptionStatus === 'SUSPENDED';
    const studentsLimitReached = schoolInfo && schoolInfo._count?.users >= schoolInfo.maxStudents;
    const mapsLimitReached = schoolInfo && schoolInfo._count?.worlds >= schoolInfo.maxMaps;

    // Student Management State
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [studentName, setStudentName] = useState("");
    const [studentAvatar, setStudentAvatar] = useState("🧑🏻");
    const [selectedClassroomInModal, setSelectedClassroomInModal] = useState<string>("");
    const [savingStudent, setSavingStudent] = useState(false);
    const AVATAR_OPTIONS = ["🧑🏻", "👦🏽", "👧🏼", "👩🏻‍🎓", "👨🏽‍🎓", "🧒🏾", "👦🏻", "👧🏽", "🧑🏿", "👩🏼", "👨🏻", "🧑🏽", "👧🏻", "👦🏾", "👩🏽", "🧒🏻"];

    const handleAssignMapToStudent = async (worldId: string) => {
        if (!studentForAssignMap) return;
        setIsAssigningMap(true);
        try {
            const isAssigned = studentForAssignMap.assignedWorlds?.some(aw => aw.id === worldId);
            const action = isAssigned ? 'unassign' : 'assign';

            const success = await toggleWorldAssignment(studentForAssignMap.id, worldId, action);

            if (success) {
                // Actualizar estado local del modal para respuesta inmediata visual
                setStudentForAssignMap(prev => {
                    if (!prev) return prev;
                    const currentWorlds = prev.assignedWorlds || [];
                    const updatedWorlds = action === 'assign'
                        ? [...currentWorlds, worlds.find(w => w.id === worldId)!]
                        : currentWorlds.filter(w => w.id !== worldId);
                    return { ...prev, assignedWorlds: updatedWorlds };
                });
            } else {
                alert("Hubo un error modificando la asignación del mapa.");
            }
        } catch (err) {
            console.error("Error assigning map:", err);
            alert("Error de red modificando la asignación del mapa.");
        } finally {
            setIsAssigningMap(false);
        }
    };

    const handleSaveStudent = async () => {
        if (!studentName.trim()) return;
        setSavingStudent(true);
        if (editingStudent) {
            await updateStudent(editingStudent.id, studentName, studentAvatar);
            if (selectedClassroomInModal !== editingStudent.classroomId) {
                await assignStudentToClassroom(editingStudent.id, selectedClassroomInModal || null);
            }
            setEditingStudent(null);
        } else {
            await addStudent(studentName, studentAvatar, selectedClassroomInModal || null);
            setShowAddStudentModal(false);
        }
        setStudentName("");
        setStudentAvatar("🧑🏻");
        setSelectedClassroomInModal("");
        setSavingStudent(false);
    };

    const handleCreateClassroom = async () => {
        if (!newClassName.trim()) return;
        setSavingStudent(true);
        if (editingClassroom) {
            await updateClassroom(editingClassroom.id, newClassName, newClassEmoji, selectedGradeIdInModal || null, newClassDescription);
            setEditingClassroom(null);
        } else {
            await addClassroom(newClassName, newClassEmoji, selectedGradeIdInModal || null, newClassDescription);
        }
        setNewClassName("");
        setNewClassDescription("");
        setSelectedGradeIdInModal("");
        setNewClassEmoji("📚");
        setShowAddClassroomModal(false);
        setSavingStudent(false);
    };

    const [classroomToDelete, setClassroomToDelete] = useState<string | null>(null);

    const handleDeleteClassroom = async (classroomId: string) => {
        setClassroomToDelete(classroomId);
    };

    const confirmDeleteClassroom = async () => {
        if (!classroomToDelete) return;
        setSavingStudent(true);
        await deleteClassroom(classroomToDelete);
        if (selectedClassroomId === classroomToDelete) setSelectedClassroomId("all");
        setClassroomToDelete(null);
        setSavingStudent(false);
    };

    const handleCreateGrade = async () => {
        if (!newGradeName.trim()) return;
        setSavingStudent(true);
        if (editingGrade) {
            await updateGrade(editingGrade.id, newGradeName, newGradeDescription);
            setEditingGrade(null);
        } else {
            await addGrade(newGradeName, newGradeDescription);
        }
        setNewGradeName("");
        setNewGradeDescription("");
        setShowAddGradeModal(false);
        setSavingStudent(false);
    };

    const handleDeleteGrade = async (gradeId: string) => {
        if (confirm("¿Borrar permanentemente este grado? (Sus salones vinculados seguirán existiendo como independientes)")) {
            await deleteGrade(gradeId);
        }
    };

    const handleConfirmDeleteStudent = async () => {
        if (!studentToDelete) return;
        setSavingStudent(true);
        await deleteStudent(studentToDelete.id);
        setStudentToDelete(null);
        setSavingStudent(false);
    };

    const handleAiIntervention = async () => {
        const topicArg = aiDiagnosis?.suggestedMissionTopic || "Repaso General";
        const studentCtx = strugglingStudentContext;
        if (!studentCtx?.student || !studentCtx?.world) {
            alert("No se pudo determinar el alumno o mapa.");
            return;
        }

        setShowAiReviewModal(false);

        // Show a loading indicator
        const loadingAlert = document.createElement('div');
        loadingAlert.id = 'mission-loading';
        loadingAlert.className = 'fixed inset-0 z-[100] bg-black/60 flex items-center justify-center';
        loadingAlert.innerHTML = '<div class="bg-white p-8 rounded-3xl shadow-2xl text-center"><div class="animate-spin w-12 h-12 border-4 border-[#cbe0f6] border-t-sky-600 rounded-full mx-auto mb-4"></div><p class="text-[#1c3a60] font-bold text-lg">Generando misión personalizada...</p><p class="text-[#73a4db] text-sm mt-1">Creando actividades de repaso para ' + studentCtx.student.name + '</p></div>';
        document.body.appendChild(loadingAlert);

        try {
            // 1. Generate review days via AI
            const genRes = await fetch('/api/ai/generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme: studentCtx.world.theme,
                    topic: topicArg,
                    difficulty: 'medium'
                })
            });
            const genData = await genRes.json();

            if (!genData.days || genData.days.length === 0) {
                throw new Error("La IA no generó días.");
            }

            // 2. Mark the days as review and set type to guided_practice
            const reviewDays = genData.days.map((d: Record<string, unknown>, i: number) => ({
                ...d,
                title: `Repaso: ${d.title || 'Práctica ' + (i + 1)}`,
                type: 'guided_practice',
                isStudentMission: true,
                insertAfterDay: studentCtx.level?.dayNumber || 1
            }));

            // 3. Save to per-student missions
            const saveRes = await fetch('/api/student-missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: studentCtx.student.id,
                    worldId: studentCtx.world.id,
                    days: reviewDays,
                    replace: true
                })
            });

            if (saveRes.ok) {
                alert(`✅ ¡Misión de repaso creada para ${studentCtx.student.name}! Solo este alumno verá las actividades de práctica (en rojo) en su mapa.`);
            } else {
                throw new Error("Error guardando la misión.");
            }
        } catch (err) {
            console.error("Error creating student mission:", err);
            alert("❌ No se pudo crear la misión. Intenta de nuevo.");
        } finally {
            document.getElementById('mission-loading')?.remove();
        }
    };

    const calculateGlobalGrade = (student: Student) => {
        return student.globalActivityAverage !== undefined && student.globalActivityAverage !== null 
            ? student.globalActivityAverage.toFixed(1) 
            : "—";
    };

    const getProjectGrade = (student: Student, worldId: string) => {
        const auto = student.automaticProjectGrades?.find((g: any) => g.worldId === worldId);
        return auto ? auto.averageGrade : "—";
    };

    // Derived properties for early warning system (GLOBAL — across all worlds)
    const atRiskStudentsGlobal = students.filter(s => calculateStudentProgress(s.id, progress, worlds) < 30);
    const strugglingStudentsGlobal = students.filter(s => {
        const p = calculateStudentProgress(s.id, progress, worlds);
        return p >= 30 && p < 70;
    });

    // Per-map filtered versions
    const insightWorld = worlds.find(w => w.id === selectedInsightWorldId) || (worlds.length > 0 ? worlds[0] : null);
    const effectiveInsightWorldId = insightWorld?.id || "";

    // Auto-select the first world if none is selected
    React.useEffect(() => {
        if (!selectedInsightWorldId && worlds.length > 0) {
            setSelectedInsightWorldId(worlds[0].id);
        }
    }, [worlds, selectedInsightWorldId]);

    const atRiskStudentsUnfiltered = insightWorld
        ? students.filter(s => s.assignedWorlds?.some(aw => aw.id === insightWorld.id) && calculateStudentProgressForWorld(s.id, progress, insightWorld) < 30)
        : atRiskStudentsGlobal;
    const strugglingStudentsUnfiltered = insightWorld
        ? students.filter(s => {
            if (!s.assignedWorlds?.some(aw => aw.id === insightWorld.id)) return false;
            const p = calculateStudentProgressForWorld(s.id, progress, insightWorld);
            return p >= 30 && p < 70;
        })
        : strugglingStudentsGlobal;

    // Apply classroom filter for insights
    const atRiskStudents = insightClassroomId === 'all'
        ? atRiskStudentsUnfiltered
        : atRiskStudentsUnfiltered.filter(s => s.classroomId === insightClassroomId);
    const strugglingStudents = insightClassroomId === 'all'
        ? strugglingStudentsUnfiltered
        : strugglingStudentsUnfiltered.filter(s => s.classroomId === insightClassroomId);

    // Filtered students for insights trends panel
    const insightWorldStudents = insightWorld
        ? students.filter(s => s.assignedWorlds?.some(aw => aw.id === insightWorld.id))
        : students;

    const insightStudents = insightClassroomId === 'all'
        ? insightWorldStudents
        : insightWorldStudents.filter(s => s.classroomId === insightClassroomId);

    // Calculate dynamic class metrics
    const calculateClassMetrics = (targetStudents: Student[]) => {
        if (targetStudents.length === 0 || worlds.length === 0) return { completion: 0, average: 0 };

        let totalProgress = 0;
        targetStudents.forEach(student => {
            totalProgress += calculateStudentProgress(student.id, progress, worlds);
        });

        const classCompletion = Math.round(totalProgress / targetStudents.length);
        // Map progress (0-100) to a grade (0-10) for the 'Promedio'
        const classAverage = (classCompletion / 10).toFixed(1);

        return { completion: classCompletion, average: classAverage };
    };

    const metrics = calculateClassMetrics(students);

    const handleDownloadPDF = async () => {
        const doc = new jsPDF();

        // Constants for layout
        const marginX = 14;
        const pageHeight = doc.internal.pageSize.getHeight();
        let currentY = 22;

        // Title Header
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text("Reporte Pedagógico de Aula Virtual", marginX, currentY);
        currentY += 8;

        // Date and Metrics
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139); // slate-500
        const date = new Date().toLocaleDateString("es-MX", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        doc.text(`Generado el: ${date}`, marginX, currentY);
        currentY += 12;

        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`Promedio de la Clase: ${metrics.average} / 10`, marginX, currentY);
        currentY += 6;
        doc.text(`Progreso Global Completado: ${metrics.completion}%`, marginX, currentY);
        currentY += 14;

        // Helper function to check page boundaries
        const checkPageBreak = (neededHeight: number) => {
            if (currentY + neededHeight > pageHeight - 15) {
                doc.addPage();
                currentY = 20;
            }
        };

        // Fetch all evidence for all students in one batch
        const allEvidence: Record<string, any[]> = {};
        for (const student of students) {
            try {
                const res = await fetch(`/api/evidence?studentId=${student.id}&t=${Date.now()}`, { cache: 'no-store' });
                if (res.ok) {
                    allEvidence[student.id] = await res.json();
                }
            } catch (e) {
                allEvidence[student.id] = [];
            }
        }

        // Students Loop
        const reportStudents = students;
        reportStudents.forEach((student, index) => {
            const p = calculateStudentProgress(student.id, progress, worlds);
            const context = getStudentContext(student.id);
            const evidence = allEvidence[student.id] || [];

            // Calculate evidence metrics
            const evidGrades = evidence.map((e: any) => e.grade).filter((g: any) => g !== null && g !== undefined);
            const avgEvidGrade = evidGrades.length > 0 ? (evidGrades.reduce((s: number, g: number) => s + g, 0) / evidGrades.length).toFixed(1) : 'N/A';
            const recentEvidence = evidence.slice(0, 3); // Last 3 evaluations

            let status = "Buen Ritmo";
            let statusColor: [number, number, number] = [34, 197, 94]; // Green 500
            let analysis = "El alumno demuestra un dominio sólido de los conceptos fundamentales. Su ritmo de aprendizaje sugiere una alta atención y motivación. Se recomienda mantener el nivel de desafío e introducir gradualmente problemas de mayor complejidad lógica para potenciar su pensamiento crítico.";

            if (p < 30) {
                status = "Alto Riesgo";
                statusColor = [239, 68, 68]; // Red 500
                analysis = "El alumno muestra un bloqueo en la apropiación de conceptos. La falta de avance indica que la estrategia general de la ruta actual no está resonando. Se requiere retroceder a los fundamentos, ofrecer tutoría de andamiaje y usar dinámicas básicas para proteger su motivación y tolerancia a la frustración.";
            } else if (p < 70) {
                status = "Requiere Práctica";
                statusColor = [234, 179, 8]; // Yellow 500
                analysis = "El alumno comprende la teoría básica pero presenta intermitencias en la aplicación práctica o se fatiga en problemas de múltiples pasos. Se recomienda dosificar la dificultad temporalmente y reforzar la instrucción con representaciones visuales antes de pasar a la abstracción.";
            }

            // Estimate card height
            let pedagogyTextLines: string[] = [];
            let pedagogyOffset = 0;
            if (world?.pedagogy) {
                pedagogyTextLines = doc.splitTextToSize(`Tema: ${world.pedagogy.topic} | PDA: ${world.pedagogy.pda}`, 170);
                pedagogyOffset = 8 + (pedagogyTextLines.length * 4);
            }

            const currentTask = context ? `Actualmente en mapa "${context.world.title}", Nivel: ${context.level?.title || "Final"}.` : "Sin actividad reciente registrada en los mapas activos.";
            const taskLines = doc.splitTextToSize(`Contexto actual: ${currentTask}`, 170);
            const analysisLines = doc.splitTextToSize(analysis, 170);

            // Evidence summary lines
            let evidenceLines: string[] = [];
            if (recentEvidence.length > 0) {
                const evidenceSummary = recentEvidence.map((e: any) => {
                    const lines = (e.feedback || '').split('\n').filter((l: string) => l.trim());
                    const cat = lines[0] || 'Evaluado';
                    return `• ${cat} (${e.grade ?? 0}/10)`;
                }).join('  ');
                evidenceLines = doc.splitTextToSize(`Evaluaciones recientes: ${evidenceSummary}`, 170);
            }

            const evidenceOffset = evidenceLines.length > 0 ? 8 + (evidenceLines.length * 4) : 0;
            const cardHeight = 35 + pedagogyOffset + (taskLines.length * 4) + (analysisLines.length * 4) + evidenceOffset + 12;

            checkPageBreak(cardHeight + 10);

            // Card background/border
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setFillColor(248, 250, 252); // slate-50
            doc.roundedRect(marginX, currentY, 180, cardHeight, 3, 3, 'FD');

            // Student Name
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59); // slate-800
            doc.setFont('helvetica', 'bold');
            doc.text(student.name, marginX + 5, currentY + 10);

            // Progress and Status (aligned right side of the card inside)
            doc.setFontSize(11);
            doc.setTextColor(...statusColor);
            doc.text(`${p}% - ${status}`, 190 - marginX, currentY + 10, { align: 'right' });

            // Stats (Gems & XP & Evidence Grade)
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.setFont('helvetica', 'normal');
            doc.text(`Gemas: ${student.gems || 0}  |  XP: ${student.xp || 0}  |  Promedio Evidencias: ${avgEvidGrade}/10`, marginX + 5, currentY + 18);

            let textY = currentY + 28;

            // PDA Block
            if (world?.pedagogy) {
                doc.setFontSize(9);
                doc.setTextColor(30, 41, 59); // slate-800
                doc.setFont('helvetica', 'bold');
                doc.text("Objetivos de Aprendizaje (Planificación):", marginX + 5, textY);
                textY += 5;

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105); // slate-600
                doc.text(pedagogyTextLines, marginX + 5, textY);
                textY += (pedagogyTextLines.length * 4) + 4;
            }

            // Current Context
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text(taskLines, marginX + 5, textY);
            textY += (taskLines.length * 4) + 6;

            // Evidence Block
            if (evidenceLines.length > 0) {
                doc.setFontSize(9);
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.text("Historial de Evaluaciones:", marginX + 5, textY);
                textY += 5;

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(evidenceLines, marginX + 5, textY);
                textY += (evidenceLines.length * 4) + 4;
            }

            // Analysis Block
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59); // slate-800
            doc.setFont('helvetica', 'bold');
            doc.text("Análisis Pedagógico:", marginX + 5, textY);
            textY += 5;

            doc.setFont('helvetica', 'italic');
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text(analysisLines, marginX + 5, textY);

            // Move the Y cursor down past the card for the next student
            currentY += cardHeight + 6;
        });

        doc.save("Reporte_Pedagogico_AulaVirtual.pdf");
    };

    const world = worlds.find(w => w.id === activeWorldId);

    // Dynamic AI insight for specific student
    const getStudentContext = (studentId: string) => {
        if (!world || !studentId) return null;

        const student = students.find(s => s.id === studentId);
        if (!student) return null;

        const levelsDone = progress[student.id]?.[world.id] || [];
        // If they have done levels, their next level is the highest + 1. If none, they are on day 1.
        let targetLevelId = levelsDone.length > 0 ? Math.max(...levelsDone) + 1 : 1;

        // If they finished everything, target the last level for review
        if (targetLevelId > world.days.length) {
            targetLevelId = world.days.length;
        }

        const stuckLevel = world.days.find(d => d.dayNumber === targetLevelId);
        return {
            student: student,
            level: stuckLevel,
            world: world
        };
    };

    // Fetch AI Evidence when student profile is open
    React.useEffect(() => {
        if (activeStudentProfileId) {
            setIsFetchingEvidence(true);
            fetch(`/api/evidence?studentId=${activeStudentProfileId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setStudentEvidence(data)
                    } else {
                        console.error("API returned non-array evidence:", data);
                        setStudentEvidence([])
                    }
                })
                .catch(err => console.error("Error fetching evidence", err))
                .finally(() => setIsFetchingEvidence(false));
        } else {
            setStudentEvidence([]);
        }
        setAiReport(null); // Reset AI report when switching students
    }, [activeStudentProfileId]);

    // Reset profile scope when opening a new profile
    React.useEffect(() => {
        if (activeStudentProfileId) setProfileScopeWorldId('global');
    }, [activeStudentProfileId]);

    // Keep the selected ID up to date if students are loaded empty then populated
    React.useEffect(() => {
        if (students.length > 0 && !selectedStudentId) {
            setSelectedStudentId(students[0].id);
        }
    }, [students, selectedStudentId]);

    const activeStudentContext = getStudentContext(selectedStudentId);

    const handleAiReviewClick = async () => {
        if (!activeStudentContext) {
            alert("Selecciona un alumno y asegúrate de tener un mapa activo.");
            return;
        }

        setShowAiReviewModal(true);
        setIsAiThinking(true);
        setAiDiagnosis(null);
        setStrugglingStudentContext(activeStudentContext); // Set context strictly from what the teacher selected

        try {
            const res = await fetch('/api/ai/analyze-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: activeStudentContext.student.name,
                    worldTitle: activeStudentContext.world.title,
                    stuckLevelTitle: activeStudentContext.level?.title,
                    levelContent: (activeStudentContext.level as unknown as Record<string, unknown>)?.content || (activeStudentContext.level as unknown as Record<string, unknown>)?.narrative || (activeStudentContext.level as unknown as Record<string, unknown>)?.originalProblemText || 'Jefe Final'
                })
            });
            const data = await res.json();
            setAiDiagnosis(data);
        } catch (e) {
            console.error("Failed to load AI Diagnosis", e);
            setAiDiagnosis({
                diagnosis: "Hubo un error al conectar con la IA de diagnóstico.",
                recommendations: [{ title: "Error de Red", description: "Verifica tu conexión a internet o la clave de API." }],
                suggestedMissionTopic: "Repaso General"
            });
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleSendDirectMessage = async (studentId: string, text: string) => {
        if (!text.trim()) return;
        try {
            const isGlobal = studentId === 'all';
            const endpoint = isGlobal ? '/api/messages' : '/api/hints';
            const payload = isGlobal 
                ? { message: text, isGlobal: true, recipientIds: [] }
                : { studentId, message: text };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("✅ Mensaje enviado exitosamente.");
            } else {
                throw new Error("Failed to send");
            }
        } catch (err) {
            console.error("Error sending message:", err);
            alert("No se pudo enviar el mensaje.");
        }
    };

    const handleSendHint = async () => {
        if (!hintText.trim() || !studentForHintId) {
            alert("Escribe una pista antes de enviarla.");
            return;
        }
        setIsSendingHint(true);
        try {
            const res = await fetch('/api/hints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: studentForHintId,
                    message: hintText
                })
            });

            if (res.ok) {
                setIsSendingHint(false);
                setHintSentSuccess(true);
                setTimeout(() => {
                    setHintSentSuccess(false);
                    setStudentForHintId(null);
                }, 2000);
            } else {
                throw new Error("Failed to send hint");
            }
        } catch (err) {
            console.error("Error sending hint:", err);
            setIsSendingHint(false);
            alert("No se pudo enviar la pista. Intenta de nuevo.");
        }
    };


    // Metrics already calculated above handler

    return (
        <div className="min-h-screen bg-[#f0f5fb] text-[#1c3a60] font-sans selection:bg-[#cbe0f6] selection:text-[#1c3a60] overflow-x-hidden relative">
            {/* Ambient Background Glow - Soft Pastel Mode */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#73a4db]/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#73a4db]/20 blur-[120px] rounded-full animate-pulse delay-700" />
                <div className="absolute inset-0 opacity-[0.05]" 
                     style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)` , backgroundSize: '32px 32px' }} />
            </div>
            
            {isSuspended && (
                <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white text-center py-3 font-bold shadow-lg flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    CUENTA SUSPENDIDA. NO PUEDE CREAR MAPAS NI ALUMNOS HASTA QUE SE REGULARICE SU SUSCRIPCIÓN.
                </div>
            )}

            {/* COMMANDER NAV */}
            <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'rgba(240, 245, 251,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #cbe0f6' }}>
                <div className="container mx-auto px-6 h-20 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-[#cbe0f6] overflow-hidden">
                           <img src="/logo_aprendia.png" alt="AprendIA Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase leading-none" style={{ color: '#1c3a60' }}>AprendIA</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#73a4db' }}>Panel Docente</p>
                        </div>
                    </div>

                    <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl border" style={{ background: 'rgba(28, 58, 96,0.05)', borderColor: '#cbe0f6' }}>
                        {[
                            { id: 'reports', label: 'Salón', icon: Users },
                            { id: 'library', label: 'Biblioteca', icon: Library },
                            { id: 'story', label: 'Historia', icon: ImageIcon },
                            { id: 'raid', label: 'Incursión', icon: Swords },
                            { id: 'behavior', label: 'Comportamiento', icon: Star },
                            { id: 'toolkit', label: 'Herramientas', icon: Wrench },
                            { id: 'messages', label: 'Mensajes', icon: MessageSquare },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300"
                                style={activeTab === tab.id
                                    ? { background: '#1c3a60', color: 'white', boxShadow: '0 4px 12px rgba(28, 58, 96,0.3)' }
                                    : { color: '#73a4db' }
                                }
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                            style={{ background: '#cbe0f6', color: '#346297', borderColor: '#cbe0f6' }}
                        >
                           <LogOut className="w-4 h-4" /> <span className="hidden xl:inline">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </header>
            {/* Main Content Area */}
            <main className={`flex-1 overflow-y-auto w-full max-w-full overflow-x-hidden ${activeTab === 'messages' || activeTab === 'reports' ? 'p-0' : 'p-6'}`}>





                {/* LIBRARY TAB - Catálogo Académico Premium */}
                {activeTab === 'library' && (() => {
                    const filteredWorlds = worlds.filter(w => 
                        (w.title || "").toLowerCase().includes(searchTermLibrary.toLowerCase()) || 
                        (w.theme || "").toLowerCase().includes(searchTermLibrary.toLowerCase())
                    );

                    return (
                        <div className="space-y-8 animate-fade-in">

                            {/* World Grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {/* New Map Empty Card */}
                                <button 
                                    onClick={() => {
                                        if (isSuspended) return alert("Tu cuenta está suspendida. Contacta a un administrador.");
                                        if (mapsLimitReached) return alert(`Has alcanzado el límite de ${schoolInfo.maxMaps} mapa(s) en tu plan actual.`);
                                        setShowCreationChoiceModal(true);
                                    }}
                                    className="group h-full min-h-[450px] border-4 border-dashed border-white/60 bg-white/20 hover:bg-white/40 hover:border-[#73a4db] rounded-3xl flex flex-col items-center justify-center gap-6 transition-all duration-500 shadow-sm hover:shadow-xl relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#1c3a60]/5 to-[#346297]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-24 h-24 bg-white/80 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl border border-white/50 relative z-10">
                                        <Plus className="w-12 h-12 text-[#346297] group-hover:rotate-90 transition-transform duration-500" />
                                    </div>
                                    <div className="text-center relative z-10">
                                        <p className="text-[#1c3a60] font-black text-2xl tracking-tight">Nueva Aventura</p>
                                        <p className="text-[#73a4db] text-[10px] font-black uppercase tracking-[0.2em] mt-2 bg-white/50 px-3 py-1 rounded-full border border-white/40">Inicia tu Creación</p>
                                    </div>
                                    
                                    {/* Modal Hub Integrado (Creation Choice) */}
                                    {showCreationChoiceModal && (
                                        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center gap-4 p-8 animate-in fade-in zoom-in duration-300">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowCreationChoiceModal(false); }}
                                                className="absolute top-4 right-4 p-2 text-[#73a4db] hover:text-[#346297] hover:bg-[#cbe0f6] rounded-full transition-all"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            
                                            <h3 className="text-xl font-black text-[#1c3a60] mb-2">¿Cómo deseas iniciar?</h3>
                                            
                                            <div className="grid grid-cols-1 gap-3 w-full">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowCreationChoiceModal(false);
                                                        setShowUploadModal(true);
                                                    }}
                                                    className="w-full flex items-center gap-4 p-5 bg-white border-2 border-[#cbe0f6] hover:border-[#73a4db] hover:bg-[#f0f5fb] rounded-2xl transition-all group/opt shadow-sm"
                                                >
                                                    <div className="bg-[#cbe0f6] p-3 rounded-xl group-hover/opt:bg-[#346297] transition-colors">
                                                        <UploadCloud className="w-6 h-6 text-[#1c3a60] group-hover/opt:text-white" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-black text-[#1c3a60] text-sm">Carga de Archivos</p>
                                                        <p className="text-[10px] text-[#73a4db] font-bold uppercase tracking-widest mt-0.5">Sube PDF o Word</p>
                                                    </div>
                                                </button>

                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowCreationChoiceModal(false);
                                                        setShowAiGeneratorModal(true);
                                                    }}
                                                    className="w-full flex items-center gap-4 p-5 bg-white border-2 border-[#cbe0f6] hover:border-[#73a4db] hover:bg-[#f0f5fb] rounded-2xl transition-all group/opt shadow-sm"
                                                >
                                                    <div className="bg-[#cbe0f6] p-3 rounded-xl group-hover/opt:bg-[#346297] transition-colors">
                                                        <Sparkles className="w-6 h-6 text-[#1c3a60] group-hover/opt:text-white" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-black text-[#1c3a60] text-sm">Autogenerar con IA</p>
                                                        <p className="text-[10px] text-[#73a4db] font-bold uppercase tracking-widest mt-0.5">Generación Express</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </button>

                                {filteredWorlds.length === 0 ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-24 bg-[#f0f5fb]/50 rounded-3xl border-2 border-dashed border-[#cbe0f6]">
                                        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                            <Search className="w-10 h-10 text-[#73a4db]" />
                                        </div>
                                        <p className="text-[#73a4db] font-bold">No se encontraron aventuras</p>
                                        <p className="text-[#73a4db] text-sm">Prueba con otros términos o crea una nueva.</p>
                                    </div>
                                ) : (
                                    filteredWorlds.map(w => {
                                        // Calculate Metrics
                                        const worldStudents = students.filter(s => s.assignedWorlds?.some(aw => aw.id === w.id));
                                        const totalGrades = worldStudents.reduce((acc, s) => {
                                            const autoGrade = s.automaticProjectGrades?.find(ag => ag.worldId === w.id);
                                            return acc + (autoGrade?.averageGrade || 0);
                                        }, 0);
                                        const avgEfficiency = worldStudents.length > 0 ? (totalGrades / worldStudents.length).toFixed(1) : "0.0";
                                        
                                        let activeInClasses = [];
                                        if (w.classrooms && w.classrooms.length > 0) {
                                            activeInClasses = classrooms.filter(c => w.classrooms!.some((wc: any) => wc.id === c.id));
                                        } else {
                                            activeInClasses = classrooms.filter(c => 
                                                students.some(s => s.classroomId === c.id && s.assignedWorlds?.some(aw => aw.id === w.id))
                                            );
                                        }

                                        const cardColor = w.color || THEME_COLORS[w.theme as ThemeKey] || THEME_COLORS.clasico;

                                        return (
                                            <div key={w.id} className="group bg-white/40 backdrop-blur-md rounded-[1.5rem] border-2 border-white/60 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden">
                                                {/* Card Header (Tactical Visual) - Dynamic Color */}
                                                <div className="h-32 p-6 flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: cardColor }}>
                                                    <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:scale-110 transition-transform duration-700">
                                                        <Globe className="w-40 h-40 text-white" />
                                                    </div>
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-white text-[#1c3a60] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-lg">
                                                                {w.pedagogy?.grade || "Nivel General"}
                                                            </span>
                                                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                                        </div>
                                                        <button 
                                                            onClick={() => setWorldToDelete(w)} 
                                                            className="p-2.5 bg-black/20 hover:bg-rose-600 text-white rounded-[1rem] transition-all shadow-lg border border-white/20 backdrop-blur-sm"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <h3 className="text-white text-lg font-black leading-tight line-clamp-2 pr-8 relative z-10 uppercase tracking-tighter">{w.title || "Aventura Sin Título"}</h3>
                                                </div>

                                                    {/* Card Body - Pedagogy Detail Grid */}
                                                    <div className="p-6 flex flex-col flex-1 space-y-5">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-widest block">Campos Formativos</span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {w.pedagogy?.camposFormativos && w.pedagogy.camposFormativos.length > 0 ? (
                                                                        w.pedagogy.camposFormativos.map((cf, idx) => (
                                                                            <span key={idx} className="bg-[#f0f5fb] text-[#1c3a60] text-[8px] font-black px-2 py-0.5 rounded-md border border-[#cbe0f6]">
                                                                                {cf}
                                                                            </span>
                                                                        ))
                                                                    ) : w.pedagogy?.topic ? (
                                                                        <span className="bg-[#f0f5fb] text-[#1c3a60] text-[8px] font-black px-2 py-0.5 rounded-md border border-[#cbe0f6]">
                                                                            {w.pedagogy.topic}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[8px] text-[#73a4db] italic">No definidos</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-widest block">PDA</span>
                                                                <p className="text-[10px] font-bold text-[#1c3a60] line-clamp-2 leading-tight">
                                                                    {w.pedagogy?.pda || "Sin PDA específico."}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-black text-[#346297] uppercase tracking-widest block">Ejes Articuladores</span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {w.pedagogy?.ejes && w.pedagogy.ejes.length > 0 ? (
                                                                    w.pedagogy.ejes.map((eje, idx) => (
                                                                        <span key={idx} className="bg-[#f0f5fb] text-[#1c3a60] text-[8px] font-bold px-2 py-0.5 rounded-md border border-[#cbe0f6]">
                                                                            {eje}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[8px] text-[#73a4db] italic">No seleccionados</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 bg-[#f0f5fb]/50 p-4 rounded-2xl border border-[#cbe0f6]">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-widest block">Propósito</span>
                                                                    <p className="text-[10px] text-[#346297] line-clamp-3 leading-snug">
                                                                        {w.pedagogy?.proposito || "No documentado."}
                                                                    </p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-widest block">Diagnóstico</span>
                                                                    <p className="text-[10px] text-[#346297] line-clamp-3 leading-snug">
                                                                        {w.pedagogy?.diagnostico || "No documentado."}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="pt-2 mt-2 border-t border-[#cbe0f6]">
                                                                <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-widest block mb-1">Contenidos</span>
                                                                <p className="text-[10px] font-black text-[#1c3a60] line-clamp-1">
                                                                    {w.pedagogy?.contenidos || "Contenidos generales de la fase."}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Metrics Row - Tactical High Contrast */}
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="bg-white p-3 rounded-xl flex flex-col items-center border border-[#cbe0f6] shadow-sm transition-colors hover:border-[#cbe0f6]">
                                                                <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-tighter mb-1">Eficacia</span>
                                                                <span className={`text-sm font-black ${parseFloat(avgEfficiency) >= 8 ? 'text-emerald-600' : parseFloat(avgEfficiency) >= 6 ? 'text-amber-600' : 'text-[#73a4db]'}`}>
                                                                    {avgEfficiency}
                                                                </span>
                                                            </div>
                                                            <div className="bg-[#f0f5fb]/30 p-3 rounded-xl flex flex-col items-center border border-[#cbe0f6] shadow-sm">
                                                                <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-tighter mb-1">Salones</span>
                                                                <span className="text-sm font-black text-[#1c3a60]">{activeInClasses.length}</span>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-xl flex flex-col items-center border border-[#cbe0f6] shadow-sm">
                                                                <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-tighter mb-1">Etapas</span>
                                                                <span className="text-sm font-black text-[#1c3a60]">{w.days?.length || 0}</span>
                                                            </div>
                                                        </div>


                                                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {activeInClasses.length > 0 ? (
                                                                <div className="flex -space-x-1">
                                                                    {activeInClasses.map((cl, i) => (
                                                                        <div key={i} title={cl.name} className="w-6 h-6 rounded-full bg-[#cbe0f6] border border-white flex items-center justify-center text-[10px] shadow-sm">
                                                                            {cl.emoji || "🏫"}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-[#73a4db]">Sin asignar</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => { setBuilderWorld(w); setShowBuilderModal(true); }}
                                                            className="text-xs font-bold text-[#1c3a60] hover:text-[#1c3a60] flex items-center gap-1.5 transition-colors"
                                                        >
                                                            Configurar <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* STUDENTS TAB — Centro de Mando Unificado (Salón & Análisis) */}
                {activeTab === 'reports' && (
                    <div className="flex flex-col h-full animate-fade-in p-0">
                        <PerformanceDashboard 
                            selectedClassroomId={selectedClassroomId}
                            setSelectedClassroomId={setSelectedClassroomId}
                            isSuspended={isSuspended}
                            studentsLimitReached={studentsLimitReached}
                            maxStudents={schoolInfo?.maxStudents || 25}
                            onOpenAddClassroom={() => {
                                setEditingClassroom(null);
                                setNewClassName("");
                                setNewClassEmoji("📚");
                                setSelectedGradeIdInModal("");
                                setNewClassDescription("");
                                setShowAddClassroomModal(true);
                            }}
                            onEditClassroom={(cls) => {
                                setEditingClassroom(cls);
                                setNewClassName(cls.name);
                                setNewClassEmoji(cls.emoji);
                                setSelectedGradeIdInModal(cls.gradeId || "");
                                setNewClassDescription(cls.description || "");
                                setShowAddClassroomModal(true);
                            }}
                            onDeleteClassroom={handleDeleteClassroom}
                            onOpenAddStudent={() => {
                                if (isSuspended) return alert("Tu cuenta está suspendida. Contacta a un administrador.");
                                if (studentsLimitReached) return alert(`Has alcanzado el límite de ${schoolInfo?.maxStudents || 25} alumno(s) en tu plan actual.`);
                                setStudentName("");
                                setStudentAvatar("🧑🏻");
                                setEditingStudent(null);
                                setSelectedClassroomInModal(selectedClassroomId);
                                setShowAddStudentModal(true);
                            }}
                            onEditStudent={(student) => {
                                setEditingStudent(student);
                                setStudentName(student.name);
                                setStudentAvatar(student.avatar);
                                setSelectedClassroomInModal(student.classroomId || "");
                                setShowAddStudentModal(true);
                            }}
                            onDeleteStudent={(student) => setStudentToDelete(student)}
                            onOpenBulkModal={() => setShowBulkModal(true)}
                        />
                    </div>
                )}

                {activeTab === 'behavior' && (
                    <div className="flex flex-col h-full animate-fade-in bg-slate-50/50">
                        <BehaviorTracker students={students} classroomId={selectedClassroomId} setStudents={setStudents} />
                    </div>
                )}

                {activeTab === 'toolkit' && (
                    <div className="flex flex-col h-full animate-fade-in bg-slate-50/50">
                        <TeacherToolkit students={students} classroomId={selectedClassroomId} />
                    </div>
                )}

                {activeTab === 'story' && (
                    <div className="flex flex-col h-full animate-fade-in bg-slate-50/50">
                        <ClassStoryFeed classroomId={selectedClassroomId} isTeacher={true} />
                    </div>
                )}

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-[#1c3a60]/90 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-2xl flex justify-between items-center px-4 py-3 z-50 overflow-x-auto gap-4 custom-scrollbar">
                <button onClick={() => setActiveTab("reports")} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'reports' ? 'text-[#73a4db] scale-110' : 'text-[#73a4db]'}`}>
                    <Users className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Salón</span>
                </button>
                <button onClick={() => setActiveTab("library")} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'library' ? 'text-[#73a4db] scale-110' : 'text-[#73a4db]'}`}>
                    <Library className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Mapas</span>
                </button>
                <button onClick={() => setActiveTab("story")} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'story' ? 'text-[#73a4db] scale-110' : 'text-[#73a4db]'}`}>
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Feed</span>
                </button>
                <button onClick={() => setActiveTab("behavior")} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'behavior' ? 'text-emerald-400 scale-110' : 'text-[#73a4db]'}`}>
                    <Star className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Puntos</span>
                </button>
                <button onClick={() => setActiveTab("toolkit")} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'toolkit' ? 'text-amber-400 scale-110' : 'text-[#73a4db]'}`}>
                    <Wrench className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Tools</span>
                </button>
                <button onClick={() => setActiveTab("raid")} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'raid' ? 'text-rose-400 scale-110' : 'text-[#73a4db]'}`}>
                    <Swords className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Raid</span>
                </button>
                <button onClick={() => setActiveTab("messages")} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'messages' ? 'text-[#73a4db] scale-110' : 'text-[#73a4db]'}`}>
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Msgs</span>
                </button>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="flex flex-col items-center gap-1.5 text-[#73a4db] hover:text-rose-400 transition-all">
                    <LogOut className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Salir</span>
                </button>
            </nav>


            {/* Upload Engine Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-[#1c3a60]/90 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
                        >
                            <X className="w-5 h-5 text-[#73a4db]" />
                        </button>
                        <UploadEngine
                            onSuccess={() => {
                                setShowUploadModal(false);
                                setActiveTab("library");
                            }}
                        />
                    </div>
                </div>
            )}

            {showAiGeneratorModal && (
                <AiProjectGenerator 
                    onClose={() => setShowAiGeneratorModal(false)}
                    onSuccess={() => {
                        setShowAiGeneratorModal(false);
                        setActiveTab("library");
                    }}
                />
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-[#1c3a60]/90 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
                        <button
                            onClick={() => setShowBulkModal(false)}
                            className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
                        >
                            <X className="w-5 h-5 text-[#73a4db]" />
                        </button>
                        <BulkEvidenceUploader onClose={() => setShowBulkModal(false)} />
                    </div>
                </div>
            )}



            {/* Delete Confirmation Modal */}
            {worldToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
                    <div className="bg-[#1c3a60] border border-white/10 rounded-3xl w-full max-w-md p-8 relative shadow-2xl text-center transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 border border-rose-500/20">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">¿Eliminar Aventura?</h3>
                        <p className="text-[#73a4db] mb-6 font-medium text-sm">
                            Estás a punto de borrar permanentemente <span className="font-bold text-white">{worldToDelete.title}</span>.
                            Esta acción eliminará todos los niveles y el progreso. No se puede deshacer.
                        </p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => setWorldToDelete(null)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors border border-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    deleteWorld(worldToDelete.id);
                                    setWorldToDelete(null);
                                }}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-600/20 transition-transform active:scale-95"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Student Modal */}
            {(showAddStudentModal || editingStudent) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-[#1c3a60] border border-white/10 rounded-3xl w-full max-w-md p-6 md:p-8 relative shadow-2xl">
                        <button
                            onClick={() => { setShowAddStudentModal(false); setEditingStudent(null); setStudentName(""); setStudentAvatar("🧑🏻"); }}
                            className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
                        >
                            <X className="w-5 h-5 text-[#73a4db]" />
                        </button>
                        <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">
                            {editingStudent ? "Editar Alumno" : "Agregar Alumno"}
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-[#73a4db] uppercase tracking-widest mb-2">Nombre del Alumno</label>
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#73a4db] outline-none transition font-medium text-white placeholder:text-[#346297]"
                                    placeholder="Ej. María López"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[#73a4db] uppercase tracking-widest mb-2">Avatar</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {AVATAR_OPTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setStudentAvatar(emoji)}
                                            className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all ${studentAvatar === emoji ? 'bg-[#1c3a60] ring-2 ring-[#73a4db] scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[#73a4db] uppercase tracking-widest mb-2">Asignar a Salón</label>
                                <select
                                    value={selectedClassroomInModal}
                                    onChange={(e) => setSelectedClassroomInModal(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#73a4db] outline-none transition font-medium text-white"
                                >
                                    <option value="" className="bg-[#1c3a60] text-[#73a4db] font-bold uppercase tracking-widest text-[10px]">Sin Salón (General)</option>
                                    {classrooms.map(cls => (
                                        <option key={cls.id} value={cls.id} className="bg-[#1c3a60]">{cls.emoji} {cls.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleSaveStudent}
                                disabled={!studentName.trim() || savingStudent}
                                className="w-full bg-[#1c3a60] hover:bg-[#1c3a60] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg shadow-[#1c3a60]/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                            >
                                {savingStudent ? "Guardando..." : (editingStudent ? "Guardar Cambios" : "Agregar Alumno")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Student Confirmation Modal */}
            {studentToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                            {studentToDelete.avatar}
                        </div>
                        <h3 className="text-2xl font-bold text-[#1c3a60] mb-2">¿Eliminar Alumno?</h3>
                        <p className="text-[#346297] mb-6 font-medium">
                            Estás a punto de borrar permanentemente a <span className="font-bold text-[#1c3a60]">{studentToDelete.name}</span>.
                            Se eliminará todo su progreso, inventario y logros. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => setStudentToDelete(null)}
                                className="flex-1 bg-[#cbe0f6] hover:bg-[#cbe0f6] text-[#346297] font-bold py-3 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDeleteStudent}
                                disabled={savingStudent}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-transform active:scale-95"
                            >
                                {savingStudent ? "Eliminando..." : "Sí, Eliminar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Map Modal */}
            {showAssignMapModal && studentForAssignMap && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-6 md:p-8 relative shadow-2xl">
                        <button
                            onClick={() => { setShowAssignMapModal(false); setStudentForAssignMap(null); }}
                            className="absolute top-4 right-4 p-2 bg-[#cbe0f6] rounded-full hover:bg-[#cbe0f6] transition"
                        >
                            <X className="w-5 h-5 text-[#346297]" />
                        </button>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-4xl">{studentForAssignMap.avatar}</div>
                            <div>
                                <h3 className="text-xl font-bold text-[#1c3a60]">
                                    Asignar Mapa a {studentForAssignMap.name}
                                </h3>
                                <p className="text-sm text-[#73a4db]">Selecciona el mapa al que tendrá acceso.</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {worlds.length === 0 ? (
                                <p className="text-[#73a4db] text-center py-4">No has creado ningún mapa todavía.</p>
                            ) : (
                                worlds.map(w => {
                                    const isAssigned = studentForAssignMap.assignedWorlds?.some(aw => aw.id === w.id);
                                    return (
                                        <div key={w.id} className={`p-4 border rounded-xl transition-colors flex items-center justify-between ${isAssigned ? 'border-[#346297] bg-[#f0f5fb]/30' : 'border-[#cbe0f6] hover:border-[#73a4db]'}`}>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-bold ${isAssigned ? 'text-[#1c3a60]' : 'text-[#346297]'}`}>{w.title || "Aventura Sin Título"}</h4>
                                                    {isAssigned && <span className="bg-[#cbe0f6] text-[#1c3a60] text-[10px] px-2 py-0.5 rounded-full font-bold">Asignado</span>}
                                                </div>
                                                <p className="text-xs text-[#73a4db]">Tema: {w.theme}</p>
                                            </div>
                                            <button
                                                onClick={() => handleAssignMapToStudent(w.id)}
                                                disabled={isAssigningMap}
                                                className={`px-4 py-2 font-bold rounded-lg transition-colors text-sm disabled:opacity-50 ${isAssigned ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-[#f0f5fb] text-[#1c3a60] hover:bg-[#cbe0f6]'}`}
                                            >
                                                {isAssigned ? "Desasignar" : "Asignar"}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Review Suggestions Modal */}
            {showAiReviewModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-8 relative shadow-2xl overflow-hidden">
                        <button
                            onClick={() => setShowAiReviewModal(false)}
                            className="absolute top-4 right-4 p-2 bg-[#cbe0f6] hover:bg-[#cbe0f6] rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-[#346297]" />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-[#cbe0f6] p-4 rounded-full text-[#1c3a60]">
                                <BrainCircuit className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[#1c3a60]">Sugerencias del Tutor IA</h3>
                                <p className="text-[#73a4db] font-medium">Análisis Pedagógico</p>
                            </div>
                        </div>

                        {isAiThinking ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1c3a60]"></div>
                                <p className="text-[#73a4db] font-medium animate-pulse">Analizando evidencias y comportamiento de los alumnos...</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in-up">
                                {aiDiagnosis && (
                                    <>
                                        <div className="bg-[#f0f5fb] p-5 rounded-2xl border border-[#cbe0f6]">
                                            <h4 className="font-bold text-[#1c3a60] text-lg mb-2">Diagnóstico para {strugglingStudentContext?.student.name}</h4>
                                            <p className="text-[#346297] leading-relaxed text-sm">
                                                {aiDiagnosis.diagnosis}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-bold text-[#1c3a60]">Plan de Intervención Recomendado:</h4>
                                            {aiDiagnosis.recommendations?.map((rec: { title: string, description: string }, idx: number) => (
                                                <div key={idx} className="flex gap-4 items-start p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">{idx + 1}</div>
                                                    <div>
                                                        <p className="font-bold text-emerald-900 text-sm mb-1">{rec.title}</p>
                                                        <p className="text-xs text-emerald-800 opacity-90">{rec.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-6 border-t border-[#cbe0f6] flex justify-end gap-3">
                                            <button
                                                onClick={() => setShowAiReviewModal(false)}
                                                className="px-6 py-2 rounded-xl text-[#73a4db] font-bold hover:bg-[#cbe0f6] transition-colors"
                                            >
                                                Cerrar
                                            </button>
                                            <button
                                                onClick={handleAiIntervention}
                                                className="bg-[#1c3a60] hover:bg-[#1c3a60] text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-[#cbe0f6] transition-transform active:scale-95 flex items-center gap-2"
                                            >
                                                <Map className="w-4 h-4" />
                                                Crear Misión Autónoma
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Ficha Descriptiva Modal */}
            {activeStudentProfileId && (() => {
                const s = students.find(s => s.id === activeStudentProfileId);
                const globalProgress = s ? calculateStudentProgress(s.id, progress, worlds) : 0;
                
                const selectedWorldInProfile = worlds.find(w => w.id === profileScopeWorldId);
                const displayProgress = profileScopeWorldId === 'global' ? globalProgress : (selectedWorldInProfile && s ? calculateStudentProgressForWorld(s.id, progress, selectedWorldInProfile) : 0);
                
                const displayGrade = profileScopeWorldId === 'global' 
                    ? s?.globalActivityAverage 
                    : s?.automaticProjectGrades?.find((g: any) => g.worldId === profileScopeWorldId)?.averageGrade;

                const getSpecificContext = () => {
                    if (!s) return null;
                    if (profileScopeWorldId === 'global') return null; // We'll handle 'global' natively below
                    if (!selectedWorldInProfile) return null;

                    const levelsDone = progress[s.id]?.[selectedWorldInProfile.id] || [];
                    let targetLevelId = levelsDone.length > 0 ? Math.max(...levelsDone) + 1 : 1;
                    if (targetLevelId > selectedWorldInProfile.days.length) {
                        targetLevelId = selectedWorldInProfile.days.length;
                    }
                    const stuckLevel = selectedWorldInProfile.days.find(d => d.dayNumber === targetLevelId);
                    return { student: s, level: stuckLevel, world: selectedWorldInProfile };
                };
                
                const sSpecificContext = getSpecificContext();

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c3a60]/40 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
                            <div className="p-8 pb-4 shrink-0 overflow-y-auto max-h-[90vh] scrollbar-hide flex-1">
                                <button
                                    onClick={() => setActiveStudentProfileId(null)}
                                    className="absolute top-4 right-4 p-2 bg-[#cbe0f6] hover:bg-[#cbe0f6] rounded-full transition-colors z-10"
                                >
                                    <X className="w-5 h-5 text-[#346297]" />
                                </button>

                                <div className="flex flex-col items-center mb-6">
                                    <div className="text-6xl mb-4 bg-[#f0f5fb] rounded-full w-24 h-24 flex items-center justify-center shadow-inner border border-[#cbe0f6]">{s?.avatar}</div>
                                    <h2 className="text-2xl font-bold text-[#1c3a60]">{s?.name}</h2>
                                    <p className="text-[#73a4db] text-sm">Expediente Unificado del Alumno</p>
                                    <span className="mt-1 text-[10px] bg-[#cbe0f6] text-[#73a4db] px-2 py-0.5 rounded font-mono tracking-wider font-bold">Código: {s?.studentCode || 'N/A'}</span>
                                </div>

                                <div className="space-y-4">
                                    {/* Project Scope Filter */}
                                    <div className="bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl p-3 flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-[#73a4db] tracking-widest px-1">Mostrar Analítica Para:</label>
                                        <select 
                                            value={profileScopeWorldId}
                                            onChange={(e) => {
                                                setProfileScopeWorldId(e.target.value);
                                                setAiReport(null); // Reset report when changing context
                                                setIsGeneratingReport(false);
                                            }}
                                            className="w-full bg-white border border-[#cbe0f6] text-[#346297] text-sm rounded-lg px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#73a4db]"
                                        >
                                            <option value="global">🌍 Todos los Proyectos (Global)</option>
                                            {s?.assignedWorlds && s.assignedWorlds.length > 0 && (
                                                <optgroup label="Proyectos Asignados">
                                                    {s.assignedWorlds.map((w: any) => (
                                                        <option key={w.id} value={w.id}>🗺️ {w.title || "Sin título"}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="p-4 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl">
                                        <div className="flex justify-between font-bold text-[#1c3a60] mb-2">
                                            <span>Progreso {profileScopeWorldId === 'global' ? 'Global (Todos)' : `del Proyecto`}</span>
                                            <span>{Math.round(displayProgress)}%</span>
                                        </div>
                                        <div className="w-full bg-white/60 rounded-full h-2">
                                            <div className={`${getClassColor(displayProgress)} h-2 rounded-full transition-all duration-500`} style={{ width: `${displayProgress}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Dynamic Metrics */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-[#f0f5fb] p-3 border border-[#cbe0f6] rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] text-[#73a4db] font-black uppercase tracking-wider mb-1">Calificación</span>
                                            <span className={`text-2xl font-black ${displayGrade !== undefined && displayGrade !== null ? (displayGrade >= 8 ? 'text-emerald-500' : displayGrade >= 6 ? 'text-amber-500' : 'text-rose-500') : 'text-[#73a4db]'}`}>
                                                {displayGrade !== undefined && displayGrade !== null ? displayGrade.toFixed(1) : 'S/D'}
                                            </span>
                                        </div>
                                        <div className="bg-[#f0f5fb] p-3 border border-[#cbe0f6] rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] text-[#73a4db] font-black uppercase tracking-wider mb-1">Gemas Total</span>
                                            <span className="text-[#1c3a60] font-black text-xl flex items-center justify-center gap-1">💎 {s?.gems || 0}</span>
                                        </div>
                                        <div className="bg-[#f0f5fb] p-3 border border-[#cbe0f6] rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] text-[#73a4db] font-black uppercase tracking-wider mb-1">XP Total</span>
                                            <span className="text-orange-500 font-black text-xl flex items-center justify-center gap-1">✨ {s?.xp || 0}</span>
                                        </div>
                                    </div>

                                    {/* Quick Admin Actions */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => { if(s) { setStudentForAssignMap(s); setShowAssignMapModal(true); setActiveStudentProfileId(null); }}}
                                            className="flex flex-col items-center gap-1 p-3 bg-[#f0f5fb] hover:bg-[#cbe0f6] border border-[#cbe0f6] rounded-xl transition-colors group"
                                        >
                                            <Map className="w-4 h-4 text-[#346297] group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-bold text-[#1c3a60]">Mapas</span>
                                        </button>
                                        <button
                                            onClick={() => { if(s) { setEditingStudent(s); setStudentName(s.name); setStudentAvatar(s.avatar); setSelectedClassroomInModal(s.classroomId || ""); setShowAddStudentModal(true); setActiveStudentProfileId(null); }}}
                                            className="flex flex-col items-center gap-1 p-3 bg-[#f0f5fb] hover:bg-[#cbe0f6] border border-[#cbe0f6] rounded-xl transition-colors group"
                                        >
                                            <Pencil className="w-4 h-4 text-[#346297] group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-bold text-[#1c3a60]">Editar</span>
                                        </button>
                                        <button
                                            onClick={() => { if(s) { setStudentToDelete(s); setActiveStudentProfileId(null); }}}
                                            className="flex flex-col items-center gap-1 p-3 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-colors group"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-bold text-red-500">Eliminar</span>
                                        </button>
                                    </div>

                                    <div className="bg-white border text-sm text-[#346297] border-[#cbe0f6] rounded-xl p-4">
                                        <h4 className="font-bold text-[#1c3a60] mb-2">Estado Actual en la Plataforma:</h4>
                                        {profileScopeWorldId === 'global' ? (
                                            <p className="leading-snug">
                                                El alumno está inscrito en <strong>{s?.assignedWorlds?.length || 0} proyectos activos</strong>. Selecciona un proyecto en el menú superior para ver su sesión exacta.
                                            </p>
                                        ) : sSpecificContext ? (
                                            <p className="leading-snug">
                                                Activado en proyecto <strong>"{sSpecificContext.world.title}"</strong>, sesión recomendada actualmente: <strong>{sSpecificContext.level?.title || "Sesión Final"}</strong>.
                                            </p>
                                        ) : (
                                            <p className="opacity-60 italic">El alumno no tiene progreso reciente en este proyecto.</p>
                                        )}
                                    </div>

                                    {/* Análisis Pedagógico — Powered by AI */}
                                    <div className="bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl p-4 text-sm mt-4">
                                        <h4 className="font-bold text-[#1c3a60] mb-2 flex items-center gap-2">
                                            <BrainCircuit className="w-4 h-4" /> Reporte Pedagógico IA {profileScopeWorldId === 'global' ? '(General)' : `(Específico)`}
                                        </h4>
                                        {aiReport ? (
                                            <div className="prose prose-sm prose-sky max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{aiReport}</ReactMarkdown>
                                            </div>
                                        ) : isGeneratingReport ? (
                                            <div className="flex items-center gap-3 p-4">
                                                <div className="animate-spin h-5 w-5 border-2 border-[#1c3a60] border-t-transparent rounded-full"></div>
                                                <span className="text-[#1c3a60] font-medium">Generando reporte con IA...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-[#1c3a60] leading-relaxed italic mb-3">
                                                    {displayProgress >= 70 ? (
                                                        "El alumno demuestra un dominio sólido de los conceptos analizados."
                                                    ) : displayProgress >= 30 ? (
                                                        "El alumno comprende la teoría básica pero necesita refuerzo práctico."
                                                    ) : (
                                                        "El alumno muestra inconsistencias. Se recomienda intervención o tutoría."
                                                    )}
                                                </p>
                                                <div className="flex flex-col gap-2">
                                                    {/* Teacher report — shows inline */}
                                                    <button
                                                        onClick={async () => {
                                                            setIsGeneratingReport(true);
                                                            try {
                                                                const payload = {
                                                                    studentId: s?.id,
                                                                    studentName: s?.name,
                                                                    reportType: 'teacher',
                                                                    worldFilter: profileScopeWorldId === 'global' ? null : profileScopeWorldId
                                                                };
                                                                const res = await fetch('/api/ai/generate-report', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify(payload)
                                                                });
                                                                const data = await res.json();
                                                                setAiReport(data.report);
                                                            } catch (e) {
                                                                setAiReport('Error al generar el reporte.');
                                                            }
                                                            setIsGeneratingReport(false);
                                                        }}
                                                        className="bg-[#1c3a60] hover:bg-[#1c3a60] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                                    >
                                                        <BrainCircuit className="w-4 h-4" /> Generar Reporte para Docente (IA)
                                                    </button>
                                                    {/* Parent report — opens print window as PDF */}
                                                    <button
                                                        onClick={async () => {
                                                            setIsGeneratingReport(true);
                                                            try {
                                                                const res = await fetch('/api/ai/generate-report', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        studentId: s?.id,
                                                                        studentName: s?.name,
                                                                        reportType: 'parent',
                                                                        worldFilter: profileScopeWorldId === 'global' ? null : profileScopeWorldId
                                                                    })
                                                                });
                                                                const data = await res.json();
                                                                const scopeWorld = profileScopeWorldId !== 'global' ? worlds.find(w => w.id === profileScopeWorldId) : null;
                                                                openReportWindow('parent', s?.name || 'Alumno', [{
                                                                    studentName: s?.name || '',
                                                                    xp: s?.xp || 0,
                                                                    gems: s?.gems || 0,
                                                                    progress: Math.round(displayProgress),
                                                                    aiText: Array.isArray(data.paragraphs) ? data.paragraphs.join('\n\n') : (data.report || ''),
                                                                    worldTitle: scopeWorld?.title,
                                                                    homeActivity: data.homeActivity
                                                                }]);
                                                            } catch (e) {
                                                                console.error("PDF Generate Error", e);
                                                                alert('Error al generar el reporte para padres.');
                                                            }
                                                            setIsGeneratingReport(false);
                                                        }}
                                                        className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                                    >
                                                        <FileText className="w-4 h-4" /> Exportar Reporte para Padres (PDF)
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                            {/* Expediente de Evidencias (AI Feedback Hub) — Agrupado por Proyecto */}
                            <div className="mt-6">
                                <h3 className="font-bold text-[#1c3a60] text-lg mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-[#346297]" />
                                    Evidencias por Proyecto
                                </h3>
                                {isFetchingEvidence ? (
                                    <div className="flex items-center justify-center p-8 bg-[#f0f5fb] rounded-xl">
                                        <div className="animate-spin h-6 w-6 border-2 border-[#1c3a60] border-t-transparent rounded-full"></div>
                                    </div>
                                ) : studentEvidence.length === 0 ? (
                                    <div className="p-6 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-center">
                                        <p className="text-[#73a4db] font-medium">Aún no hay evidencias escaneadas.</p>
                                    </div>
                                ) : (() => {
                                    const filteredEvidence = profileScopeWorldId === 'global' 
                                        ? studentEvidence 
                                        : studentEvidence.filter(entry => entry.worldId === profileScopeWorldId);

                                    if (filteredEvidence.length === 0) {
                                        return (
                                            <div className="p-6 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-center">
                                                <p className="text-[#73a4db] font-medium">No hay evidencias o misiones completadas para este proyecto en particular.</p>
                                            </div>
                                        );
                                    }

                                    // Group evidence by world/project
                                    const grouped: Record<string, typeof studentEvidence> = {};
                                    filteredEvidence.forEach(entry => {
                                        const key = entry.world?.title || entry.world?.theme || entry.topic || 'Sin Proyecto';
                                        if (!grouped[key]) grouped[key] = [];
                                        grouped[key].push(entry);
                                    });

                                    return (
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                            {Object.entries(grouped).map(([projectName, entries]) => (
                                                <details key={projectName} className="bg-white border border-[#cbe0f6] rounded-xl overflow-hidden group/details" open>
                                                    <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#f0f5fb] transition-colors select-none">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">🗺️</span>
                                                            <span className="font-bold text-sm text-[#1c3a60]">{projectName}</span>
                                                            <span className="text-[10px] font-bold bg-[#cbe0f6] text-[#73a4db] px-1.5 py-0.5 rounded-full">{entries.length}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-green-600">{entries.filter(e => e.isCorrect).length} ✓</span>
                                                            <span className="text-[10px] font-bold text-red-500">{entries.filter(e => !e.isCorrect).length} ✗</span>
                                                        </div>
                                                    </summary>
                                                    <div className="border-t border-[#cbe0f6] p-3 space-y-3">
                                                        {entries.map((entry, idx) => (
                                                            <div key={idx} className={`p-3 rounded-lg border text-sm ${entry.isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${entry.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {entry.isCorrect ? '✓ Correcto' : '✗ Por Mejorar'}
                                                                        </span>
                                                                        {entry.grade !== null && entry.grade !== undefined && (
                                                                            <span className="text-[10px] font-black text-[#346297] bg-[#cbe0f6] px-1.5 py-0.5 rounded">{entry.grade}/10</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] text-[#73a4db]">{new Date(entry.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="text-xs text-[#346297] italic border-l-2 border-[#cbe0f6] pl-2 py-0.5 mb-2">"{entry.studentAnswer}"</p>
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-sm flex-shrink-0">🤖</span>
                                                                    <p className="text-xs text-[#346297] leading-relaxed">{entry.feedback}</p>
                                                                </div>
                                                                {entry.emotionDetected && (
                                                                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[#73a4db] bg-white border border-[#cbe0f6] px-1.5 py-0.5 rounded">Tono: <strong className="text-[#1c3a60]">{entry.emotionDetected}</strong></span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        const ctx = getStudentContext(s?.id || "");
                                        setHintText(`${s?.name}, veo que estás dedicándole mucho esfuerzo al problema "${ctx?.level?.title || "actual"}". Analiza los datos de entrada nuevamente; recuerda que la relación es proporcional. ¡Tú puedes!`);
                                        setStudentForHintId(s?.id || null);
                                        setActiveStudentProfileId(null);
                                    }}
                                    className="flex-1 bg-yellow-100 border border-yellow-200 hover:bg-yellow-200 text-yellow-800 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    Enviar Pista por IA
                                </button>
                                <button
                                    onClick={() => setActiveStudentProfileId(null)}
                                    className="flex-1 bg-[#cbe0f6] hover:bg-[#cbe0f6] text-[#346297] font-bold py-3 rounded-xl transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                )
            })()}

            {/* Global Stats Modal */}
            {showGlobalStatsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowGlobalStatsModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowGlobalStatsModal(false)}
                            className="sticky top-0 float-right p-2 bg-[#cbe0f6] hover:bg-[#cbe0f6] rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-[#346297]" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-[#f0f5fb] p-3 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-[#1c3a60]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-[#1c3a60]">Estadísticas por Salón</h2>
                                <p className="text-[#1c3a60]/70 text-xs font-medium">Resumen de rendimiento y alertas del aula</p>
                            </div>
                        </div>

                        {/* Filter selectors */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-[#73a4db] uppercase tracking-wider ml-1">Proyecto / Mapa</label>
                                <select
                                    value={effectiveInsightWorldId}
                                    onChange={e => setSelectedInsightWorldId(e.target.value)}
                                    className="bg-white border-2 border-[#cbe0f6] rounded-xl px-4 py-2 text-sm font-bold text-[#1c3a60] focus:ring-4 focus:ring-[#cbe0f6] focus:border-[#73a4db] outline-none transition-all shadow-sm"
                                >
                                    {worlds.map(w => (
                                        <option key={w.id} value={w.id}>
                                            🗺️ {w.title || w.theme}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider ml-1">Filtro por Salón</label>
                                <select
                                    value={insightClassroomId}
                                    onChange={e => setInsightClassroomId(e.target.value)}
                                    className="bg-white border-2 border-emerald-100 rounded-xl px-4 py-2 text-sm font-bold text-emerald-800 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all shadow-sm"
                                >
                                    <option value="all">🏫 Todos los Salones</option>
                                    {classrooms.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.emoji} {cls.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                <span className="text-2xl font-black text-emerald-700">{metrics.average}</span>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Promedio</p>
                            </div>
                            <div className="bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl p-4 text-center">
                                <span className="text-2xl font-black text-[#1c3a60]">{metrics.completion}%</span>
                                <p className="text-[10px] font-bold text-[#346297] uppercase mt-1">Completado</p>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                                <span className="text-2xl font-black text-red-700">{atRiskStudents.length}</span>
                                <p className="text-[10px] font-bold text-red-500 uppercase mt-1">En Riesgo</p>
                            </div>
                        </div>

                        {/* Alerts & Warnings */}
                        {(atRiskStudents.length > 0 || strugglingStudents.length > 0) && (
                            <div className="bg-white border border-red-100 rounded-xl p-4 mb-6">
                                <h3 className="text-sm font-bold text-[#1c3a60] flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-red-500" /> Sistema de Alerta Temprana
                                </h3>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {atRiskStudents.map(student => (
                                        <div key={student.id} onClick={() => { setShowGlobalStatsModal(false); setAiReport(null); setActiveStudentProfileId(student.id); }} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{student.avatar}</span>
                                                <span className="font-bold text-sm text-red-800">{student.name}</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">Alto Riesgo</span>
                                        </div>
                                    ))}
                                    {strugglingStudents.map(student => (
                                        <div key={student.id} onClick={() => { setShowGlobalStatsModal(false); setAiReport(null); setActiveStudentProfileId(student.id); }} className="flex items-center justify-between p-2.5 bg-yellow-50 rounded-lg border border-yellow-100 cursor-pointer hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{student.avatar}</span>
                                                <span className="font-bold text-sm text-yellow-800">{student.name}</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Vigilancia</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Student Performance List */}
                        <div className="bg-white border border-[#cbe0f6] rounded-xl p-4">
                            <h3 className="text-sm font-bold text-[#1c3a60] flex items-center gap-2 mb-3">
                                <TrendingUp className="w-4 h-4 text-[#346297]" /> Rendimiento Individual
                            </h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {insightStudents.map(student => {
                                    const progressVal = calculateStudentProgress(student.id, progress, worlds);
                                    let statusColor = progressVal < 30 ? 'bg-red-500' : progressVal < 70 ? 'bg-yellow-500' : 'bg-green-500';
                                    let statusLabel = progressVal < 30 ? 'En Riesgo' : progressVal < 70 ? 'Práctica' : 'Buen Ritmo';
                                    return (
                                        <div key={student.id} onClick={() => { setShowGlobalStatsModal(false); setAiReport(null); setActiveStudentProfileId(student.id); }} className="flex items-center gap-3 p-2.5 bg-[#f0f5fb] rounded-lg border border-[#cbe0f6] cursor-pointer hover:shadow-sm hover:bg-white transition-all">
                                            <span className="text-xl">{student.avatar}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-sm text-[#1c3a60] truncate">{student.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                                                        <span className="text-xs font-black text-[#346297]">{Math.round(progressVal)}%</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-[#cbe0f6] rounded-full h-1.5 overflow-hidden">
                                                    <div className={`${statusColor} h-1.5 rounded-full`} style={{ width: `${progressVal}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Hint Modal */}
            {studentForHintId && (() => {
                const s = students.find(s => s.id === studentForHintId);
                const sContext = getStudentContext(s?.id || "");

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl">
                            <button
                                onClick={() => setStudentForHintId(null)}
                                disabled={isSendingHint || hintSentSuccess}
                                className="absolute top-4 right-4 p-2 bg-[#cbe0f6] hover:bg-[#cbe0f6] rounded-full transition-colors z-10 disabled:opacity-50"
                            >
                                <X className="w-5 h-5 text-[#346297]" />
                            </button>

                            <h3 className="text-xl font-bold text-[#1c3a60] mb-2 flex items-center gap-2">
                                <BrainCircuit className="text-[#1c3a60] w-5 h-5" /> Generador de Pistas IA
                            </h3>
                            <p className="text-[#73a4db] text-sm mb-6">Envía un mensaje de apoyo y una pista sutil a <strong>{s?.name}</strong>.</p>

                            {hintSentSuccess ? (
                                <div className="py-8 text-center animate-fade-in-up">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h4 className="font-bold text-[#1c3a60] text-lg">Pista Enviada</h4>
                                    <p className="text-[#73a4db] text-sm mt-1">El alumno verá esta alerta pedagógica en su portal.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <textarea
                                        value={hintText}
                                        onChange={(e) => setHintText(e.target.value)}
                                        rows={4}
                                        className="w-full p-4 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-sm text-[#346297] resize-none focus:ring-2 focus:ring-sky-400 focus:border-[#73a4db] outline-none transition"
                                        placeholder="Escribe aquí la pista personalizada para el alumno..."
                                    />
                                    <button
                                        onClick={handleSendHint}
                                        disabled={isSendingHint}
                                        className="w-full bg-[#1c3a60] hover:bg-[#1c3a60] disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-[#cbe0f6] transition-transform active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isSendingHint ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Generando y Enviando...
                                            </>
                                        ) : (
                                            "Enviar esta Pista"
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
            {/* Gem Award Modal */}
            {showAwardGemsModal && studentForGems && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 relative shadow-2xl animate-fade-in-up text-center">
                        <button
                            onClick={() => setShowAwardGemsModal(false)}
                            disabled={isAwardingGems}
                            className="absolute top-4 right-4 p-2 bg-[#cbe0f6] hover:bg-[#cbe0f6] rounded-full transition-colors z-10 disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-[#346297]" />
                        </button>

                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
                            💎
                        </div>
                        <h3 className="text-xl font-bold text-[#1c3a60] mb-1">Cofre de Gemas</h3>
                        <p className="text-[#73a4db] text-sm mb-6">
                            ¿Cuántas gemas deseas otorgarle a <strong className="text-emerald-700">{studentForGems.name}</strong>?
                        </p>

                        <div className="flex flex-col gap-4">
                            <input
                                type="number"
                                value={gemAmountToAward}
                                onChange={(e) => setGemAmountToAward(parseInt(e.target.value) || 0)}
                                className="w-full text-center text-3xl font-black bg-[#f0f5fb] border-2 border-[#cbe0f6] rounded-2xl py-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none text-[#346297] transition-all"
                                disabled={isAwardingGems}
                            />

                            <div className="flex justify-center gap-2 mb-2">
                                {[10, 50, 100, 500].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setGemAmountToAward(amt)}
                                        className="bg-[#cbe0f6] hover:bg-emerald-50 text-[#346297] hover:text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        +{amt}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleAwardGems}
                                disabled={isAwardingGems || gemAmountToAward === 0}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAwardingGems ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    "✨ Entregar Gemas"
                                )}
                            </button>
                            <p className="text-[10px] text-[#73a4db] mt-2">Puedes escribir números negativos para restar gemas por mal comportamiento.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD GRADE MODAL */}
            {showAddGradeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-[#cbe0f6] flex justify-between items-center bg-[#f0f5fb]">
                            <h3 className="font-bold text-xl text-[#1c3a60] flex items-center gap-2">
                                <Plus className="w-5 h-5" /> {editingGrade ? "Editar Grado / Nivel" : "Nuevo Grado / Nivel"}
                            </h3>
                            <button onClick={() => { setShowAddGradeModal(false); setEditingGrade(null); setNewGradeName(""); setNewGradeDescription(""); }} className="text-[#73a4db] hover:text-[#346297]">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#346297] mb-1">Nombre Corto del Grado</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 6to, 1, Primer Grado..."
                                    value={newGradeName}
                                    onChange={(e) => setNewGradeName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-[#cbe0f6] focus:ring-2 focus:ring-[#73a4db] outline-none"
                                />
                                <p className="text-xs text-[#73a4db] mt-2 mb-4">Los grados sirven para agrupar aulas.</p>

                                <label className="block text-sm font-bold text-[#346297] mb-1">Descripción / Identificador (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Primaria Regular, Sabatino, Generación B..."
                                    value={newGradeDescription}
                                    onChange={(e) => setNewGradeDescription(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-[#cbe0f6] focus:ring-2 focus:ring-[#73a4db] outline-none"
                                />
                            </div>
                            <button
                                onClick={handleCreateGrade}
                                disabled={savingStudent || !newGradeName.trim()}
                                className="w-full bg-[#1c3a60] hover:bg-[#1c3a60] text-white py-3 rounded-xl font-bold shadow-lg shadow-[#cbe0f6] transition-all disabled:opacity-50"
                            >
                                {savingStudent ? "Guardando..." : (editingGrade ? "Guardar Cambios" : "Crear Grado")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CLASSROOM CONFIRMATION MODAL */}
            {classroomToDelete && (() => {
                const cls = classrooms.find(c => c.id === classroomToDelete);
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-rose-100 bg-rose-50 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-rose-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-rose-900">Eliminar Salón</h3>
                                    <p className="text-sm text-rose-600">Esta acción no se puede deshacer</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-[#346297] text-sm mb-1">¿Estás seguro de que quieres eliminar el salón</p>
                                <p className="font-black text-[#1c3a60] text-base mb-3">
                                    {cls?.emoji} {cls?.name}
                                </p>
                                <p className="text-xs text-[#73a4db] bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                    ⚠️ Los alumnos del salón <strong>no serán eliminados</strong>, solo quedarán sin salón asignado.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setClassroomToDelete(null)}
                                    disabled={savingStudent}
                                    className="flex-1 px-4 py-3 rounded-xl border border-[#cbe0f6] text-[#346297] font-bold hover:bg-[#f0f5fb] transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteClassroom}
                                    disabled={savingStudent}
                                    className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {savingStudent ? 'Eliminando...' : (
                                        <><Trash2 className="w-4 h-4" /> Sí, eliminar</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ADD CLASSROOM MODAL */}
            {showAddClassroomModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-[#cbe0f6] flex justify-between items-center bg-[#f0f5fb]">
                            <h3 className="font-bold text-xl text-[#1c3a60] flex items-center gap-2">
                                <Plus className="w-5 h-5" /> {editingClassroom ? "Editar Salón" : "Nuevo Salón"}
                            </h3>
                            <button onClick={() => { setShowAddClassroomModal(false); setEditingClassroom(null); setNewClassName(""); setNewClassDescription(""); setNewClassEmoji("📚"); setSelectedGradeIdInModal(""); }} className="text-[#73a4db] hover:text-[#346297]">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#346297] mb-1">Nombre del Salón / Clase</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1º Primaria, 3º A, Salón de Computo..."
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-[#cbe0f6] focus:ring-2 focus:ring-[#73a4db] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#346297] mb-1">Descripción / Detalles (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Ciclo 2024, Turno Matutino..."
                                    value={newClassDescription}
                                    onChange={(e) => setNewClassDescription(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-[#cbe0f6] focus:ring-2 focus:ring-[#73a4db] outline-none"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-bold text-[#346297]">Nivel / Grado</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-[#73a4db] uppercase tracking-widest">(Opcional)</span>
                                        <button 
                                            onClick={() => setShowAddGradeModal(true)} 
                                            className="p-1 bg-[#cbe0f6] text-[#1c3a60] rounded-lg hover:bg-[#cbe0f6] transition-colors"
                                            title="Crear Nuevo Nivel"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <select
                                    value={selectedGradeIdInModal}
                                    onChange={(e) => setSelectedGradeIdInModal(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-[#cbe0f6] outline-none focus:ring-2 focus:ring-[#73a4db] bg-white text-xs"
                                >
                                    <option value="">Independiente (Sin Grado)</option>
                                    {grades.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#346297] mb-2">Emoji Identificador</label>
                                <div className="flex flex-wrap gap-2">
                                    {["📚", "🧪", "🎨", "🧩", "🤖", "🌟", "📐", "🧠", "🎯", "☄️"].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setNewClassEmoji(emoji)}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${newClassEmoji === emoji ? "bg-[#1c3a60] text-white scale-110 shadow-md" : "bg-[#f0f5fb] hover:bg-[#cbe0f6]"
                                                }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleCreateClassroom}
                                disabled={savingStudent || !newClassName.trim()}
                                className="w-full bg-[#1c3a60] hover:bg-[#1c3a60] text-white py-3 rounded-xl font-bold shadow-lg shadow-[#cbe0f6] transition-all disabled:opacity-50"
                            >
                                    {savingStudent ? "Creando..." : "Crear Salón"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Visual World Builder Modal (View/Edit Map + Download Teacher Guide PDF) */}
            {/* ════════════ JEFE DE INCURSIÓN (Raid Boss) ════════════ */}
            {activeTab === 'raid' && (
                <div className="animate-fade-in space-y-6 pb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* PANEL DE MONITOREO - Battle Status Soft Atmosphere */}
                        <div className="flex flex-col h-full">
                            <div className="bg-white/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/60 shadow-sm relative overflow-hidden flex-1 group">
                                {/* Decorative Glow Background - Pastel */}
                                <div className="absolute top-0 right-0 w-80 h-80 bg-rose-100/40 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-rose-200/50 transition-colors duration-1000" />
                                
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 shadow-sm">
                                            <Swords className="w-6 h-6 text-rose-500" />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[#73a4db] text-[10px] font-black uppercase tracking-widest">Estado del Salón</span>
                                            <p className="text-emerald-500 text-xs font-black flex items-center justify-end gap-1.5">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> MISIÓN ACTIVA
                                            </p>
                                        </div>
                                    </div>

                                    {currentRaidBoss ? (
                                        <div className="flex flex-col items-center justify-center flex-1 space-y-8 animate-in fade-in zoom-in duration-700">
                                            {/* Boss Avatar Visual - Light Style */}
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-rose-200/30 rounded-full blur-[40px] animate-pulse"></div>
                                                <div className="w-36 h-36 bg-white rounded-full flex items-center justify-center text-7xl shadow-xl border-4 border-rose-50 relative z-10 group-hover:scale-110 transition-transform duration-700">
                                                    {currentRaidBoss.imageUrl}
                                                </div>
                                                <div className={`absolute -inset-2 rounded-full border-2 animate-ping opacity-20 ${ (currentRaidBoss.currentHealth / currentRaidBoss.maxHealth) < 0.3 ? 'border-rose-400' : 'border-[#73a4db]' }`} />
                                            </div>

                                            <div className="text-center w-full max-w-sm">
                                                <h3 className="text-2xl font-black text-[#1c3a60] tracking-tight mb-2 drop-shadow-sm">{currentRaidBoss.name}</h3>
                                                <p className="text-[10px] text-[#73a4db] font-bold uppercase tracking-widest mb-4">Jefe de la Incursión Semanal</p>
                                                
                                                {/* Premium Soft Health Bar */}
                                                <div className="relative h-5 bg-[#cbe0f6] rounded-full overflow-hidden border border-slate-50 mb-3 shadow-inner p-1">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                                                            (currentRaidBoss.currentHealth / currentRaidBoss.maxHealth) < 0.3 ? 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-rose-100' : 
                                                            (currentRaidBoss.currentHealth / currentRaidBoss.maxHealth) < 0.6 ? 'bg-gradient-to-r from-amber-500 to-amber-300 shadow-amber-100' : 
                                                            'bg-gradient-to-r from-[#346297] to-[#73a4db] shadow-[#cbe0f6]'
                                                        }`}
                                                        style={{ width: `${Math.max(0, (currentRaidBoss.currentHealth / currentRaidBoss.maxHealth) * 100)}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full animate-[shimmer_2s_infinite]" />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[#73a4db] text-[10px] font-black uppercase tracking-tighter italic">Salud del Objetivo</span>
                                                    <span className="text-[#1c3a60] font-black text-sm tracking-widest tabular-nums font-mono">
                                                        {currentRaidBoss.currentHealth.toLocaleString()} <span className="text-[#73a4db] text-[10px]">/ {currentRaidBoss.maxHealth.toLocaleString()} HP</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 w-full">
                                                <div className="bg-white/50 p-4 rounded-[2rem] border border-[#cbe0f6] shadow-sm flex flex-col items-center group/card transition-all hover:bg-white/80">
                                                    <span className="text-[#73a4db] text-[9px] font-black uppercase mb-1">Daño Total</span>
                                                    <span className="text-rose-500 font-black text-2xl drop-shadow-sm">
                                                        {(currentRaidBoss.maxHealth - currentRaidBoss.currentHealth).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="bg-white/50 p-4 rounded-[2rem] border border-[#cbe0f6] shadow-sm flex flex-col items-center group/card transition-all hover:bg-white/80">
                                                    <span className="text-[#73a4db] text-[9px] font-black uppercase mb-1">Progreso IA</span>
                                                    <span className="text-[#1c3a60] font-black text-2xl drop-shadow-sm">
                                                        {Math.round((1 - (currentRaidBoss.currentHealth / currentRaidBoss.maxHealth)) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={handleResetBoss}
                                                disabled={isResettingBoss}
                                                className="mt-4 px-8 py-3 bg-[#1c3a60] hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95"
                                            >
                                                {isResettingBoss ? "Reiniciando Sistema..." : "🔄 Resetear Ciclo de Jefe"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
                                            <div className="w-20 h-20 bg-[#f0f5fb] rounded-full flex items-center justify-center mb-6 shadow-inner">
                                                <Activity className="w-8 h-8 text-[#73a4db]" />
                                            </div>
                                            <p className="text-[#73a4db] font-black uppercase tracking-widest text-sm">Laboratorio Inactivo</p>
                                            <p className="text-[#73a4db] text-xs mt-2 font-medium">Configura una nueva meta grupal para desbloquear la incursión.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PANEL TÁCTICO - Operations Hub */}
                        <div className="flex flex-col h-full">
                            <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/60 shadow-sm flex-1 flex flex-col">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="bg-[#cbe0f6] p-3 rounded-2xl text-[#1c3a60]">
                                        <Target className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[#1c3a60] tracking-tight">Centro de Operaciones</h2>
                                        <p className="text-[#73a4db] text-xs font-medium">Configuración de Desafíos Escolares</p>
                                    </div>
                                </div>

                                <div className="space-y-8 flex-1">
                                    {/* Boss Selector Gallery */}
                                    <div>
                                        <label className="text-[10px] font-black text-[#73a4db] uppercase tracking-widest block mb-4">Selección de Identidad</label>
                                        <div className="grid grid-cols-6 gap-3">
                                            {MONSTER_EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => { setRaidBossEmoji(emoji); setRaidBossName(MONSTER_NAMES[emoji] || emoji); }}
                                                    className={`w-full aspect-square rounded-2xl text-xl flex items-center justify-center border transition-all hover:bg-[#f0f5fb] ${raidBossEmoji === emoji ? 'border-[#346297] bg-[#f0f5fb] shadow-lg shadow-[#cbe0f6] scale-110' : 'border-[#cbe0f6] bg-white shadow-sm'}`}
                                                    title={MONSTER_NAMES[emoji]}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-[#73a4db] uppercase tracking-widest block mb-2">Nombre del Objetivo</label>
                                            <input
                                                type="text"
                                                value={raidBossName}
                                                onChange={(e) => setRaidBossName(e.target.value)}
                                                className="w-full px-5 py-3.5 bg-[#f0f5fb] border border-[#cbe0f6] rounded-2xl focus:ring-4 focus:ring-[#f0f5fb] focus:border-[#346297] outline-none transition-all text-sm font-bold text-[#1c3a60]"
                                                placeholder="Ej: El Guardián del Conocimiento"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-[#73a4db] uppercase tracking-widest block mb-3">Nivel de Salud (HP)</label>
                                            <div className="grid grid-cols-4 gap-2 mb-4">
                                                {HP_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.value}
                                                        onClick={() => setRaidBossHP(preset.value)}
                                                        className={`py-2.5 rounded-xl text-[10px] font-black border uppercase tracking-tighter transition-all ${raidBossHP === preset.value ? 'bg-[#1c3a60] text-white border-[#1c3a60] shadow-lg' : 'bg-white text-[#73a4db] border-[#cbe0f6] hover:border-[#cbe0f6]'}`}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="range"
                                                value={raidBossHP}
                                                onChange={(e) => setRaidBossHP(Number(e.target.value))}
                                                min={100}
                                                max={15000}
                                                step={100}
                                                className="w-full h-2 bg-[#cbe0f6] rounded-lg appearance-none cursor-pointer accent-[#1c3a60]"
                                            />
                                            <div className="flex justify-between mt-2">
                                                <span className="text-[10px] font-bold text-[#73a4db]">100 HP</span>
                                                <span className="text-sm font-black text-[#1c3a60]">{raidBossHP.toLocaleString()} HP</span>
                                                <span className="text-[10px] font-bold text-[#73a4db]">15,000 HP</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateBoss}
                                    disabled={isCreatingBoss || !raidBossName.trim()}
                                    className="w-full mt-8 bg-[#1c3a60] hover:bg-[#1c3a60] text-white font-black py-4 rounded-3xl shadow-xl shadow-[#cbe0f6] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                >
                                    {isCreatingBoss ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <Target className="w-5 h-5" />}
                                    {currentRaidBoss ? "Redesplegar Objetivo" : "Activar Incursión"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showBuilderModal && (
                <div className="fixed inset-0 z-50 bg-[#cbe0f6] flex flex-col w-full h-full">
                    <VisualWorldBuilder
                        onClose={() => { setShowBuilderModal(false); setBuilderWorld(null); setBuilderInitialAIPrompt(false); }}
                        initialWorld={builderWorld || undefined}
                        initialShowAIPrompt={builderInitialAIPrompt}
                    />
                </div>
            )}

            {/* Message Compose Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-6 text-white relative">
                            <button onClick={() => setShowMessageModal(false)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                                <X className="w-5 h-5 text-white" />
                            </button>
                            <h2 className="text-2xl font-black flex items-center gap-2">
                                <MessageSquare className="w-6 h-6" /> Enviar Mensaje
                            </h2>
                            <p className="text-violet-100 text-sm mt-1">Envía un aviso a tus alumnos</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {messageSent ? (
                                <div className="text-center py-8">
                                    <div className="text-5xl mb-4">✅</div>
                                    <h3 className="text-xl font-black text-green-600">¡Mensaje enviado!</h3>
                                </div>
                            ) : (
                                <>
                                    {/* Recipients selector */}
                                    <div>
                                        <label className="block text-sm font-bold text-[#346297] mb-2">Destinatarios</label>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => { setIsMessageGlobal(true); setMessageRecipients([]); }}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${isMessageGlobal ? 'bg-violet-600 text-white shadow' : 'bg-[#cbe0f6] text-[#346297] hover:bg-[#cbe0f6]'}`}
                                            >
                                                📢 Todos los alumnos
                                            </button>
                                            <button
                                                onClick={() => setIsMessageGlobal(false)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${!isMessageGlobal ? 'bg-violet-600 text-white shadow' : 'bg-[#cbe0f6] text-[#346297] hover:bg-[#cbe0f6]'}`}
                                            >
                                                👤 Seleccionar alumnos
                                            </button>
                                        </div>

                                        {!isMessageGlobal && (
                                            <div className="max-h-40 overflow-y-auto bg-[#f0f5fb] rounded-xl border border-[#cbe0f6] p-2 space-y-1">
                                                {students.map(s => (
                                                    <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white cursor-pointer transition">
                                                        <input
                                                            type="checkbox"
                                                            checked={messageRecipients.includes(s.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setMessageRecipients([...messageRecipients, s.id]);
                                                                } else {
                                                                    setMessageRecipients(messageRecipients.filter(id => id !== s.id));
                                                                }
                                                            }}
                                                            className="rounded border-[#cbe0f6] text-violet-600 focus:ring-violet-500"
                                                        />
                                                        <span className="text-sm font-medium text-[#346297]">{s.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Message text */}
                                    <div>
                                        <label className="block text-sm font-bold text-[#346297] mb-2">Mensaje</label>
                                        <textarea
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Escribe tu mensaje aquí..."
                                            rows={4}
                                            className="w-full border border-[#cbe0f6] rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all font-medium resize-none"
                                        />
                                    </div>

                                    {/* Send button */}
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isSendingMessage || !messageText.trim() || (!isMessageGlobal && messageRecipients.length === 0)}
                                        className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSendingMessage ? (
                                            <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Enviando...</>
                                        ) : (
                                            <><Send className="w-4 h-4" /> Enviar Mensaje</>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white relative">
                            <button onClick={() => setShowResetModal(false)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                                <X className="w-5 h-5 text-white" />
                            </button>
                            <h2 className="text-2xl font-black flex items-center gap-2">
                                <RotateCcw className="w-6 h-6" /> Reiniciar Progreso
                            </h2>
                            <p className="text-red-100 text-sm mt-1">Reinicia el avance, XP, gemas y evidencias de los alumnos</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {resetDone ? (
                                <div className="text-center py-8">
                                    <div className="text-5xl mb-4">✅</div>
                                    <h3 className="text-xl font-black text-green-600">¡Progreso reiniciado!</h3>
                                    <p className="text-[#73a4db] text-sm mt-1">La página se recargará en un momento...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> ¡Atención! Esta acción elimina todo el progreso, XP, gemas y evidencias. No se puede deshacer.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[#346297] mb-2">¿Quiénes?</label>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => { setIsResetAll(true); setResetStudentIds([]); }}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${isResetAll ? 'bg-red-600 text-white shadow' : 'bg-[#cbe0f6] text-[#346297] hover:bg-[#cbe0f6]'}`}
                                            >
                                                👥 Todos los alumnos
                                            </button>
                                            <button
                                                onClick={() => setIsResetAll(false)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${!isResetAll ? 'bg-red-600 text-white shadow' : 'bg-[#cbe0f6] text-[#346297] hover:bg-[#cbe0f6]'}`}
                                            >
                                                👤 Seleccionar alumnos
                                            </button>
                                        </div>

                                        {!isResetAll && (
                                            <div className="max-h-40 overflow-y-auto bg-[#f0f5fb] rounded-xl border border-[#cbe0f6] p-2 space-y-1">
                                                {students.map(s => (
                                                    <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white cursor-pointer transition">
                                                        <input
                                                            type="checkbox"
                                                            checked={resetStudentIds.includes(s.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setResetStudentIds([...resetStudentIds, s.id]);
                                                                } else {
                                                                    setResetStudentIds(resetStudentIds.filter(id => id !== s.id));
                                                                }
                                                            }}
                                                            className="rounded border-[#cbe0f6] text-red-600 focus:ring-red-500"
                                                        />
                                                        <span className="text-sm font-medium text-[#346297]">{s.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleResetProgress}
                                        disabled={isResettingProgress || (!isResetAll && resetStudentIds.length === 0)}
                                        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isResettingProgress ? (
                                            <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Reiniciando...</>
                                        ) : (
                                            <><RotateCcw className="w-4 h-4" /> Reiniciar Progreso</>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MESSAGES TAB ═══ */}
            {activeTab === 'messages' && (
                <StudentMessagesPanel 
                    students={students} 
                    progress={progress} 
                    worlds={worlds} 
                    onSendHint={handleSendDirectMessage}
                />
            )}

            </main>
        </div>
    );
}

function StudentMessagesPanel({ students, progress, worlds, onSendHint }: { students: Student[], progress: any, worlds: LearningWorld[], onSendHint: (studentId: string, text: string) => void }) {
    const [allMessages, setAllMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students.length > 0 ? students[0].id : null);
    const [replyText, setReplyText] = useState("");

    const fetchMessages = async () => {
        if (!selectedStudentId) return;
        setLoading(true);
        try {
            // Fetch both Student Activity (Buffs) and Teacher Direct Messages (Hints)
            const [buffsRes, hintsRes] = await Promise.all([
                fetch('/api/gamification/buffs/history'),
                selectedStudentId === 'all' 
                    ? fetch('/api/messages') 
                    : selectedStudentId === 'social'
                        ? Promise.resolve({ json: () => Promise.resolve([]) }) as any // No hints in social mode
                        : fetch(`/api/hints?studentId=${selectedStudentId}`)
            ]);

            const buffsData = await buffsRes.json();
            const hintsData = selectedStudentId === 'social' ? [] : await hintsRes.json();

            let integrated: any[] = [];

            // Add buffs
            if (Array.isArray(buffsData)) {
                if (selectedStudentId === 'social') {
                    // Show ALL buffs for the school
                    integrated = buffsData.map(m => ({
                        ...m,
                        type: 'buff',
                        fromName: m.fromName,
                        targetName: m.targetName,
                        isFromTeacher: false
                    }));
                } else if (selectedStudent) {
                    // Show buffs for specific student
                    integrated = buffsData
                        .filter(m => m.targetId === selectedStudentId || m.fromName === selectedStudent.name)
                        .map(m => ({
                            ...m,
                            type: 'buff',
                            fromName: m.fromName,
                            isFromTeacher: false
                        }));
                }
            }

            // Add teacher hints
            if (Array.isArray(hintsData)) {
                integrated = [
                    ...integrated,
                    ...hintsData.map(m => ({
                        ...m,
                        type: 'hint',
                        fromName: 'Tú (Docente)',
                        isFromTeacher: true,
                        // Existing hints use 'message' or 'text'
                        message: m.message || m.text || ''
                    }))
                ];
            }

            // Sort by date
            integrated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            setAllMessages(integrated);
        } catch (e) {
            console.error("Error fetching messages:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 30000); // More frequent updates
        return () => clearInterval(interval);
    }, [selectedStudentId]);

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    const handleQuickReply = (template: string) => {
        if (!selectedStudentId) return;
        onSendHint(selectedStudentId, template);
        // Optimistically add the message to the list or just re-fetch
        setTimeout(fetchMessages, 500);
        setReplyText("");
    };

    return (
        <div className="flex bg-white/40 backdrop-blur-3xl border border-white/60 shadow-sm overflow-hidden h-[85vh] animate-in fade-in slide-in-from-bottom-8 duration-700 mx-6 mb-6 rounded-3xl">
            
            {/* SIDEBAR - Contact List Tactical Style */}
            <div className="w-80 border-r border-white/40 flex flex-col bg-white/20">
                <div className="p-8 border-b border-white/40 bg-white/40 shadow-sm relative z-10">
                    <h3 className="text-[10px] font-black text-[#1c3a60] uppercase tracking-[0.2em] flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Terminal de Enlace
                    </h3>
                    <p className="text-[#1c3a60] font-black mt-1 uppercase tracking-tighter text-sm">Directorio Táctico</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {/* Tactical Selectors: Global & Social */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                            onClick={() => setSelectedStudentId('all')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300 group border-2 ${selectedStudentId === 'all' ? 'bg-[#1c3a60] text-white shadow-xl shadow-[#cbe0f6] border-transparent' : 'bg-white/60 text-[#73a4db] hover:text-[#1c3a60] hover:bg-white border-white/60 shadow-sm'}`}
                        >
                            <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/60 group-hover:scale-110 transition-transform">
                                🌍
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-center">Global</span>
                        </button>

                        <button
                            onClick={() => setSelectedStudentId('social')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300 group border-2 ${selectedStudentId === 'social' ? 'bg-[#1c3a60] text-white shadow-xl shadow-cyan-200 border-transparent' : 'bg-white/60 text-[#73a4db] hover:text-cyan-600 hover:bg-white border-white/60 shadow-sm'}`}
                        >
                            <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/60 group-hover:scale-110 transition-transform">
                                🛰️
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-center">Muro Social</span>
                        </button>
                    </div>

                    <div className="h-px bg-white/20 my-2" />

                    {students.map(student => {
                        const prog = calculateStudentProgress(student.id, progress, worlds);
                        const isSelected = selectedStudentId === student.id;
                        const isOnline = student.lastSeen ? (new Date().getTime() - new Date(student.lastSeen).getTime() < 120000) : false;
                        return (
                            <button
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${isSelected ? 'bg-[#1c3a60] text-white shadow-xl shadow-[#cbe0f6]' : 'hover:bg-white/60 text-[#73a4db] hover:text-[#1c3a60] border border-transparent'}`}
                            >
                                <div className="relative shrink-0">
                                    <span className={`text-2xl transition-all ${isOnline ? '' : 'opacity-60 grayscale'}`}>{student.avatar}</span>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${isSelected ? 'border-[#1c3a60]' : 'border-white'} ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-400'}`} />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className={`text-xs font-black truncate transition-colors ${isSelected ? 'text-white' : isOnline ? 'text-[#1c3a60]' : 'text-[#73a4db]'}`}>{student.name}</p>
                                    <div className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isSelected ? 'text-indigo-100' : isOnline ? 'text-emerald-600' : 'text-[#73a4db]'}`}>
                                        {isOnline ? 'En Línea' : 'Desconectado'} • Progreso: <span className={isSelected ? 'text-white' : 'text-[#1c3a60]'}>{prog}%</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col bg-transparent relative">
                {selectedStudentId === 'social' || selectedStudentId === 'all' || selectedStudent ? (
                    <>
                        {/* Chat Header Tactical */}
                        <div className={`p-6 border-b border-white/40 flex items-center justify-between bg-white/40 backdrop-blur-md ${selectedStudentId === 'social' ? 'bg-[#f0f5fb]/40' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/60">
                                    {selectedStudentId === 'all' ? '🌍' : selectedStudentId === 'social' ? '🛰️' : selectedStudent?.avatar}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-[#1c3a60] tracking-tight uppercase">
                                        {selectedStudentId === 'all' ? 'Comunicación Global (Salón)' : selectedStudentId === 'social' ? 'Muro de Interacción Social' : selectedStudent?.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${selectedStudentId === 'all' ? 'bg-[#346297] shadow-[0_0_8px_rgba(99,102,241,0.3)]' : selectedStudentId === 'social' ? 'bg-[#346297] shadow-[0_0_8px_rgba(6,182,212,0.3)]' : calculateStudentProgress(selectedStudent?.id || "", progress, worlds) < 30 ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'}`} />
                                        <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-widest">
                                            {selectedStudentId === 'all' ? 'Mensaje Maestro para Todos' : selectedStudentId === 'social' ? 'Bitácora de Interacciones Peer-to-Peer' : 'Canal de Retroalimentación IA'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={fetchMessages} className="p-2.5 text-[#73a4db] hover:text-[#1c3a60] hover:bg-white rounded-xl transition-all border border-[#cbe0f6]">
                                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Messages Thread - Tactical Bubbles */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                            {allMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                    <MessageSquare className="w-16 h-16 text-[#73a4db] mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin registros tácticos</p>
                                </div>
                            ) : (
                                allMessages.map((msg, idx) => {
                                    const isFromTeacher = msg.isFromTeacher;
                                    return (
                                        <div key={idx} className={`flex flex-col ${isFromTeacher ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                            <div className={`max-w-[85%] p-4 rounded-2xl border transition-all ${isFromTeacher 
                                                ? 'bg-[#1c3a60] border-[#346297] text-white rounded-tr-none' 
                                                : msg.type === 'buff' && selectedStudentId === 'social'
                                                    ? 'bg-[#f0f5fb] border-cyan-200 text-cyan-900 rounded-tl-none shadow-sm'
                                                    : 'bg-white border-[#cbe0f6] text-[#1c3a60] rounded-tl-none shadow-sm'
                                            }`}>
                                                <p className="text-[11px] font-medium leading-relaxed">
                                                    {msg.type === 'buff' && <span className="mr-2">✨</span>}
                                                    {msg.message}
                                                </p>
                                            </div>
                                            <span className="text-[8px] font-black text-[#346297] mt-2 uppercase tracking-widest">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {isFromTeacher ? 'Docente' : (msg.targetName && selectedStudentId === 'social' ? `${msg.fromName} para ${msg.targetName}` : msg.fromName)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Composer & Quick Actions */}
                        <div className="p-6 bg-white/40 border-t border-white/40">
                            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                <button onClick={() => handleQuickReply("¡Felicidades por tu excelente avance hoy! Sigue así. ✨")} className="shrink-0 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black hover:bg-emerald-100 transition border border-emerald-100 uppercase tracking-widest">
                                    Felicitar
                                </button>
                                <button onClick={() => handleQuickReply("He notado que te falta poco para terminar este nivel. ¡Tú puedes! 🚀")} className="shrink-0 px-3 py-1.5 bg-[#f0f5fb] text-[#1c3a60] rounded-xl text-[9px] font-black hover:bg-[#cbe0f6] transition border border-[#cbe0f6] uppercase tracking-widest">
                                    Motivar
                                </button>
                                <button onClick={() => handleQuickReply("Recuerda completar las actividades pendientes. ¿Necesitas ayuda? 💡")} className="shrink-0 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black hover:bg-amber-100 transition border border-amber-100 uppercase tracking-widest">
                                    Recordatorio
                                </button>
                            </div>
                            
                            <div className="flex items-end gap-3 bg-white p-2 rounded-2xl border border-[#cbe0f6] focus-within:border-[#73a4db] transition-all shadow-inner">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={selectedStudentId === 'all' ? "Terminal de envío global para todo el salón..." : `Terminal de envío a ${selectedStudent?.name.split(' ')[0] || "Seleccionado"}...`}
                                    className="flex-1 bg-transparent border-none outline-none text-xs font-medium py-3 px-4 resize-none h-12 max-h-32 text-[#346297] placeholder:text-[#73a4db]"
                                />
                                <button
                                    onClick={() => { if(replyText.trim() && selectedStudentId) { onSendHint(selectedStudentId, replyText); setReplyText(""); } }}
                                    className="bg-[#1c3a60] hover:bg-[#1c3a60] text-white p-3 rounded-xl shadow-lg shadow-[#1c3a60]/20 transition-all active:scale-90 border border-[#73a4db]/20"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-10">
                        <MessageSquare className="w-20 h-20 text-white mb-4" />
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Enlace No Establecido</h3>
                    </div>
                )}
            </div>
        </div>
    );
}


