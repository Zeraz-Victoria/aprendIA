"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
    TrendingUp, Users, BookOpen, Clock, Activity, Award, Star, MessageSquare, 
    Search, X, FileText, ChevronRight, BrainCircuit, Sparkles, Filter, 
    CheckCircle2, AlertTriangle, AlertCircle, Send, Plus, Pencil, Trash2, UserPlus, UploadCloud
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Student, LearningWorld, Classroom, useLearning } from "@/contexts/LearningContext";

// Componente visual de los Anillos estilo Apple Watch
interface ActivityRingsProps {
    outer: number; // Avance de Mapas (0-100)
    middle: number; // Promedio Académico (0-100)
    inner: number; // Tasa de Entrega/Responsabilidad (0-100)
    size?: number;
    showLabel?: boolean;
}

export function ActivityRings({ outer, middle, inner, size = 160, showLabel = false }: ActivityRingsProps) {
    // Validar límites 0-100
    const outPct = Math.min(100, Math.max(0, outer));
    const midPct = Math.min(100, Math.max(0, middle));
    const innPct = Math.min(100, Math.max(0, inner));

    // Radios
    const rOuter = 66;
    const rMiddle = 50;
    const rInner = 34;

    // Perímetros (2 * PI * r)
    const cOuter = 2 * Math.PI * rOuter;
    const cMiddle = 2 * Math.PI * rMiddle;
    const cInner = 2 * Math.PI * rInner;

    // Offsets para stroke-dashoffset
    const offOuter = cOuter - (outPct / 100) * cOuter;
    const offMiddle = cMiddle - (midPct / 100) * cMiddle;
    const offInner = cInner - (innPct / 100) * cInner;

    return (
        <div className="relative flex flex-col items-center justify-center select-none" style={{ width: size, height: size }}>
            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 160 160" 
                className="overflow-visible filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]"
            >
                {/* Definiciones para degradados de color premium */}
                <defs>
                    <linearGradient id="gradOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#346297" />
                        <stop offset="100%" stopColor="#254d7d" />
                    </linearGradient>
                    <linearGradient id="gradMiddle" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#73a4db" />
                        <stop offset="100%" stopColor="#4f82be" />
                    </linearGradient>
                    <linearGradient id="gradInner" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#93C5FD" />
                    </linearGradient>
                </defs>

                {/* Anillo Exterior - Avance de Mapas (Fondo claro) */}
                <circle 
                    cx="80" cy="80" r={rOuter} 
                    stroke="rgba(52, 98, 151, 0.15)" 
                    strokeWidth="13" fill="transparent" 
                />
                {/* Anillo Exterior - Progreso */}
                <circle 
                    cx="80" cy="80" r={rOuter} 
                    stroke="url(#gradOuter)" 
                    strokeWidth="13" fill="transparent" 
                    strokeDasharray={cOuter}
                    strokeDashoffset={offOuter}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />

                {/* Anillo Medio - Promedio Académico (Fondo claro) */}
                <circle 
                    cx="80" cy="80" r={rMiddle} 
                    stroke="rgba(115, 164, 219, 0.15)" 
                    strokeWidth="13" fill="transparent" 
                />
                {/* Anillo Medio - Progreso */}
                <circle 
                    cx="80" cy="80" r={rMiddle} 
                    stroke="url(#gradMiddle)" 
                    strokeWidth="13" fill="transparent" 
                    strokeDasharray={cMiddle}
                    strokeDashoffset={offMiddle}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />

                {/* Anillo Interior - Entrega de Evidencias (Fondo claro) */}
                <circle 
                    cx="80" cy="80" r={rInner} 
                    stroke="rgba(96, 165, 250, 0.15)" 
                    strokeWidth="13" fill="transparent" 
                />
                {/* Anillo Interior - Progreso */}
                <circle 
                    cx="80" cy="80" r={rInner} 
                    stroke="url(#gradInner)" 
                    strokeWidth="13" fill="transparent" 
                    strokeDasharray={cInner}
                    strokeDashoffset={offInner}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
            </svg>

            {showLabel && (
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] font-black tracking-widest text-[#346297] uppercase leading-none mb-1">PROMEDIO</span>
                    <span className="text-2xl font-black text-[#1c3a60] leading-none tracking-tight">{Math.round((outPct + midPct + innPct) / 3)}%</span>
                </div>
            )}
        </div>
    );
}

interface PerformanceDashboardProps {
    selectedClassroomId: string;
    setSelectedClassroomId: (val: string) => void;
    isSuspended: boolean;
    studentsLimitReached: boolean;
    maxStudents: number;
    onOpenAddClassroom: () => void;
    onEditClassroom: (classroom: Classroom) => void;
    onDeleteClassroom: (id: string) => void;
    onOpenAddStudent: () => void;
    onEditStudent: (student: Student) => void;
    onDeleteStudent: (student: Student) => void;
    onOpenBulkModal: () => void;
}

