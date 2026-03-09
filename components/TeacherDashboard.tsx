"use client";
/* eslint-disable react/no-unescaped-entities */import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useLearning, LearningWorld, Student, Grade, Classroom } from "@/contexts/LearningContext";
import UploadEngine from "./UploadEngine";
import VisualWorldBuilder from "./VisualWorldBuilder";
import BulkEvidenceUploader from "./BulkEvidenceUploader";
import { Users, BrainCircuit, BookOpen, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, X, Library, Plus, UploadCloud, Map, FileText, Pencil, Trash2, UserPlus, LogOut, Swords, Send, MessageSquare, RotateCcw } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Tab = "students" | "insights" | "library" | "reports" | "raid";

export default function TeacherDashboard() {
    useSessionGuard();
    const {
        students, worlds, activeWorldId, setActiveWorld, deleteWorld,
        addStudent, updateStudent, deleteStudent, progress, toggleWorldAssignment,
        classrooms, addClassroom, updateClassroom, deleteClassroom, assignStudentToClassroom,
        grades, addGrade, updateGrade, deleteGrade
    } = useLearning();
    const [activeTab, setActiveTab] = useState<Tab>("students");
    const [selectedInsightWorldId, setSelectedInsightWorldId] = useState<string>("");
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
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showBuilderModal, setShowBuilderModal] = useState(false);
    const [builderWorld, setBuilderWorld] = useState<LearningWorld | null>(null);

    const [showAiReviewModal, setShowAiReviewModal] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiDiagnosis, setAiDiagnosis] = useState<{ diagnosis?: string, suggestedMissionTopic?: string, recommendations?: { title: string, description: string }[] } | null>(null);
    const [strugglingStudentContext, setStrugglingStudentContext] = useState<{ student: { id: string, name: string }, world: { id: string, title?: string, theme: string }, level?: { title?: string, dayNumber?: number } | any } | null>(null);


    const [worldToDelete, setWorldToDelete] = useState<LearningWorld | null>(null);

    // AI Analysis Selected Student & Interventions
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [activeStudentProfileId, setActiveStudentProfileId] = useState<string | null>(null);
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
        "🐉": "Dragón del Caos", "🦑": "Kraken Abismal", "🐲": "Serpiente de Fuego",
        "👹": "Ogro Feroz", "👺": "Demonio Rojo", "🧛": "Vampiro Oscuro",
        "🧟": "Zombie Legendario", "🦖": "Rex Destroyer", "🐙": "Pulpo Titán",
        "🕷️": "Araña Venenosa", "🦂": "Escorpión Mortal", "🐍": "Cobra Real",
        "💀": "Esqueleto Maldito", "👾": "Alien Invasor", "🤖": "Robot Supremo",
        "🔥": "Llama Eterna", "🦇": "Murciélago Nocturno", "👻": "Fantasma Siniestro"
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

    const handleDeleteClassroom = async (classroomId: string) => {
        if (confirm("¿Estás seguro de que deseas borrar este grupo? Los alumnos vinculados quedarán sin grupo.")) {
            await deleteClassroom(classroomId);
            if (selectedClassroomId === classroomId) setSelectedClassroomId("all");
        }
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
        if (confirm("¿Borrar permanentemente este grado? (Sus grupos vinculados seguirán existiendo como independientes)")) {
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
        loadingAlert.innerHTML = '<div class="bg-white p-8 rounded-3xl shadow-2xl text-center"><div class="animate-spin w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full mx-auto mb-4"></div><p class="text-slate-800 font-bold text-lg">Generando misión personalizada...</p><p class="text-slate-500 text-sm mt-1">Creando actividades de repaso para ' + studentCtx.student.name + '</p></div>';
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

    // Calculate dynamic class metrics
    const calculateClassMetrics = () => {
        if (students.length === 0 || worlds.length === 0) return { completion: 0, average: 0 };

        let totalProgress = 0;
        students.forEach(student => {
            totalProgress += calculateStudentProgress(student.id, progress, worlds);
        });

        const classCompletion = Math.round(totalProgress / students.length);
        // Map progress (0-100) to a grade (0-10) for the 'Promedio'
        const classAverage = (classCompletion / 10).toFixed(1);

        return { completion: classCompletion, average: classAverage };
    };

    const metrics = calculateClassMetrics();

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
        students.forEach((student, index) => {
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

    const handleSendHint = async () => {
        if (!hintText.trim()) {
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

    const atRiskStudents = insightWorld
        ? students.filter(s => calculateStudentProgressForWorld(s.id, progress, insightWorld) < 30)
        : atRiskStudentsGlobal;
    const strugglingStudents = insightWorld
        ? students.filter(s => {
            const p = calculateStudentProgressForWorld(s.id, progress, insightWorld);
            return p >= 30 && p < 70;
        })
        : strugglingStudentsGlobal;

    // Metrics already calculated above handler

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {isSuspended && (
                <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white text-center py-3 font-bold shadow-lg flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    CUENTA SUSPENDIDA. NO PUEDE CREAR MAPAS NI ALUMNOS HASTA QUE SE REGULARICE SU SUSCRIPCIÓN.
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-sky-100 hidden md:flex flex-col">
                <div className="p-6 border-b border-sky-50">
                    <h1 className="text-xl font-bold text-sky-800 flex items-center gap-2">
                        <BookOpen className="text-sky-600" />
                        Aula Virtual
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab("students")}
                        className={`w-full text-left px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'students' ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500 hover:bg-sky-50/50 hover:text-sky-600'}`}
                    >
                        <Users className="w-4 h-4" /> Estudiantes
                    </button>
                    <button
                        onClick={() => setActiveTab("library")}
                        className={`w-full text-left px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'library' ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500 hover:bg-sky-50/50 hover:text-sky-600'}`}
                    >
                        <Library className="w-4 h-4" /> Mi Biblioteca
                    </button>
                    <button
                        onClick={() => setActiveTab("insights")}
                        className={`w-full text-left px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'insights' ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500 hover:bg-sky-50/50 hover:text-sky-600'}`}
                    >
                        <BrainCircuit className="w-4 h-4" /> Análisis Inteligente
                    </button>

                    <button
                        onClick={() => setActiveTab("raid")}
                        className={`w-full text-left px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'raid' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-slate-500 hover:bg-red-50/50 hover:text-red-600'}`}
                    >
                        <Swords className="w-4 h-4" /> Jefe de Incursión
                    </button>
                </nav>
                <div className="p-4 border-t border-sky-50">
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full text-left flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600 p-2 rounded-lg transition-colors hover:bg-sky-50"
                    >
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">

                {activeTab === 'insights' && (
                    <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-sky-900">
                                Panel de Análisis
                            </h2>
                            <p className="text-sky-600/70 text-sm sm:text-base">Progreso y alertas filtrados por mapa • Rendimiento global</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Map Selector for per-map filtering */}
                            <select
                                value={effectiveInsightWorldId}
                                onChange={e => setSelectedInsightWorldId(e.target.value)}
                                className="bg-white/80 border border-sky-200 rounded-xl px-3 py-2 text-sm font-medium text-sky-700 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                            >
                                {worlds.map(w => (
                                    <option key={w.id} value={w.id}>
                                        🗺️ {w.title || w.theme}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </header>
                )}



                {/* LIBRARY TAB */}
                {activeTab === 'library' && (
                    <div className="space-y-6">
                        {/* Library Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="bg-white/80 border border-sky-200 hover:bg-sky-50 text-sky-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
                            >
                                <UploadCloud className="w-4 h-4" />
                                Subir Evidencias
                            </button>

                            <button
                                onClick={() => {
                                    if (isSuspended) return alert("Tu cuenta está suspendida. Contacta a un administrador.");
                                    if (mapsLimitReached) return alert(`Has alcanzado el límite de ${schoolInfo.maxMaps} mapa(s) en tu plan actual. Borra un mapa para crear otro.`);
                                    setShowUploadModal(true);
                                }}
                                className={`${isSuspended || mapsLimitReached ? 'bg-slate-400' : 'bg-sky-600 hover:bg-sky-700'} text-white px-5 py-2 rounded-xl font-bold shadow-lg shadow-sky-200 transition-all flex items-center gap-2`}
                            >
                                <Plus className="w-4 h-4" />
                                Generar con IA (PDF)
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {worlds.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-slate-400">
                                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>No has creado ninguna aventura aún.</p>
                                </div>
                            ) : (
                                worlds.map(w => (
                                    <div key={w.id} className={`bg-white p-6 rounded-2xl border-2 transition-all relative border-emerald-200 hover:border-emerald-400`}>
                                        <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">
                                            ✓ Activa
                                        </span>
                                        <h3 className="font-bold text-lg text-slate-800 mb-2 break-words line-clamp-3">{w.title || "Aventura Sin Título"}</h3>
                                        <div className="text-sm text-slate-500 mb-4">
                                            <p>Tema: {w.theme}</p>
                                            <p>Niveles: {w.days.length}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setBuilderWorld(w);
                                                    setShowBuilderModal(true);
                                                }}
                                                className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> Ver / Editar
                                            </button>


                                            <span className="bg-emerald-50 text-emerald-700 font-bold py-2 px-3 rounded-lg text-sm flex items-center gap-1">
                                                ✓ Activo
                                            </span>

                                            <button
                                                onClick={() => setWorldToDelete(w)}
                                                className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold transition-colors flex items-center justify-center shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* STUDENTS TAB */}
                {activeTab === 'students' && (
                    <>
                        {/* Classroom Selector */}
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Organización de Aula
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowAddGradeModal(true)}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3 h-3" /> Nuevo Grado
                                    </button>
                                    <button
                                        onClick={() => setShowAddClassroomModal(true)}
                                        className="text-xs bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3 h-3" /> Nuevo Grupo
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                <button
                                    onClick={() => setSelectedClassroomId("all")}
                                    className={`px-4 py-2 rounded-xl border-2 transition-all whitespace-nowrap font-bold text-sm flex items-center gap-2 ${selectedClassroomId === "all"
                                        ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-200"
                                        : "bg-white border-slate-100 text-slate-500 hover:border-sky-200"
                                        }`}
                                >
                                    Todos los Grupos
                                </button>

                                {grades.map(grade => (
                                    <div key={grade.id} className="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100">
                                        <div className="flex items-center group relative px-2 pr-4 cursor-pointer">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase leading-tight">{grade.name}</span>
                                                {grade.description && <span className="text-[8px] text-slate-400 max-w-[60px] truncate leading-none mt-0.5" title={grade.description}>{grade.description}</span>}
                                            </div>
                                            <div className="absolute right-0 top-0 bottom-0 hidden group-hover:flex items-center bg-transparent z-10 gap-1">
                                                <button onClick={() => { setEditingGrade(grade); setNewGradeName(grade.name); setNewGradeDescription(grade.description || ""); setShowAddGradeModal(true); }} className="p-0.5 text-slate-400 hover:text-sky-600 transition-colors" title="Editar Grado"><span className="text-[10px]">✏️</span></button>
                                                <button onClick={() => handleDeleteGrade(grade.id)} className="p-0.5 text-slate-400 hover:text-red-600 transition-colors" title="Borrar Grado"><span className="text-[10px]">❌</span></button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {classrooms.filter(c => c.gradeId === grade.id).map(cls => (
                                                <div key={cls.id} className="relative group/cls flex items-center">
                                                    <button
                                                        onClick={() => setSelectedClassroomId(cls.id)}
                                                        className={`px-3 py-1.5 rounded-lg border-2 transition-all font-bold text-xs flex flex-col items-start gap-0.5 ${selectedClassroomId === cls.id
                                                            ? "bg-white border-sky-500 text-sky-700 shadow-sm"
                                                            : "bg-white border-white text-slate-500 hover:border-slate-200"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <span>{cls.emoji}</span> {cls.name}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-80 mt-1">
                                                            <span className="text-[9px] font-mono tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-sky-700">Código: {cls.accessCode || 'N/A'}</span>
                                                        </div>
                                                        {cls.description && <span className="text-[9px] font-normal leading-none opacity-80 max-w-[80px] truncate mt-0.5" title={cls.description}>{cls.description}</span>}
                                                    </button>
                                                    <div className="absolute -top-6 right-0 hidden group-hover/cls:flex items-center bg-white shadow-lg border border-slate-100 rounded-lg p-1 z-10 transition-all gap-1">
                                                        <button onClick={() => { setEditingClassroom(cls); setNewClassName(cls.name); setNewClassDescription(cls.description || ""); setNewClassEmoji(cls.emoji); setSelectedGradeIdInModal(cls.gradeId || ""); setShowAddClassroomModal(true); }} className="px-1.5 py-0.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-md text-[10px] font-bold transition-colors">Editar</button>
                                                        <button onClick={() => handleDeleteClassroom(cls.id)} className="px-1.5 py-0.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md text-[10px] font-bold transition-colors">Borrar</button>
                                                    </div>
                                                </div>
                                            ))}
                                            {classrooms.filter(c => c.gradeId === grade.id).length === 0 && (
                                                <span className="text-[10px] text-slate-300 italic px-2">Sin grupos</span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Independent Groups */}
                                {classrooms.filter(c => !c.gradeId).length > 0 && (
                                    <div className="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase px-2">Otros</span>
                                        <div className="flex gap-2">
                                            {classrooms.filter(c => !c.gradeId).map(cls => (
                                                <div key={cls.id} className="relative group/cls flex items-center">
                                                    <button
                                                        onClick={() => setSelectedClassroomId(cls.id)}
                                                        className={`px-3 py-1.5 rounded-lg border-2 transition-all font-bold text-xs flex flex-col items-start gap-0.5 ${selectedClassroomId === cls.id
                                                            ? "bg-white border-sky-500 text-sky-700 shadow-sm"
                                                            : "bg-white border-white text-slate-500 hover:border-slate-200"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <span>{cls.emoji}</span> {cls.name}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-80 mt-1">
                                                            <span className="text-[9px] font-mono tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-sky-700">Código: {cls.accessCode || 'N/A'}</span>
                                                        </div>
                                                        {cls.description && <span className="text-[9px] font-normal leading-none opacity-80 max-w-[80px] truncate mt-0.5" title={cls.description}>{cls.description}</span>}
                                                    </button>
                                                    <div className="absolute -top-6 right-0 hidden group-hover/cls:flex items-center bg-white shadow-lg border border-slate-100 rounded-lg p-1 z-10 transition-all gap-1">
                                                        <button onClick={() => { setEditingClassroom(cls); setNewClassName(cls.name); setNewClassDescription(cls.description || ""); setNewClassEmoji(cls.emoji); setSelectedGradeIdInModal(cls.gradeId || ""); setShowAddClassroomModal(true); }} className="px-1.5 py-0.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-md text-[10px] font-bold transition-colors">Editar</button>
                                                        <button onClick={() => handleDeleteClassroom(cls.id)} className="px-1.5 py-0.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md text-[10px] font-bold transition-colors">Borrar</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Insights Card */}
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gradient-to-br from-sky-500 to-slate-500 rounded-2xl p-6 text-white shadow-lg col-span-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                                            <BrainCircuit className="w-5 h-5" /> Análisis de IA
                                        </h3>
                                        <div className="mb-4">
                                            <label className="text-xs text-sky-200 font-bold uppercase tracking-wider mb-1 block">Seleccionar Alumno</label>
                                            <select
                                                value={selectedStudentId}
                                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                                className="bg-white/20 border border-white/30 text-white rounded-lg px-3 py-1.5 text-sm w-full max-w-[200px] outline-none"
                                            >
                                                {(selectedClassroomId === "all"
                                                    ? students
                                                    : students.filter(s => s.classroomId === selectedClassroomId)
                                                ).map(s => (
                                                    <option key={s.id} value={s.id} className="text-slate-800">{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <p className="text-sky-100 mb-4 text-sm leading-relaxed">
                                            {activeStudentContext ? (
                                                <>Se detecta que <strong>{activeStudentContext.student.name}</strong> se encuentra actualmente en el reto <strong>{activeStudentContext.level?.title || "desconocido"}</strong> del mapa actual.</>
                                            ) : (
                                                <>Selecciona un alumno y asegúrate de tener un mapa activo para recibir análisis.</>
                                            )}
                                        </p>
                                        {activeStudentContext && (
                                            <button
                                                onClick={handleAiReviewClick}
                                                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-bold backdrop-blur transition-all active:scale-95 shadow-sm"
                                            >
                                                Ver Sugerencias de IA
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-full">
                                        <AlertTriangle className="w-8 h-8 text-yellow-300" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-4">Rendimiento</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Promedio Clase</span>
                                        <span className="font-bold text-green-600">{metrics.average}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Completado</span>
                                        <span className="font-bold text-sky-600">{metrics.completion}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">Progreso de Estudiantes</h3>
                                <button
                                    onClick={() => {
                                        if (isSuspended) return alert("Tu cuenta está suspendida. Contacta a un administrador.");
                                        if (studentsLimitReached) return alert(`Has alcanzado el límite de ${schoolInfo.maxStudents} alumno(s) en tu plan actual.`);
                                        setStudentName("");
                                        setStudentAvatar("🧑🏻");
                                        setShowAddStudentModal(true);
                                    }}
                                    className={`${isSuspended || studentsLimitReached ? 'bg-slate-400' : 'bg-sky-600 hover:bg-sky-700'} text-white px-4 py-2 rounded-full font-bold shadow-lg shadow-sky-200 transition-all flex items-center gap-2 text-sm`}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Agregar Alumno
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {students.filter(s => selectedClassroomId === "all" || s.classroomId === selectedClassroomId).length === 0 ? (
                                    <div className="p-12 text-center text-slate-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>{selectedClassroomId === "all" ? "No hay alumnos registrados." : "No hay alumnos en este grupo."}</p>
                                        <p className="text-sm mt-1">Haz clic en "Agregar Alumno" para comenzar.</p>
                                    </div>
                                ) : (
                                    students.filter(s => selectedClassroomId === "all" || s.classroomId === selectedClassroomId).map(student => {
                                        const calculatedProgress = calculateStudentProgress(student.id, progress, worlds);
                                        return (
                                            <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">
                                                    {student.avatar}
                                                </div>
                                                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-3">
                                                        <h4 className="font-bold text-slate-700">{student.name}</h4>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-xs text-slate-400">{student.lastActivity}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono tracking-wider font-bold" title="Código de Acceso del Alumno">
                                                                {student.studentCode || 'X7P9K2'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1">
                                                        {student.status === 'needs_help' && (
                                                            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold">Ayuda</span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-4">
                                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${getClassColor(calculatedProgress)}`}
                                                                style={{ width: `${calculatedProgress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 flex justify-end gap-2 text-right font-bold text-slate-600">
                                                        {calculatedProgress}%
                                                    </div>
                                                    <div className="col-span-3 flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setStudentForAssignMap(student);
                                                                setShowAssignMapModal(true);
                                                            }}
                                                            className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 transition-colors flex gap-2 items-center text-xs"
                                                            title="Asignar mapa"
                                                        >
                                                            <Map className="w-4 h-4" /> Asignar Mapa
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setStudentForGems(student);
                                                                setShowAwardGemsModal(true);
                                                            }}
                                                            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 transition-colors flex gap-2 items-center text-xs font-bold shadow-sm"
                                                            title="Dar Gemas al estudiante"
                                                        >
                                                            💎 <span className="hidden sm:inline">Dar Gemas</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingStudent(student);
                                                                setStudentName(student.name);
                                                                setStudentAvatar(student.avatar);
                                                                setSelectedClassroomInModal(student.classroomId || "");
                                                            }}
                                                            className="p-2 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-500 hover:text-sky-600 transition-colors"
                                                            title="Editar alumno"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setStudentToDelete(student)}
                                                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                                                            title="Eliminar alumno"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* INSIGHTS & REPORTS TAB */}
                {activeTab === 'insights' && (
                    <div className="space-y-6">
                        {/* Reports Generation Header */}
                        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-sky-900">Reportes de Progreso</h3>
                                <p className="text-sky-600/70 text-sm mt-1">Genera reportes PDF detallados para padres o administración escolar.</p>
                            </div>
                            <button
                                onClick={handleDownloadPDF}
                                className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-sky-200 transition-all flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Generar Reporte de Clase (PDF)
                            </button>
                            <button
                                onClick={() => setShowMessageModal(true)}
                                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-violet-200 transition-all flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Enviar Mensaje a Alumnos
                            </button>
                            <button
                                onClick={() => setShowResetModal(true)}
                                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2">
                                <RotateCcw className="w-5 h-5" />
                                Reiniciar Progreso
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Early Warning System */}
                            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-5 h-5 text-red-500" /> Sistema de Alerta Temprana
                                </h3>
                                <p className="text-xs text-slate-400 mb-4">Filtrado por: <strong>{insightWorld?.title || 'Todos'}</strong></p>
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                                    {atRiskStudents.length === 0 && strugglingStudents.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                            <p className="font-bold text-slate-700">¡Todo en orden!</p>
                                            <p className="text-sm text-slate-500">No hay alumnos en riesgo detectados.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {atRiskStudents.map(student => {
                                                const stuckContext = getStudentContext(student.id);
                                                return (
                                                    <div
                                                        key={student.id}
                                                        onClick={() => setActiveStudentProfileId(student.id)}
                                                        className="p-4 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                                                        title={`Ver expediente completo de ${student.name}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-bold text-red-800">{student.name}</span>
                                                            <span className="text-xs font-bold bg-white text-red-600 px-2 py-1 rounded-full border border-red-200">Alto Riesgo</span>
                                                        </div>
                                                        <p className="text-sm text-red-700">
                                                            Menos del 30% de progreso general. Actualmente en el reto: <strong>{stuckContext?.level?.title || "Ninguno"}</strong>. Se recomienda intervención activa.
                                                        </p>
                                                        <span className="mt-3 inline-block text-sm font-bold text-red-600 underline">
                                                            Ver Actividad Detallada
                                                        </span>
                                                    </div>
                                                )
                                            })}

                                            {strugglingStudents.map(student => {
                                                const stuckContext = getStudentContext(student.id);
                                                return (
                                                    <div
                                                        key={student.id}
                                                        onClick={() => setActiveStudentProfileId(student.id)}
                                                        className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                                                        title={`Ver expediente completo de ${student.name}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-bold text-yellow-800">{student.name}</span>
                                                            <span className="text-xs font-bold bg-white text-yellow-600 px-2 py-1 rounded-full border border-yellow-200">Vigilancia</span>
                                                        </div>
                                                        <p className="text-sm text-yellow-700">
                                                            Progreso por debajo del ideal. El alumno puede estar teniendo dificultades con: <strong>{stuckContext?.level?.title || "Retos recienes"}</strong>.
                                                        </p>
                                                        <div className="mt-3 flex gap-4">
                                                            <span className="text-sm font-bold text-yellow-600 underline">
                                                                Ver Actividad Detallada
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // prevent modal opening if just sending hint
                                                                    setStudentForHintId(student.id);
                                                                }}
                                                                className="text-sm font-bold text-sky-600 underline hover:text-sky-800 transition-colors"
                                                            >
                                                                Enviar Pista por IA
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* AI General Trends -> Dynamic Student Trends */}
                            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-5 h-5 text-sky-500" /> Rendimiento y Emociones
                                        </h3>
                                        <p className="text-xs text-slate-400">🌐 Global — Todos los mapas activos</p>
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Motivado</div>
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Dudoso</div>
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Frustrado</div>
                                    </div>
                                </div>

                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                                    {students.length === 0 ? (
                                        <div className="text-sm text-slate-500 text-center py-6">No hay alumnos para analizar.</div>
                                    ) : (
                                        students.map(student => {
                                            const progressVal = calculateStudentProgress(student.id, progress, worlds);
                                            let statusColor = "bg-green-50 border-green-100";
                                            let textStatusColor = "text-green-700";
                                            let bgFillColor = "bg-green-500";
                                            let statusLabel = "Buen Ritmo";

                                            if (progressVal < 30) {
                                                statusColor = "bg-red-50 border-red-100";
                                                textStatusColor = "text-red-700";
                                                bgFillColor = "bg-red-500";
                                                statusLabel = "En Riesgo / Sin Respuesta";
                                            } else if (progressVal < 70) {
                                                statusColor = "bg-yellow-50 border-yellow-100";
                                                textStatusColor = "text-yellow-700";
                                                bgFillColor = "bg-yellow-500";
                                                statusLabel = "Requiere Práctica";
                                            }

                                            return (
                                                <div
                                                    key={student.id}
                                                    onClick={() => setActiveStudentProfileId(student.id)}
                                                    className={`p-4 rounded-xl border ${statusColor} cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]`}
                                                    title={`Ver expediente completo de ${student.name}`}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-2xl">{student.avatar}</div>
                                                            <div>
                                                                <span className={`font-bold text-sm block ${textStatusColor}`}>{student.name}</span>
                                                                <span className={`text-xs block opacity-80 ${textStatusColor}`}>{statusLabel}</span>
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-bold ${textStatusColor}`}>{progressVal}%</span>
                                                    </div>
                                                    <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden shadow-inner">
                                                        <div className={`${bgFillColor} h-2 rounded-full`} style={{ width: `${progressVal}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}

                                    <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 mt-6">
                                        <h4 className="font-bold text-sky-800 mb-2 flex items-center gap-2">
                                            <BrainCircuit className="w-4 h-4" /> Sugerencia del Tutor IA
                                        </h4>
                                        <p className="text-sm text-sky-700 leading-relaxed">
                                            Recuerda que puedes usar el <strong>Análisis de IA</strong> en la pestaña de estudiantes para generar misiones especiales de repaso para los alumnos marcados en "Requiere Práctica" o "En Riesgo".
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-sky-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-between items-center px-6 py-3 z-50">
                <button onClick={() => setActiveTab("students")} className={`flex flex-col items-center gap-1 ${activeTab === 'students' ? 'text-sky-600' : 'text-slate-400'}`}>
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Alumnos</span>
                </button>
                <button onClick={() => setActiveTab("library")} className={`flex flex-col items-center gap-1 ${activeTab === 'library' ? 'text-sky-600' : 'text-slate-400'}`}>
                    <Library className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Mapas</span>
                </button>
                <button onClick={() => setActiveTab("insights")} className={`flex flex-col items-center gap-1 ${activeTab === 'insights' ? 'text-sky-600' : 'text-slate-400'}`}>
                    <BrainCircuit className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Análisis</span>
                </button>
                <button onClick={() => setActiveTab("raid")} className={`flex flex-col items-center gap-1 ${activeTab === 'raid' ? 'text-red-600' : 'text-slate-400'}`}>
                    <Swords className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Raid</span>
                </button>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="flex flex-col items-center gap-1 text-slate-400">
                    <LogOut className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Salir</span>
                </button>
            </nav>


            {/* Upload Engine Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                        >
                            <X className="w-5 h-5 text-slate-600" />
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

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
                        <button
                            onClick={() => setShowBulkModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                        <BulkEvidenceUploader onClose={() => setShowBulkModal(false)} />
                    </div>
                </div>
            )}



            {/* Delete Confirmation Modal */}
            {worldToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl text-center transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">¿Eliminar Aventura?</h3>
                        <p className="text-slate-600 mb-6 font-medium">
                            Estás a punto de borrar permanentemente <span className="font-bold text-slate-800">{worldToDelete.title}</span>.
                            Esta acción eliminará todos los niveles y el progreso de los estudiantes asociados a este mapa. No se puede deshacer.
                        </p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => setWorldToDelete(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    deleteWorld(worldToDelete.id);
                                    setWorldToDelete(null);
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-transform active:scale-95"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Student Modal */}
            {(showAddStudentModal || editingStudent) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 relative shadow-2xl">
                        <button
                            onClick={() => { setShowAddStudentModal(false); setEditingStudent(null); setStudentName(""); setStudentAvatar("🧑🏻"); }}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                        <h3 className="text-xl font-bold text-slate-800 mb-6">
                            {editingStudent ? "Editar Alumno" : "Agregar Alumno"}
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Alumno</label>
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition font-medium text-slate-800"
                                    placeholder="Ej. María López"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Avatar</label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                    {AVATAR_OPTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setStudentAvatar(emoji)}
                                            className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all ${studentAvatar === emoji ? 'bg-sky-100 ring-2 ring-sky-500 scale-110' : 'bg-slate-50 hover:bg-slate-100'}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Grupo / Salón</label>
                                <select
                                    value={selectedClassroomInModal}
                                    onChange={(e) => setSelectedClassroomInModal(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition font-medium text-slate-800"
                                >
                                    <option value="">Sin Grupo (General)</option>
                                    {classrooms.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.emoji} {cls.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleSaveStudent}
                                disabled={!studentName.trim() || savingStudent}
                                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
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
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">¿Eliminar Alumno?</h3>
                        <p className="text-slate-600 mb-6 font-medium">
                            Estás a punto de borrar permanentemente a <span className="font-bold text-slate-800">{studentToDelete.name}</span>.
                            Se eliminará todo su progreso, inventario y logros. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => setStudentToDelete(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
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
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-4xl">{studentForAssignMap.avatar}</div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    Asignar Mapa a {studentForAssignMap.name}
                                </h3>
                                <p className="text-sm text-slate-500">Selecciona el mapa al que tendrá acceso.</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {worlds.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">No has creado ningún mapa todavía.</p>
                            ) : (
                                worlds.map(w => {
                                    const isAssigned = studentForAssignMap.assignedWorlds?.some(aw => aw.id === w.id);
                                    return (
                                        <div key={w.id} className={`p-4 border rounded-xl transition-colors flex items-center justify-between ${isAssigned ? 'border-sky-500 bg-sky-50/30' : 'border-slate-200 hover:border-sky-300'}`}>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-bold ${isAssigned ? 'text-sky-800' : 'text-slate-700'}`}>{w.title || "Aventura Sin Título"}</h4>
                                                    {isAssigned && <span className="bg-sky-100 text-sky-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Asignado</span>}
                                                </div>
                                                <p className="text-xs text-slate-500">Tema: {w.theme}</p>
                                            </div>
                                            <button
                                                onClick={() => handleAssignMapToStudent(w.id)}
                                                disabled={isAssigningMap}
                                                className={`px-4 py-2 font-bold rounded-lg transition-colors text-sm disabled:opacity-50 ${isAssigned ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'}`}
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
                            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-sky-100 p-4 rounded-full text-sky-600">
                                <BrainCircuit className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">Sugerencias del Tutor IA</h3>
                                <p className="text-slate-500 font-medium">Análisis Pedagógico</p>
                            </div>
                        </div>

                        {isAiThinking ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
                                <p className="text-slate-500 font-medium animate-pulse">Analizando evidencias y comportamiento de los alumnos...</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in-up">
                                {aiDiagnosis && (
                                    <>
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <h4 className="font-bold text-slate-800 text-lg mb-2">Diagnóstico para {strugglingStudentContext?.student.name}</h4>
                                            <p className="text-slate-600 leading-relaxed text-sm">
                                                {aiDiagnosis.diagnosis}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-bold text-slate-800">Plan de Intervención Recomendado:</h4>
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

                                        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                                            <button
                                                onClick={() => setShowAiReviewModal(false)}
                                                className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-colors"
                                            >
                                                Cerrar
                                            </button>
                                            <button
                                                onClick={handleAiIntervention}
                                                className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center gap-2"
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
                // If a map doesn't exist or isn't active, show a global fallback.
                const sContext = getStudentContext(s?.id || "");
                const globalProgress = s ? calculateStudentProgress(s.id, progress, worlds) : 0;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl">
                            <button
                                onClick={() => setActiveStudentProfileId(null)}
                                className="sticky top-0 float-right p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>

                            <div className="flex flex-col items-center mb-6">
                                <div className="text-6xl mb-4 bg-slate-100 rounded-full w-24 h-24 flex items-center justify-center">{s?.avatar}</div>
                                <h2 className="text-2xl font-bold text-slate-800">{s?.name}</h2>
                                <p className="text-slate-500 text-sm">Ficha Descriptiva en Tiempo Real</p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl">
                                    <div className="flex justify-between font-bold text-sky-900 mb-2">
                                        <span>Progreso Global (Todos los Mapas)</span>
                                        <span>{globalProgress}%</span>
                                    </div>
                                    <div className="w-full bg-white/60 rounded-full h-2">
                                        <div className={`${getClassColor(globalProgress)} h-2 rounded-full`} style={{ width: `${globalProgress}%` }}></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl flex items-center justify-between">
                                        <span className="text-slate-600 font-bold">Gemas</span>
                                        <span className="text-sky-600 font-black text-lg">💎 {s?.gems || 0}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl flex items-center justify-between">
                                        <span className="text-slate-600 font-bold">Experiencia</span>
                                        <span className="text-orange-500 font-black text-lg">✨ {s?.xp || 0}</span>
                                    </div>
                                </div>

                                <div className="bg-white border text-sm text-slate-600 border-slate-200 rounded-xl p-4">
                                    <h4 className="font-bold text-slate-800 mb-2">Estado Actual del Alumno:</h4>
                                    {sContext ? (
                                        <p>
                                            El alumno se encuentra activo en el mapa <strong>"{sContext.world.title}"</strong>, trabajando actualmente en el nivel <strong>{sContext.level?.title || "Final"}</strong>.
                                        </p>
                                    ) : (
                                        <p>El alumno no tiene progreso reciente visible en los mapas activos.</p>
                                    )}
                                </div>

                                {/* Análisis Pedagógico — Powered by AI */}
                                <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-sm mt-4">
                                    <h4 className="font-bold text-sky-900 mb-2 flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4" /> Reporte Pedagógico IA
                                    </h4>
                                    {aiReport ? (
                                        <div className="prose prose-sm prose-sky max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{aiReport}</ReactMarkdown>
                                        </div>
                                    ) : isGeneratingReport ? (
                                        <div className="flex items-center gap-3 p-4">
                                            <div className="animate-spin h-5 w-5 border-2 border-sky-600 border-t-transparent rounded-full"></div>
                                            <span className="text-sky-700 font-medium">Generando reporte con IA...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sky-800 leading-relaxed italic mb-3">
                                                {globalProgress >= 70 ? (
                                                    "El alumno demuestra un dominio sólido de los conceptos fundamentales."
                                                ) : globalProgress >= 30 ? (
                                                    "El alumno comprende la teoría básica pero necesita refuerzo práctico."
                                                ) : (
                                                    "El alumno muestra dificultades. Se recomienda intervención."
                                                )}
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={async () => {
                                                        setIsGeneratingReport(true);
                                                        try {
                                                            const res = await fetch('/api/ai/generate-report', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ studentId: s?.id, studentName: s?.name, reportType: 'teacher' })
                                                            });
                                                            const data = await res.json();
                                                            setAiReport(data.report);
                                                        } catch (e) {
                                                            setAiReport('Error al generar el reporte.');
                                                        }
                                                        setIsGeneratingReport(false);
                                                    }}
                                                    className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                                >
                                                    <BrainCircuit className="w-4 h-4" /> Generar Reporte para Docente (IA)
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        setIsGeneratingReport(true);
                                                        try {
                                                            const res = await fetch('/api/ai/generate-report', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ studentId: s?.id, studentName: s?.name, reportType: 'parent' })
                                                            });
                                                            const data = await res.json();

                                                            // Generate PDF logic here conceptually
                                                            const doc = new jsPDF();
                                                            doc.setFont("helvetica", "bold");
                                                            doc.setFontSize(20);
                                                            doc.text("Reporte para Padres", 105, 20, { align: "center" });

                                                            doc.setFont("helvetica", "normal");
                                                            doc.setFontSize(12);
                                                            const splitTitle = doc.splitTextToSize(data.title || "Reporte de Desempeño", 180);
                                                            doc.text(splitTitle, 20, 40);

                                                            let y = 50;
                                                            if (Array.isArray(data.paragraphs)) {
                                                                data.paragraphs.forEach((p: string) => {
                                                                    const lines = doc.splitTextToSize(p, 170);
                                                                    doc.text(lines, 20, y);
                                                                    y += (lines.length * 7) + 5;
                                                                });
                                                            } else {
                                                                const lines = doc.splitTextToSize(data.report || "", 170);
                                                                doc.text(lines, 20, y);
                                                                y += (lines.length * 7) + 5;
                                                            }

                                                            if (data.homeActivity) {
                                                                doc.setFont("helvetica", "bold");
                                                                doc.text("Actividad sugerida en casa:", 20, y);
                                                                y += 10;
                                                                doc.setFont("helvetica", "normal");
                                                                const lines = doc.splitTextToSize(data.homeActivity, 170);
                                                                doc.text(lines, 20, y);
                                                            }

                                                            doc.save(`Reporte_${s?.name.replace(/\s+/g, '_')}.pdf`);

                                                        } catch (e) {
                                                            console.error("PDF Generate Error", e);
                                                            alert('Error al generar el PDF para padres.');
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

                            {/* Expediente de Evidencias (AI Feedback Hub) */}
                            <div className="mt-6">
                                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-sky-500" />
                                    Expediente de Evidencias IA
                                </h3>
                                {isFetchingEvidence ? (
                                    <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl">
                                        <div className="animate-spin h-6 w-6 border-2 border-sky-600 border-t-transparent rounded-full"></div>
                                    </div>
                                ) : studentEvidence.length === 0 ? (
                                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                        <p className="text-slate-500 font-medium">Aún no hay evidencias escaneadas.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                        {studentEvidence.map((entry, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl border ${entry.isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${entry.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {entry.isCorrect ? 'Correcto' : 'Por Mejorar'}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                            Tema: {entry.topic || entry.world?.theme || 'Desconocido'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        {new Date(entry.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <div className="mt-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                    <p className="text-xs text-slate-500 font-bold mb-1">Lo que escribió/escaneó el alumno:</p>
                                                    <p className="text-sm text-slate-700 italic border-l-2 border-sky-200 pl-3 py-1">
                                                        "{entry.studentAnswer}"
                                                    </p>
                                                </div>

                                                <div className="mt-3 flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-100">
                                                        🤖
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 font-bold mb-1">Diagnóstico de la IA:</p>
                                                        <p className="text-sm text-slate-800 flex-1 leading-relaxed font-medium">
                                                            {entry.feedback}
                                                        </p>
                                                        {entry.emotionDetected && (
                                                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-100 rounded-md shadow-sm">
                                                                <span className="text-xs text-slate-500">Tono detectado:</span>
                                                                <span className="text-xs font-bold text-sky-600">{entry.emotionDetected}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

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
                                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 disabled:opacity-50"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>

                            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <BrainCircuit className="text-sky-600 w-5 h-5" /> Generador de Pistas IA
                            </h3>
                            <p className="text-slate-500 text-sm mb-6">Envía un mensaje de apoyo y una pista sutil a <strong>{s?.name}</strong>.</p>

                            {hintSentSuccess ? (
                                <div className="py-8 text-center animate-fade-in-up">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg">Pista Enviada</h4>
                                    <p className="text-slate-500 text-sm mt-1">El alumno verá esta alerta pedagógica en su portal.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <textarea
                                        value={hintText}
                                        onChange={(e) => setHintText(e.target.value)}
                                        rows={4}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition"
                                        placeholder="Escribe aquí la pista personalizada para el alumno..."
                                    />
                                    <button
                                        onClick={handleSendHint}
                                        disabled={isSendingHint}
                                        className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
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
                            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>

                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
                            💎
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">Cofre de Gemas</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            ¿Cuántas gemas deseas otorgarle a <strong className="text-emerald-700">{studentForGems.name}</strong>?
                        </p>

                        <div className="flex flex-col gap-4">
                            <input
                                type="number"
                                value={gemAmountToAward}
                                onChange={(e) => setGemAmountToAward(parseInt(e.target.value) || 0)}
                                className="w-full text-center text-3xl font-black bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none text-slate-700 transition-all"
                                disabled={isAwardingGems}
                            />

                            <div className="flex justify-center gap-2 mb-2">
                                {[10, 50, 100, 500].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setGemAmountToAward(amt)}
                                        className="bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
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
                            <p className="text-[10px] text-slate-400 mt-2">Puedes escribir números negativos para restar gemas por mal comportamiento.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD GRADE MODAL */}
            {showAddGradeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-sky-50">
                            <h3 className="font-bold text-xl text-sky-900 flex items-center gap-2">
                                <Plus className="w-5 h-5" /> {editingGrade ? "Editar Grado / Nivel" : "Nuevo Grado / Nivel"}
                            </h3>
                            <button onClick={() => { setShowAddGradeModal(false); setEditingGrade(null); setNewGradeName(""); setNewGradeDescription(""); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Corto del Grado</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 6to, 1, Primer Grado..."
                                    value={newGradeName}
                                    onChange={(e) => setNewGradeName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
                                />
                                <p className="text-xs text-slate-400 mt-2 mb-4">Los grados sirven para agrupar aulas.</p>

                                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción / Identificador (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Primaria Regular, Sabatino, Generación B..."
                                    value={newGradeDescription}
                                    onChange={(e) => setNewGradeDescription(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleCreateGrade}
                                disabled={savingStudent || !newGradeName.trim()}
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-sky-200 transition-all disabled:opacity-50"
                            >
                                {savingStudent ? "Guardando..." : (editingGrade ? "Guardar Cambios" : "Crear Grado")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD CLASSROOM MODAL */}
            {showAddClassroomModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-sky-50">
                            <h3 className="font-bold text-xl text-sky-900 flex items-center gap-2">
                                <Plus className="w-5 h-5" /> {editingClassroom ? "Editar Grupo" : "Nuevo Grupo"}
                            </h3>
                            <button onClick={() => { setShowAddClassroomModal(false); setEditingClassroom(null); setNewClassName(""); setNewClassDescription(""); setNewClassEmoji("📚"); setSelectedGradeIdInModal(""); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Corto del Grupo</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Grupo A, Sabatino, Avanzado..."
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción / Detalles (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Club de Matemáticas, Los Leones..."
                                    value={newClassDescription}
                                    onChange={(e) => setNewClassDescription(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Perteneciente al Grado (Opcional)</label>
                                <select
                                    value={selectedGradeIdInModal}
                                    onChange={(e) => setSelectedGradeIdInModal(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                >
                                    <option value="">Sin Grado (Independiente)</option>
                                    {grades.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Emoji Identificador</label>
                                <div className="flex flex-wrap gap-2">
                                    {["📚", "🧪", "🎨", "🧩", "🤖", "🌟", "📐", "🧠", "🎯", "☄️"].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setNewClassEmoji(emoji)}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${newClassEmoji === emoji ? "bg-sky-600 text-white scale-110 shadow-md" : "bg-slate-50 hover:bg-slate-100"
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
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-sky-200 transition-all disabled:opacity-50"
                            >
                                {savingStudent ? "Creando..." : "Crear Grupo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Visual World Builder Modal (View/Edit Map + Download Teacher Guide PDF) */}
            {/* ════════════ JEFE DE INCURSIÓN (Raid Boss) ════════════ */}
            {activeTab === 'raid' && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl shadow-xl border border-red-200 p-6">
                    <h2 className="text-xl font-bold text-red-800 flex items-center gap-2 mb-4">
                        ⚔️ Jefe de Incursión
                    </h2>

                    {/* Current Boss Status */}
                    {currentRaidBoss && (
                        <div className="bg-white rounded-2xl p-4 border border-red-200 mb-4 flex items-center gap-4">
                            <div className="text-4xl bg-red-100 w-14 h-14 rounded-full flex items-center justify-center shadow-sm">{currentRaidBoss.imageUrl}</div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">{currentRaidBoss.name}</h3>
                                <div className="w-full bg-slate-200 rounded-full h-3 mt-1 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                                        style={{ width: `${Math.max(0, (currentRaidBoss.currentHealth / currentRaidBoss.maxHealth) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{currentRaidBoss.currentHealth.toLocaleString()} / {currentRaidBoss.maxHealth.toLocaleString()} HP</p>
                            </div>
                            <button
                                onClick={handleResetBoss}
                                disabled={isResettingBoss}
                                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {isResettingBoss ? "Reiniciando..." : "🔄 Reiniciar Vida"}
                            </button>
                        </div>
                    )}

                    {/* Create / Configure Boss Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Nombre del Jefe</label>
                            <input
                                type="text"
                                value={raidBossName}
                                onChange={(e) => setRaidBossName(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                                placeholder="Ej: Dragón del Caos"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-2">Avatar del Jefe</label>
                            <div className="flex flex-wrap gap-2">
                                {MONSTER_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => { setRaidBossEmoji(emoji); setRaidBossName(MONSTER_NAMES[emoji] || emoji); }}
                                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all hover:scale-110 ${raidBossEmoji === emoji ? 'border-red-500 bg-red-50 scale-110 shadow-md' : 'border-slate-200 bg-white'}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-2">Vida del Jefe (HP)</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {HP_PRESETS.map(preset => (
                                    <button
                                        key={preset.value}
                                        onClick={() => setRaidBossHP(preset.value)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${raidBossHP === preset.value ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                    >
                                        {preset.label} ({preset.value.toLocaleString()})
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                value={raidBossHP}
                                onChange={(e) => setRaidBossHP(Number(e.target.value))}
                                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                                min={100}
                                step={100}
                            />
                        </div>

                        <button
                            onClick={handleCreateBoss}
                            disabled={isCreatingBoss || !raidBossName.trim()}
                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isCreatingBoss ? "Creando..." : currentRaidBoss ? "⚔️ Reemplazar con Nuevo Jefe" : "⚔️ Crear Jefe de Incursión"}
                        </button>
                    </div>
                </div>
            )}

            {showBuilderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-y-auto relative shadow-2xl">
                        <VisualWorldBuilder
                            onClose={() => { setShowBuilderModal(false); setBuilderWorld(null); }}
                            initialWorld={builderWorld || undefined}
                        />
                    </div>
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
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Destinatarios</label>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => { setIsMessageGlobal(true); setMessageRecipients([]); }}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${isMessageGlobal ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                📢 Todos los alumnos
                                            </button>
                                            <button
                                                onClick={() => setIsMessageGlobal(false)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${!isMessageGlobal ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                👤 Seleccionar alumnos
                                            </button>
                                        </div>

                                        {!isMessageGlobal && (
                                            <div className="max-h-40 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1">
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
                                                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">{s.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Message text */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Mensaje</label>
                                        <textarea
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Escribe tu mensaje aquí..."
                                            rows={4}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all font-medium resize-none"
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
                                    <p className="text-slate-500 text-sm mt-1">La página se recargará en un momento...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> ¡Atención! Esta acción elimina todo el progreso, XP, gemas y evidencias. No se puede deshacer.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">¿Quiénes?</label>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => { setIsResetAll(true); setResetStudentIds([]); }}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${isResetAll ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                👥 Todos los alumnos
                                            </button>
                                            <button
                                                onClick={() => setIsResetAll(false)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition ${!isResetAll ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                👤 Seleccionar alumnos
                                            </button>
                                        </div>

                                        {!isResetAll && (
                                            <div className="max-h-40 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1">
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
                                                            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">{s.name}</span>
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

        </div >
    );
}

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