export default function PerformanceDashboard({
    selectedClassroomId,
    setSelectedClassroomId,
    isSuspended,
    studentsLimitReached,
    maxStudents,
    onOpenAddClassroom,
    onEditClassroom,
    onDeleteClassroom,
    onOpenAddStudent,
    onEditStudent,
    onDeleteStudent,
    onOpenBulkModal
}: PerformanceDashboardProps) {
    const { 
        students, worlds, classrooms, progress, toggleWorldAssignment, 
        setProjectGrade 
    } = useLearning();

    // Filtros
    const [selectedWorldId, setSelectedWorldId] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Datos de evidencias (cargados en paralelo al montar)
    const [allEvidences, setAllEvidences] = useState<Record<string, any[]>>({});
    const [loadingEvidences, setLoadingEvidences] = useState(false);

    // Detalle de estudiante
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [showStudentModal, setShowStudentModal] = useState(false);

    // Estado para envío de gemas/mensaje rápido en modal
    const [quickGemsAmount, setQuickGemsAmount] = useState<number>(10);
    const [quickMessage, setQuickMessage] = useState("");
    const [actionMessageStatus, setActionMessageStatus] = useState("");
    const [aiGeneratingMission, setAiGeneratingMission] = useState(false);

    // Reportes individuales
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [profileScopeWorldId, setProfileScopeWorldId] = useState("global");

    // Cargar evidencias para todos los estudiantes en el salón seleccionado
    useEffect(() => {
        const fetchAllEvidences = async () => {
            setLoadingEvidences(true);
            const evidencesMap: Record<string, any[]> = {};
            try {
                // Hacer peticiones en paralelo controlado
                await Promise.all(
                    students.map(async (student) => {
                        try {
                            const res = await fetch(`/api/evidence?studentId=${student.id}&t=${Date.now()}`);
                            if (res.ok) {
                                evidencesMap[student.id] = await res.json();
                            } else {
                                evidencesMap[student.id] = [];
                            }
                        } catch {
                            evidencesMap[student.id] = [];
                        }
                    })
                );
                setAllEvidences(evidencesMap);
            } catch (err) {
                console.error("Error fetching all student evidences:", err);
            } finally {
                setLoadingEvidences(false);
            }
        };

        if (students.length > 0) {
            fetchAllEvidences();
        }
    }, [students]);

    // Helpers de Cálculos por Estudiante
    const getStudentWorldProgress = (studentId: string, world: LearningWorld): number => {
        const completedLevels = progress[studentId]?.[world.id] || [];
        const totalLevels = world.days?.length || 8;
        return Math.round((completedLevels.length / totalLevels) * 100);
    };

    const getStudentOverallProgress = (studentId: string, assignedWorldsList: LearningWorld[]): number => {
        if (assignedWorldsList.length === 0) return 0;
        let totalAssignedLevels = 0;
        let completedLevelsCount = 0;

        assignedWorldsList.forEach(w => {
            totalAssignedLevels += w.days?.length || 8;
            completedLevelsCount += (progress[studentId]?.[w.id] || []).length;
        });

        return totalAssignedLevels > 0 ? Math.round((completedLevelsCount / totalAssignedLevels) * 100) : 0;
    };

    const getStudentAcademicAverage = (student: Student, specificWorldId?: string): number => {
        if (specificWorldId && specificWorldId !== "all") {
            const gradeObj = student.projectGrades?.find(g => g.worldId === specificWorldId);
            if (gradeObj) return gradeObj.grade * 10; // Escalar a 0-100

            const autoGrade = student.automaticProjectGrades?.find(g => g.worldId === specificWorldId);
            if (autoGrade) return autoGrade.averageGrade * 10;
            return 0;
        }

        if (student.globalActivityAverage !== undefined && student.globalActivityAverage !== null) {
            return student.globalActivityAverage * 10; // Escalar a 0-100
        }

        if (student.projectGrades && student.projectGrades.length > 0) {
            const sum = student.projectGrades.reduce((acc, g) => acc + g.grade, 0);
            return (sum / student.projectGrades.length) * 10;
        }

        return 0;
    };

    const getStudentSubmissionRate = (studentId: string, assignedWorldsList: LearningWorld[]): number => {
        if (assignedWorldsList.length === 0) return 0;
        let totalLevels = 0;
        assignedWorldsList.forEach(w => {
            totalLevels += w.days?.length || 8;
        });

        const studentEvs = allEvidences[studentId] || [];
        // Contar evidencias únicas por nivel/mundo asignado
        const uniqueSubmissions = new Set();
        studentEvs.forEach(e => {
            if (assignedWorldsList.some(w => w.id === e.worldId)) {
                uniqueSubmissions.add(`${e.worldId}_${e.levelId}`);
            }
        });

        return totalLevels > 0 ? Math.round((uniqueSubmissions.size / totalLevels) * 100) : 0;
    };

    // Resolver mundos asignados implícitamente por salón + explícitamente
    const getStudentAssignedWorlds = (student: Student): LearningWorld[] => {
        const assignedIds = new Set<string>();
        const studentWorlds: LearningWorld[] = [];

        // Explícitos
        (student.assignedWorlds || []).forEach(w => assignedIds.add(w.id));

        // Implícitos por salón
        if (student.classroomId) {
            worlds.forEach(w => {
                if (w.classrooms?.some(c => c.id === student.classroomId)) {
                    assignedIds.add(w.id);
                }
            });
        }

        assignedIds.forEach(id => {
            const match = worlds.find(w => w.id === id);
            if (match) studentWorlds.push(match);
        });

        return studentWorlds;
    };

    // Estudiantes Filtrados
    const activeClassroom = classrooms.find(c => c.id === selectedClassroomId);
    const activeWorld = worlds.find(w => w.id === selectedWorldId);

    const filteredStudents = students.filter(student => {
        // Filtro de salón
        if (selectedClassroomId !== "all" && student.classroomId !== selectedClassroomId) {
            return false;
        }

        // Filtro de mapa activo (el estudiante debe tenerlo asignado)
        const assignedWorldsList = getStudentAssignedWorlds(student);
        if (selectedWorldId !== "all" && !assignedWorldsList.some(w => w.id === selectedWorldId)) {
            return false;
        }

        // Búsqueda por nombre
        if (searchTerm.trim() !== "" && !student.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Filtro de estado
        const mapProgress = getStudentOverallProgress(student.id, assignedWorldsList);
        if (statusFilter !== "all") {
            if (statusFilter === "alert" && mapProgress >= 30) return false;
            if (statusFilter === "practice" && (mapProgress < 30 || mapProgress >= 70)) return false;
            if (statusFilter === "good" && mapProgress < 70) return false;
        }

        return true;
    });

    // Cálculos de Promedios de Grupo
    const calculateGroupMetrics = () => {
        if (filteredStudents.length === 0) {
            return { progress: 0, academic: 0, submission: 0 };
        }

        let totalProgress = 0;
        let totalAcademic = 0;
        let totalSubmission = 0;
        let studentsWithGrades = 0;

        filteredStudents.forEach(st => {
            const assigned = getStudentAssignedWorlds(st);
            totalProgress += selectedWorldId === "all" 
                ? getStudentOverallProgress(st.id, assigned)
                : getStudentWorldProgress(st.id, activeWorld!);

            const acad = getStudentAcademicAverage(st, selectedWorldId);
            if (acad > 0) {
                totalAcademic += acad;
                studentsWithGrades++;
            }

            totalSubmission += getStudentSubmissionRate(st.id, selectedWorldId === "all" ? assigned : [activeWorld!]);
        });

        return {
            progress: Math.round(totalProgress / filteredStudents.length),
            academic: studentsWithGrades > 0 ? Math.round(totalAcademic / studentsWithGrades) : 0,
            submission: Math.round(totalSubmission / filteredStudents.length)
        };
    };

    const groupMetrics = calculateGroupMetrics();

    // Determinar Alertas de Grupo
    const needsAttentionCount = filteredStudents.filter(st => {
        const assigned = getStudentAssignedWorlds(st);
        return getStudentOverallProgress(st.id, assigned) < 30;
    }).length;

    const lagTaskCount = filteredStudents.filter(st => {
        const assigned = getStudentAssignedWorlds(st);
        const sub = getStudentSubmissionRate(st.id, assigned);
        const avg = getStudentAcademicAverage(st);
        return sub < 50 && avg >= 70; // Envía pocas evidencias pero saca buenas notas cuando lo hace
    }).length;

    // Acciones rápidas en modal de estudiante
    const handleQuickAction = async (actionType: "gems" | "message") => {
        if (!selectedStudent) return;
        setActionMessageStatus("Procesando...");

        try {
            if (actionType === "gems") {
                const res = await fetch("/api/teacher/award-gems", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ studentId: selectedStudent.id, gemsToAdd: quickGemsAmount })
                });

                if (res.ok) {
                    const data = await res.json();
                    setSelectedStudent(prev => prev ? { ...prev, gems: data.newTotal } : prev);
                    // Actualizar en el estado principal
                    students.forEach(s => {
                        if (s.id === selectedStudent.id) s.gems = data.newTotal;
                    });
                    setActionMessageStatus(`🎉 ¡Exito! Se entregaron +${quickGemsAmount} gemas.`);
                    setTimeout(() => setActionMessageStatus(""), 3000);
                } else {
                    setActionMessageStatus("❌ Error al entregar gemas.");
                }
            } else {
                if (!quickMessage.trim()) {
                    setActionMessageStatus("⚠️ Escribe un mensaje.");
                    return;
                }
                const res = await fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: quickMessage,
                        isGlobal: false,
                        recipientIds: [selectedStudent.id]
                    })
                });

                if (res.ok) {
                    setQuickMessage("");
                    setActionMessageStatus("✉️ Mensaje enviado con éxito.");
                    setTimeout(() => setActionMessageStatus(""), 3000);
                } else {
                    setActionMessageStatus("❌ Error al enviar mensaje.");
                }
            }
        } catch {
            setActionMessageStatus("❌ Error de red.");
        }
    };

    // Crear misión de repaso IA en un clic
    const handleCreateAiMission = async () => {
        if (!selectedStudent || worlds.length === 0) return;
        const targetWorld = getStudentAssignedWorlds(selectedStudent)[0] || worlds[0];
        setAiGeneratingMission(true);
        setActionMessageStatus("Creando misión personalizada con IA...");

        try {
            const genRes = await fetch('/api/ai/generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme: targetWorld.theme,
                    topic: "Repaso de conceptos débiles y práctica guiada",
                    difficulty: 'medium'
                })
            });
            const genData = await genRes.json();

            if (!genData.days || genData.days.length === 0) throw new Error("Sin respuesta de IA");

            const reviewDays = genData.days.map((d: any, i: number) => ({
                ...d,
                title: `Refuerzo: ${d.title || 'Misión ' + (i + 1)}`,
                type: 'guided_practice',
                isStudentMission: true,
                insertAfterDay: 1
            }));

            const saveRes = await fetch('/api/student-missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    worldId: targetWorld.id,
                    days: reviewDays,
                    replace: true
                })
            });

            if (saveRes.ok) {
                setActionMessageStatus(`✅ ¡Misión de repaso creada para ${selectedStudent.name}!`);
            } else {
                throw new Error("No se pudo guardar la misión");
            }
        } catch (err) {
            console.error(err);
            setActionMessageStatus("❌ Error al generar la misión por IA.");
        } finally {
            setAiGeneratingMission(false);
        }
    };

    // Exportar Reporte en PDF
    const handleDownloadPDFReport = () => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString("es-MX", { 
            year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" 
        });

        // Títulos y encabezado
        doc.setFontSize(20);
        doc.setTextColor(82, 37, 102); // Purple brand
        doc.setFont("helvetica", "bold");
        doc.text("Reporte de Desempeño y Avance Académico", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text(`Generado por AprendIA: ${dateStr}`, 14, 26);
        doc.text(`Salón: ${activeClassroom ? activeClassroom.emoji + " " + activeClassroom.name : "Todos los Salones"}`, 14, 32);
        doc.text(`Mapa Escolar: ${activeWorld ? activeWorld.title : "Todos los Proyectos"}`, 14, 38);

        // Resumen General
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text("Métricas del Grupo", 14, 48);

        autoTable(doc, {
            startY: 52,
            head: [['Indicador de Desempeño', 'Porcentaje Promedio']],
            body: [
                ['Avance del Mapa (Outer Ring)', `${groupMetrics.progress}%`],
                ['Promedio Académico (Middle Ring)', `${(groupMetrics.academic / 10).toFixed(1)} / 10 (${groupMetrics.academic}%)`],
                ['Responsabilidad / Entrega (Inner Ring)', `${groupMetrics.submission}%`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [82, 37, 102] }
        });

        // Tabla de alumnos
        doc.setFontSize(14);
        doc.text("Resultados por Alumno", 14, (doc as any).lastAutoTable.finalY + 12);

        const tableBody = filteredStudents.map(st => {
            const assigned = getStudentAssignedWorlds(st);
            const progressPct = selectedWorldId === "all" 
                ? getStudentOverallProgress(st.id, assigned)
                : getStudentWorldProgress(st.id, activeWorld!);

            const academicGrade = (getStudentAcademicAverage(st, selectedWorldId) / 10).toFixed(1);
            const submissionRate = getStudentSubmissionRate(st.id, selectedWorldId === "all" ? assigned : [activeWorld!]);

            let alertText = "Buen Ritmo";
            if (progressPct < 30) alertText = "Alerta Académica";
            else if (progressPct < 70) alertText = "Requiere Práctica";

            return [
                st.name,
                `${progressPct}%`,
                `${academicGrade} / 10`,
                `${submissionRate}%`,
                st.xp,
                st.gems,
                alertText
            ];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 16,
            head: [['Alumno', 'Avance Mapa', 'Calificación', 'Entrega Tareas', 'XP', 'Gemas', 'Estado']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [122, 58, 142] }
        });

        doc.save(`AprendIA_Reporte_Desempeno_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const [bulkReportWorldId, setBulkReportWorldId] = useState("global");
    const [isGeneratingTeacherBulk, setIsGeneratingTeacherBulk] = useState(false);
    const [isGeneratingParentBulk, setIsGeneratingParentBulk] = useState(false);

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

    const handleGenerateTeacherBulkReport = async () => {
        const visibleStudents = students.filter(s => selectedClassroomId === "all" || s.classroomId === selectedClassroomId);
        if (visibleStudents.length === 0) { alert('No hay alumnos en este salón.'); return; }
        setIsGeneratingTeacherBulk(true);
        try {
            const worldFilter = bulkReportWorldId === 'global' ? null : bulkReportWorldId;
            const items = await Promise.all(visibleStudents.map(async (st) => {
                const assigned = getStudentAssignedWorlds(st);
                const prog = getStudentOverallProgress(st.id, assigned);
                try {
                    const res = await fetch('/api/ai/generate-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ studentId: st.id, studentName: st.name, reportType: 'teacher', worldFilter })
                    });
                    const data = await res.json();
                    const wTitle = worldFilter ? worlds.find(w => w.id === worldFilter)?.title : undefined;
                    return { studentName: st.name, xp: st.xp || 0, gems: st.gems || 0, progress: Math.round(prog), aiText: data.report || '', worldTitle: wTitle };
                } catch {
                    return { studentName: st.name, xp: st.xp || 0, gems: st.gems || 0, progress: Math.round(prog), aiText: 'No disponible' };
                }
            }));
            const clsLabel = selectedClassroomId === "all" ? "Todos los Alumnos" : (classrooms.find(c => c.id === selectedClassroomId)?.name || 'Salón');
            const scopeLabel = bulkReportWorldId === 'global' ? clsLabel : `${clsLabel} — ${worlds.find(w => w.id === bulkReportWorldId)?.title}`;
            openReportWindow('teacher', scopeLabel, items);
        } finally {
            setIsGeneratingTeacherBulk(false);
        }
    };

    const handleGenerateParentBulkReport = async () => {
        const visibleStudents = students.filter(s => selectedClassroomId === "all" || s.classroomId === selectedClassroomId);
        if (visibleStudents.length === 0) { alert('No hay alumnos en este salón.'); return; }
        setIsGeneratingParentBulk(true);
        try {
            const worldFilter = bulkReportWorldId === 'global' ? null : bulkReportWorldId;
            const items = await Promise.all(visibleStudents.map(async (st) => {
                const assigned = getStudentAssignedWorlds(st);
                const prog = getStudentOverallProgress(st.id, assigned);
                try {
                    const res = await fetch('/api/ai/generate-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ studentId: st.id, studentName: st.name, reportType: 'parent', worldFilter })
                    });
                    const data = await res.json();
                    const wTitle = worldFilter ? worlds.find(w => w.id === worldFilter)?.title : undefined;
                    return { studentName: st.name, xp: st.xp || 0, gems: st.gems || 0, progress: Math.round(prog), aiText: Array.isArray(data.paragraphs) ? data.paragraphs.join('\n\n') : (data.report || ''), worldTitle: wTitle, homeActivity: data.homeActivity };
                } catch {
                    return { studentName: st.name, xp: st.xp || 0, gems: st.gems || 0, progress: Math.round(prog), aiText: 'No disponible' };
                }
            }));
            const clsLabel = selectedClassroomId === "all" ? "Todos los Alumnos" : (classrooms.find(c => c.id === selectedClassroomId)?.name || 'Salón');
            const scopeLabel = bulkReportWorldId === 'global' ? clsLabel : `${clsLabel} — ${worlds.find(w => w.id === bulkReportWorldId)?.title}`;
            openReportWindow('parent', scopeLabel, items);
        } finally {
            setIsGeneratingParentBulk(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24 text-[#1c3a60]">
            {/* SECCIÓN PRINCIPAL: PANEL DE CONTROL, FILTROS Y MÉTRICAS GRUPALES UNIFICADAS */}
            <div className="relative overflow-hidden bg-white/70 backdrop-blur-md border border-[#cbe0f6] shadow-md rounded-[2.5rem] p-6 sm:p-8 space-y-6 text-[#1c3a60]">
                {/* Glow decorativo de fondo */}
                <div className="absolute right-0 top-0 w-[300px] h-[300px] bg-[#cbe0f6]/20 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute left-0 bottom-0 w-[200px] h-[200px] bg-[#f0f5fb]/20 blur-[80px] rounded-full pointer-events-none" />

                {/* 1. Fila de Encabezado: Título y Acciones Unificadas (Carga, Alumnos, PDF, Reportes AI) */}
                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-[#f0f5fb]">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#346297] animate-pulse" />
                        <h2 className="text-xs font-black text-[#1c3a60] uppercase tracking-widest">Panel de Control de Aula</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
                        {/* Acciones principales de aula */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button 
                                onClick={onOpenBulkModal}
                                className="flex items-center gap-1.5 bg-white hover:bg-[#f0f5fb] text-[#346297] border border-[#cbe0f6] px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm cursor-pointer"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                Carga Masiva
                            </button>
                            <button 
                                onClick={onOpenAddStudent}
                                className="flex items-center gap-1.5 bg-[#1c3a60] hover:bg-[#254d7d] text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm cursor-pointer"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Nuevo Alumno
                            </button>
                            <button 
                                onClick={handleDownloadPDFReport}
                                className="flex items-center gap-1.5 bg-[#f0f5fb] hover:bg-[#cbe0f6] text-[#346297] px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-[#cbe0f6] cursor-pointer"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                PDF
                            </button>
                        </div>

                        {/* Divisor vertical */}
                        <div className="hidden xl:block w-px h-6 bg-[#cbe0f6]" />

                        {/* Reportes AI Grupal */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1 mr-1">
                                <BrainCircuit className="w-3.5 h-3.5 text-[#346297]" />
                                <span className="text-[9px] font-black text-[#73a4db] uppercase tracking-wider">Reportes IA:</span>
                            </div>
                            <select
                                value={bulkReportWorldId}
                                onChange={e => setBulkReportWorldId(e.target.value)}
                                className="px-2.5 py-2 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-[9px] font-black uppercase tracking-widest text-[#346297] focus:outline-none min-w-[130px] truncate"
                            >
                                <option value="global">🌐 Todos los Proyectos</option>
                                {worlds.map(w => (
                                    <option key={w.id} value={w.id}>🗺️ {w.title}</option>
                                ))}
                            </select>
                            <button
                                disabled={isGeneratingTeacherBulk || isGeneratingParentBulk}
                                onClick={handleGenerateTeacherBulkReport}
                                className="px-3 py-2 bg-white text-[#1c3a60] border border-[#cbe0f6] hover:border-[#73a4db] rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
                            >
                                {isGeneratingTeacherBulk ? 'Generando...' : 'Reporte Docente'}
                            </button>
                            <button
                                disabled={isGeneratingTeacherBulk || isGeneratingParentBulk}
                                onClick={handleGenerateParentBulkReport}
                                className="px-3 py-2 bg-white text-[#346297] border border-[#cbe0f6] hover:border-[#73a4db] rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
                            >
                                {isGeneratingParentBulk ? 'Generando...' : 'Reporte Padres'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Fila de Filtros y Búsqueda (Directamente en la sección) */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Salón de Clases */}
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[8px] font-black uppercase tracking-wider text-[#73a4db]">Salón de Clases</label>
                            <div className="flex gap-1.5">
                                <button onClick={onOpenAddClassroom} className="text-[#73a4db] hover:text-[#1c3a60] cursor-pointer" title="Nuevo Salón">
                                    <Plus className="w-2.5 h-2.5" />
                                </button>
                                {selectedClassroomId !== "all" && (
                                    <>
                                        <button 
                                            onClick={() => {
                                                const cls = classrooms.find(c => c.id === selectedClassroomId);
                                                if (cls) onEditClassroom(cls);
                                            }} 
                                            className="text-[#73a4db] hover:text-[#1c3a60] cursor-pointer" 
                                            title="Editar Salón"
                                        >
                                            <Pencil className="w-2.5 h-2.5" />
                                        </button>
                                        <button onClick={() => onDeleteClassroom(selectedClassroomId)} className="text-[#73a4db] hover:text-rose-500 cursor-pointer" title="Eliminar Salón">
                                            <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#73a4db]" />
                            <select
                                value={selectedClassroomId}
                                onChange={(e) => setSelectedClassroomId(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#346297] focus:outline-none truncate"
                            >
                                <option value="all">🏫 Todos los Salones</option>
                                {classrooms.map(c => (
                                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Proyecto / Mapa Activo */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black uppercase tracking-wider text-[#73a4db] px-1">Proyecto / Mapa Activo</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#73a4db]" />
                            <select
                                value={selectedWorldId}
                                onChange={(e) => setSelectedWorldId(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#346297] focus:outline-none truncate"
                            >
                                <option value="all">🌐 Todos los Proyectos</option>
                                {worlds.map(w => (
                                    <option key={w.id} value={w.id}>🗺️ {w.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Buscar Alumno */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black uppercase tracking-wider text-[#73a4db] px-1">Buscar Alumno</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#73a4db]" />
                            <input
                                type="text"
                                placeholder="Nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-[10px] font-bold text-[#1c3a60] placeholder-[#73a4db] focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Estado de Alerta */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black uppercase tracking-wider text-[#73a4db] px-1">Estado de Alerta</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#73a4db]" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#346297] focus:outline-none"
                            >
                                <option value="all">🚦 Todos los Alumnos</option>
                                <option value="alert">🚨 Alerta Académica (&lt;30%)</option>
                                <option value="practice">⚠️ Requiere Práctica (30%-70%)</option>
                                <option value="good">✅ Buen Ritmo (&gt;70%)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Panel de Métricas Generales del Salón con Anillos Gigantes */}
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-14 pt-6 border-t border-[#f0f5fb]">
                    {/* Anillos de Actividad del Grupo (El Héroe Visual - ¡GIGANTE!) */}
                    <div className="relative shrink-0 flex items-center justify-center bg-[#f0f5fb] border border-[#cbe0f6] p-8 rounded-full shadow-sm transition-all hover:scale-105">
                        <ActivityRings 
                            outer={groupMetrics.progress} 
                            middle={groupMetrics.academic} 
                            inner={groupMetrics.submission} 
                            size={250}
                            showLabel={true}
                        />
                    </div>

                    {/* Leyendas y Métricas del Grupo */}
                    <div className="flex-1 space-y-6 w-full">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#73a4db]">Métricas Generales de Aula</span>
                            <h3 className="text-2xl font-black text-[#1c3a60] tracking-tight leading-none mt-1.5">Desempeño Promedio del Grupo</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Avance de Mapas */}
                            <div className="flex items-center gap-3 p-4 bg-white border border-[#cbe0f6] rounded-2xl hover:bg-[#f0f5fb]/50 transition-all shadow-sm">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#346297] shrink-0 shadow-sm" />
                                <div>
                                    <h4 className="text-[9px] font-black uppercase tracking-wider text-[#346297]">Avance de Mapas</h4>
                                    <p className="text-xl font-black text-[#1c3a60] tracking-tight leading-none mt-1">{groupMetrics.progress}%</p>
                                </div>
                            </div>

                            {/* Promedio Académico */}
                            <div className="flex items-center gap-3 p-4 bg-white border border-[#cbe0f6] rounded-2xl hover:bg-[#f0f5fb]/50 transition-all shadow-sm">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#73a4db] shrink-0 shadow-sm" />
                                <div>
                                    <h4 className="text-[9px] font-black uppercase tracking-wider text-[#346297]">Promedio Académico</h4>
                                    <p className="text-xl font-black text-[#1c3a60] tracking-tight leading-none mt-1">{(groupMetrics.academic / 10).toFixed(1)} / 10</p>
                                </div>
                            </div>

                            {/* Tasa de Entrega */}
                            <div className="flex items-center gap-3 p-4 bg-white border border-[#cbe0f6] rounded-2xl hover:bg-[#f0f5fb]/50 transition-all shadow-sm">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#60A5FA] shrink-0 shadow-sm" />
                                <div>
                                    <h4 className="text-[9px] font-black uppercase tracking-wider text-[#346297]">Tasa de Entrega</h4>
                                    <p className="text-xl font-black text-[#1c3a60] tracking-tight leading-none mt-1">{groupMetrics.submission}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Resumen de Alertas en Grupo */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-[#cbe0f6]">
                            {needsAttentionCount > 0 && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{needsAttentionCount} Alumnos en Alerta</span>
                                </div>
                            )}
                            {lagTaskCount > 0 && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{lagTaskCount} con baja entrega y altas notas</span>
                                </div>
                            )}
                            {needsAttentionCount === 0 && lagTaskCount === 0 && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Grupo avanza a buen ritmo</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTADO DE ESTUDIANTES (GRID DE TARJETAS PREMIUM) */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black tracking-tight text-[#1c3a60]">Alumnos del Salón ({filteredStudents.length})</h3>
                    <span className="text-[10px] font-black uppercase text-[#73a4db] tracking-wider bg-white px-3 py-1 border border-[#cbe0f6] rounded-full">
                        Semáforo Académico Activo
                    </span>
                </div>

                {filteredStudents.length === 0 ? (
                    <div className="bg-white p-16 border-2 border-dashed border-[#cbe0f6] rounded-[2rem] text-center">
                        <div className="text-5xl mb-4">🔍</div>
                        <p className="font-black text-lg text-[#1c3a60]">No se encontraron alumnos</p>
                        <p className="text-xs text-[#73a4db] mt-1 font-bold">Verifica tus filtros o términos de búsqueda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStudents.map(student => {
                            const studentWorlds = getStudentAssignedWorlds(student);
                            const outerVal = selectedWorldId === "all" 
                                ? getStudentOverallProgress(student.id, studentWorlds)
                                : getStudentWorldProgress(student.id, activeWorld!);
                            const middleVal = getStudentAcademicAverage(student, selectedWorldId);
                            const innerVal = getStudentSubmissionRate(student.id, selectedWorldId === "all" ? studentWorlds : [activeWorld!]);

                            // Determinar Semáforo
                            let statusBadgeColor = "bg-emerald-500 text-white";
                            let statusLabel = "Buen Ritmo";
                            if (outerVal < 30) {
                                statusBadgeColor = "bg-rose-500 text-white";
                                statusLabel = "Alerta Académica";
                            } else if (outerVal < 70) {
                                statusBadgeColor = "bg-amber-500 text-white";
                                statusLabel = "Requiere Práctica";
                            }

                            return (
                                <button
                                    key={student.id}
                                    onClick={() => {
                                        setAiReport(null);
                                        setProfileScopeWorldId("global");
                                        setSelectedStudent(student);
                                        setShowStudentModal(true);
                                    }}
                                    className="group text-left bg-white hover:bg-slate-50 border border-[#cbe0f6] hover:border-[#73a4db] p-5 rounded-[2rem] transition-all duration-300 shadow-sm hover:shadow-xl flex items-center justify-between gap-6 cursor-pointer active:scale-98"
                                >
                                    <div className="flex-1 space-y-4 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-[#f0f5fb] group-hover:bg-[#cbe0f6] rounded-full flex items-center justify-center text-2xl shrink-0 transition-colors shadow-inner border border-[#cbe0f6]">
                                                {student.avatar || "🧑🏻"}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-base truncate tracking-tight text-[#1c3a60]">{student.name}</h4>
                                                <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 mt-1 rounded-md ${statusBadgeColor}`}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[10px] text-[#73a4db] font-bold">
                                                <span>Avance:</span>
                                                <span className="font-black text-[#1c3a60]">{outerVal}%</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-[#73a4db] font-bold">
                                                <span>Calificación:</span>
                                                <span className="font-black text-[#30D158]">{(middleVal / 10).toFixed(1)}/10</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-[#73a4db] font-bold">
                                                <span>Entregas:</span>
                                                <span className="font-black text-[#BF5AF2]">{innerVal}%</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-[#f0f5fb] text-[9px] font-black uppercase tracking-widest text-[#73a4db] group-hover:text-[#1c3a60] transition-colors">
                                            <span>Ver Análisis</span>
                                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </div>

                                    {/* Mini Anillo Lateral */}
                                    <div className="shrink-0 bg-[#f0f5fb] p-3 rounded-2xl border border-[#cbe0f6] shadow-sm">
                                        <ActivityRings outer={outerVal} middle={middleVal} inner={innerVal} size={90} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* DETALLE INDIVIDUAL (MODAL PREMIUM DETALLADO) */}
            {showStudentModal && selectedStudent && (() => {
                const studentWorlds = getStudentAssignedWorlds(selectedStudent);
                const outerVal = selectedWorldId === "all" 
                    ? getStudentOverallProgress(selectedStudent.id, studentWorlds)
                    : getStudentWorldProgress(selectedStudent.id, activeWorld!);
                const middleVal = getStudentAcademicAverage(selectedStudent, selectedWorldId);
                const innerVal = getStudentSubmissionRate(selectedStudent.id, selectedWorldId === "all" ? studentWorlds : [activeWorld!]);

                const childEvidences = allEvidences[selectedStudent.id] || [];

                return (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] border border-[#cbe0f6] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200">
                            
                            {/* Cerrar */}
                            <button 
                                onClick={() => {
                                    setShowStudentModal(false);
                                    setActionMessageStatus("");
                                }}
                                className="absolute top-5 right-5 p-2 bg-[#f0f5fb] hover:bg-[#cbe0f6] text-[#73a4db] hover:text-[#1c3a60] rounded-full transition-all z-20 cursor-pointer active:scale-95"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* LATERAL DE ANILLOS Y RECOMPENSAS (LIGHT THEME) */}
                            <div className="md:w-1/3 bg-[#f0f5fb] text-[#1c3a60] p-8 flex flex-col items-center justify-between gap-8 shrink-0 rounded-t-[2.5rem] md:rounded-t-none md:rounded-l-[2.5rem] border-r border-[#cbe0f6]">
                                <div className="text-center w-full space-y-4">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl mx-auto shadow-sm border border-[#cbe0f6]">
                                        {selectedStudent.avatar || "🧑🏻"}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl tracking-tight leading-none text-[#1c3a60]">{selectedStudent.name}</h3>
                                        <p className="text-[10px] text-[#73a4db] font-black uppercase tracking-widest mt-1.5">Código: {selectedStudent.studentCode || "—"}</p>
                                    </div>
                                    {/* Botones de Edición y Eliminación */}
                                    <div className="flex justify-center gap-2 pt-2">
                                        <button 
                                            onClick={() => onEditStudent(selectedStudent)}
                                            className="flex items-center justify-center bg-white border border-[#cbe0f6] hover:border-[#73a4db] text-[#346297] p-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                                            title="Editar Alumno"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowStudentModal(false);
                                                onDeleteStudent(selectedStudent);
                                            }}
                                            className="flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 p-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                                            title="Eliminar Alumno"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="py-2">
                                    <ActivityRings outer={outerVal} middle={middleVal} inner={innerVal} size={170} showLabel={true} />
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex justify-between items-center text-xs p-3 bg-white border border-[#cbe0f6] rounded-xl shadow-sm">
                                        <span className="text-[#346297] font-black uppercase text-[9px] tracking-wider">Puntos XP</span>
                                        <span className="font-black text-amber-600 tabular-nums">{selectedStudent.xp || 0} XP</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs p-3 bg-white border border-[#cbe0f6] rounded-xl shadow-sm">
                                        <span className="text-[#346297] font-black uppercase text-[9px] tracking-wider">Monedas/Gemas</span>
                                        <span className="font-black text-emerald-600 tabular-nums">{selectedStudent.gems || 0} Gemas</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs p-3 bg-white border border-[#cbe0f6] rounded-xl shadow-sm">
                                        <span className="text-[#346297] font-black uppercase text-[9px] tracking-wider">Racha</span>
                                        <span className="font-black text-sky-600 tabular-nums">🔥 {selectedStudent.streak || 0} Días</span>
                                    </div>
                                </div>
                            </div>

                            {/* CONTENIDO PRINCIPAL (HISTORIAL Y ACCIONES) */}
                            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#73a4db]">Panel de Seguimiento</span>
                                    <h3 className="text-2xl font-black text-[#1c3a60] tracking-tight">Análisis Académico Detallado</h3>
                                </div>

                                {/* DESGLOSE DE MATERIAS Y PROGRESO */}
                                <div className="space-y-4">
                                    <h4 className="font-black text-xs uppercase tracking-wider text-[#346297] flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Desempeño por Proyecto
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {studentWorlds.map(w => {
                                            const wProgress = getStudentWorldProgress(selectedStudent.id, w);
                                            const wGradeObj = selectedStudent.projectGrades?.find(g => g.worldId === w.id);
                                            const wGrade = wGradeObj ? wGradeObj.grade : 7.0; // fallback standard

                                            return (
                                                <div key={w.id} className="p-4 bg-[#f0f5fb]/50 border border-[#cbe0f6] rounded-2xl space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <h5 className="font-black text-sm text-[#1c3a60] truncate pr-2">{w.title}</h5>
                                                        <span className="text-[10px] font-black bg-white px-2 py-0.5 border border-[#cbe0f6] rounded text-[#30D158]">
                                                            {wGrade.toFixed(1)}/10
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-[#73a4db] uppercase tracking-wider">
                                                            <span>Progreso:</span>
                                                            <span>{wProgress}%</span>
                                                        </div>
                                                        <div className="w-full bg-[#cbe0f6] h-2 rounded-full overflow-hidden">
                                                            <div className="bg-[#FF2D55] h-full rounded-full transition-all" style={{ width: `${wProgress}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* INTERVENCIONES Y RECOMENDACIÓN DE IA */}
                                <div className="p-5 bg-gradient-to-br from-[#1c3a60]/5 to-[#346297]/5 border border-[#cbe0f6] rounded-[2rem] space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-white rounded-xl border border-[#cbe0f6] text-[#346297]">
                                                <BrainCircuit className="w-5 h-5 animate-pulse" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm tracking-tight text-[#1c3a60]">Recomendación de AprendIA</h4>
                                                <p className="text-[9px] font-black text-[#73a4db] uppercase tracking-widest">Inteligencia Artificial Pedagógica</p>
                                            </div>
                                        </div>
                                        <select
                                            value={profileScopeWorldId}
                                            onChange={(e) => { setAiReport(null); setProfileScopeWorldId(e.target.value); }}
                                            className="px-3.5 py-2 bg-white border border-[#cbe0f6] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#346297] focus:outline-none w-full sm:w-auto"
                                        >
                                            <option value="global">🌐 General (Global)</option>
                                            {studentWorlds.map(w => (
                                                <option key={w.id} value={w.id}>🗺️ {w.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="border-t border-[#cbe0f6] pt-4">
                                        {aiReport ? (
                                            <div className="bg-white p-4 rounded-xl border border-[#cbe0f6] text-xs leading-relaxed text-[#1c3a60] max-h-60 overflow-y-auto font-medium prose prose-indigo w-full">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{aiReport}</ReactMarkdown>
                                            </div>
                                        ) : isGeneratingReport ? (
                                            <div className="flex items-center gap-3 p-4">
                                                <div className="animate-spin h-5 w-5 border-2 border-[#1c3a60] border-t-transparent rounded-full"></div>
                                                <span className="text-[#1c3a60] font-medium text-xs">Generando reporte con IA...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-xs leading-relaxed text-[#1c3a60] font-medium bg-white/60 p-4 border border-white rounded-xl mb-3">
                                                    {outerVal < 30 ? (
                                                        `🚨 Se detecta que ${selectedStudent.name} tiene un avance muy bajo (${outerVal}%). Muestra bloqueos en los niveles básicos. Se sugiere retroceder a la teoría e iniciar una misión de repaso personalizada de conceptos clave.`
                                                    ) : innerVal < 50 ? (
                                                        `⚠️ El alumno comprende el tema (promedio académico de ${(middleVal / 10).toFixed(1)}/10) pero muestra baja responsabilidad en la entrega de tareas (${innerVal}%). Se sugiere enviar una felicitación para incentivar su entrega diaria.`
                                                    ) : (
                                                        `✨ ${selectedStudent.name} avanza a excelente ritmo en el aula virtual. Mantiene una consistencia destacable. Se sugiere promoverlo como monitor del grupo para apoyar a otros compañeros.`
                                                    )}
                                                </p>
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            setIsGeneratingReport(true);
                                                            try {
                                                                const payload = {
                                                                    studentId: selectedStudent.id,
                                                                    studentName: selectedStudent.name,
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
                                                        className="flex-1 bg-[#1c3a60] hover:bg-[#254d7d] text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                                                    >
                                                        <BrainCircuit className="w-4 h-4" /> Generar Reporte Docente
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setIsGeneratingReport(true);
                                                            try {
                                                                const res = await fetch('/api/ai/generate-report', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        studentId: selectedStudent.id,
                                                                        studentName: selectedStudent.name,
                                                                        reportType: 'parent',
                                                                        worldFilter: profileScopeWorldId === 'global' ? null : profileScopeWorldId
                                                                    })
                                                                });
                                                                const data = await res.json();
                                                                const scopeWorld = profileScopeWorldId !== 'global' ? worlds.find(w => w.id === profileScopeWorldId) : null;
                                                                openReportWindow('parent', selectedStudent.name || 'Alumno', [{
                                                                    studentName: selectedStudent.name || '',
                                                                    xp: selectedStudent.xp || 0,
                                                                    gems: selectedStudent.gems || 0,
                                                                    progress: Math.round(outerVal),
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
                                                        className="flex-1 bg-[#f0f5fb] hover:bg-[#cbe0f6] border border-[#cbe0f6] text-[#346297] px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                                                    >
                                                        <FileText className="w-4 h-4 text-[#2563EB]" /> Generar Reporte Padres
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <button
                                            onClick={handleCreateAiMission}
                                            disabled={aiGeneratingMission}
                                            className="flex items-center gap-2 bg-white text-[#1c3a60] border border-[#cbe0f6] hover:border-[#73a4db] px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Sparkles className="w-4 h-4 text-[#346297]" />
                                            {aiGeneratingMission ? "Generando..." : "Crear Misión de Refuerzo con IA"}
                                        </button>
                                    </div>
                                </div>

                                {/* ACCIONES RÁPIDAS (MENSAJE / GEMAS) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#f0f5fb]">
                                    {/* Entrega rápida de gemas */}
                                    <div className="space-y-3">
                                        <h4 className="font-black text-xs uppercase tracking-wider text-[#346297] flex items-center gap-2">
                                            <Award className="w-4 h-4" /> Entregar Recompensas (Gemas)
                                        </h4>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                value={quickGemsAmount}
                                                onChange={(e) => setQuickGemsAmount(parseInt(e.target.value) || 0)}
                                                className="w-20 px-3 py-2 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-xs font-bold text-[#1c3a60] focus:outline-none"
                                                min="1"
                                            />
                                            <button
                                                onClick={() => handleQuickAction("gems")}
                                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                Otorgar Recompensa
                                            </button>
                                        </div>
                                    </div>

                                    {/* Enviar Mensaje rápido */}
                                    <div className="space-y-3">
                                        <h4 className="font-black text-xs uppercase tracking-wider text-[#346297] flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" /> Enviar Aviso a Familia
                                        </h4>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Ej. ¡Excelente esfuerzo hoy!"
                                                value={quickMessage}
                                                onChange={(e) => setQuickMessage(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-[#f0f5fb] border border-[#cbe0f6] rounded-xl text-xs text-[#1c3a60] focus:outline-none placeholder-[#73a4db]"
                                            />
                                            <button
                                                onClick={() => handleQuickAction("message")}
                                                className="bg-[#1c3a60] hover:bg-[#254d7d] text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                Enviar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {actionMessageStatus && (
                                    <p className="text-center font-bold text-xs p-3 bg-[#f0f5fb] border border-[#cbe0f6] rounded-2xl text-[#346297] animate-fade-in">
                                        {actionMessageStatus}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
