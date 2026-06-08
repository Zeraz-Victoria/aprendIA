"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { School, Users, ShieldAlert, Plus, Power, Map, Trash2, MessageSquare, CalendarDays, AlertTriangle } from "lucide-react";

export default function SuperadminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTeacherName, setNewTeacherName] = useState("");
    const [newTeacherPassword, setNewTeacherPassword] = useState("");
    const [newTeacherPlan, setNewTeacherPlan] = useState("BASIC");
    const [newTeacherPaymentDay, setNewTeacherPaymentDay] = useState(1);
    const [isCreating, setIsCreating] = useState(false);

    // Edit Teacher State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<any>(null);
    const [editTeacherName, setEditTeacherName] = useState("");
    const [editTeacherPassword, setEditTeacherPassword] = useState("");
    const [editTeacherPaymentDay, setEditTeacherPaymentDay] = useState(1);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [selectedBreakdown, setSelectedBreakdown] = useState<any[]>([]);
    const [selectedSchoolName, setSelectedSchoolName] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            const role = (session?.user as any)?.role;
            if (role !== "SUPERADMIN") {
                router.push("/"); // Only superadmin allowed here
            } else {
                fetchTeachers();
            }
        }
    }, [status, session, router]);

    const fetchTeachers = async () => {
        try {
            const res = await fetch("/api/superadmin/teachers");
            if (res.ok) {
                const data = await res.json();
                setTeachers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeacherName.trim() || !newTeacherPassword.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch("/api/superadmin/teachers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name: newTeacherName, 
                    password: newTeacherPassword, 
                    plan: newTeacherPlan,
                    paymentDay: newTeacherPaymentDay
                })
            });

            if (res.ok) {
                setNewTeacherName("");
                setNewTeacherPassword("");
                setNewTeacherPaymentDay(1);
                fetchTeachers();
            } else {
                const err = await res.json();
                alert(err.error || "Error al crear maestro.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateSubscription = async (schoolId: string, plan: string, status: string) => {
        try {
            const res = await fetch("/api/superadmin/teachers", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId, subscriptionPlan: plan, subscriptionStatus: status })
            });
            if (res.ok) fetchTeachers();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingTeacher || (!editTeacherName.trim() && !editTeacherPassword.trim() && editTeacherPaymentDay === editingTeacher.paymentDay)) return;

        setIsSavingEdit(true);
        try {
            const res = await fetch("/api/superadmin/teachers", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    schoolId: editingTeacher.schoolId,
                    teacherId: editingTeacher.id,
                    newName: editTeacherName,
                    newPassword: editTeacherPassword,
                    paymentDay: editTeacherPaymentDay
                })
            });
            if (res.ok) {
                setShowEditModal(false);
                setEditingTeacher(null);
                fetchTeachers(); // Refresh list to reflect changes
            } else {
                alert("Error al guardar los cambios del maestro.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al maestro "${teacherName}"? Se borrarán TODOS sus datos (alumnos, grupos, mapas). Esta acción NO se puede deshacer.`)) return;

        try {
            const res = await fetch(`/api/superadmin/teachers?teacherId=${teacherId}`, {
                method: "DELETE"
            });
            if (res.ok) fetchTeachers();
            else alert("Error al eliminar el maestro.");
        } catch (error) {
            console.error(error);
        }
    };

    if (loading || status === "loading") {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-pulse text-emerald-400 font-bold">Cargando Panel...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="bg-emerald-600 p-1.5 sm:p-2 rounded-lg shrink-0">
                        <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-xl font-bold text-white leading-tight truncate">SaaS Portal</h1>
                        <p className="text-[10px] sm:text-xs text-emerald-300">Superadministrator</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => router.push('/superadmin/support')}
                        className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white transition-colors rounded-lg text-xs sm:text-sm font-bold border border-teal-500/30"
                    >
                        <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Buzón de Soporte</span>
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-slate-700 hover:bg-red-600/20 hover:text-red-400 transition-colors rounded-lg text-xs sm:text-sm font-medium"
                    >
                        <Power className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                    <h2 className="text-3xl font-bold">Maestros Registrados ({teachers.length})</h2>

                    <form onSubmit={handleCreateTeacher} className="flex flex-wrap gap-2 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre</label>
                            <input
                                type="text"
                                placeholder="Nombre..."
                                value={newTeacherName}
                                onChange={(e) => setNewTeacherName(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-40 text-white"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Contraseña</label>
                            <input
                                type="text"
                                placeholder="Contraseña..."
                                value={newTeacherPassword}
                                onChange={(e) => setNewTeacherPassword(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-28 text-white"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Plan</label>
                            <select
                                value={newTeacherPlan}
                                onChange={(e) => setNewTeacherPlan(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none w-44"
                            >
                                <option value="BASIC">Básico (1 mapa, 25 alumnos)</option>
                                <option value="INTERMEDIATE">Medio (5 mapas, 50 alumnos)</option>
                                <option value="PREMIUM">Premium (10 mapas, 80 alumnos)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Día de Pago</label>
                            <select
                                value={newTeacherPaymentDay}
                                onChange={(e) => setNewTeacherPaymentDay(parseInt(e.target.value))}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none w-24"
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <option key={day} value={day}>Día {day}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={!newTeacherName.trim() || !newTeacherPassword.trim() || isCreating}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            {isCreating ? "Creando..." : "Crear Maestro"}
                        </button>
                    </form>
                </div>

                {/* Grid */}
                {teachers.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                        <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-slate-400">No hay maestros registrados</h3>
                        <p className="text-sm text-slate-500 mt-2">Crea el primer maestro en el formulario de arriba.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-colors group">
                                <div className="flex items-baseline justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1" title={teacher.name}>
                                        {teacher.name}
                                    </h3>
                                </div>

                                {/* Creation Date & Expiry */}
                                {(() => {
                                    const created = new Date(teacher.createdAt);
                                    const now = new Date();
                                    const nextPayment = teacher.nextPaymentDate ? new Date(teacher.nextPaymentDate) : null;
                                    
                                    let daysRemaining = 0;
                                    let isExpiringSoon = false;
                                    let isWarning = false;
                                    let isExpired = false;
                                    
                                    if (nextPayment) {
                                        const diffTime = nextPayment.getTime() - now.getTime();
                                        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        isExpired = daysRemaining <= 0 || teacher.subscriptionStatus === 'SUSPENDED';
                                        isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0 && teacher.subscriptionStatus !== 'SUSPENDED';
                                        isWarning = daysRemaining <= 7 && daysRemaining > 3 && teacher.subscriptionStatus !== 'SUSPENDED';
                                    }

                                    return (
                                        <div className="mb-4 space-y-2">
                                            <div className="flex items-center justify-between text-xs text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="w-3.5 h-3.5" />
                                                    <span>Creado: <span className="text-slate-300 font-medium">{created.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                                                </div>
                                                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                    Corte: Día {teacher.paymentDay}
                                                </span>
                                            </div>
                                            
                                            {nextPayment && (
                                                <div className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg font-bold ${
                                                    isExpired ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                                                    isExpiringSoon ? 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse' :
                                                    isWarning ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                                                    'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                                                }`}>
                                                    {(isExpiringSoon || isExpired) && <AlertTriangle className="w-3.5 h-3.5" />}
                                                    <span>
                                                        {isExpired 
                                                            ? 'Suscripción Suspendida/Vencida' 
                                                            : daysRemaining === 0 
                                                                ? 'Vence HOY' 
                                                                : `Vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`
                                                        }
                                                    </span>
                                                    <span className="text-[10px] opacity-60 ml-auto">
                                                        {nextPayment.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="text-xs text-slate-500 mb-4 uppercase tracking-wider flex justify-between items-center">
                                    <span>ID: <span className="font-mono text-slate-400">{teacher.id}</span></span>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${teacher.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {teacher.subscriptionStatus}
                                    </span>
                                </div>

                                <div className="mb-6 flex items-center justify-between gap-2">
                                    <select
                                        value={teacher.subscriptionPlan}
                                        onChange={(e) => handleUpdateSubscription(teacher.schoolId, e.target.value, teacher.subscriptionStatus)}
                                        className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 outline-none w-full"
                                    >
                                        <option value="BASIC">Básico (1 mapa, 25 alumnos)</option>
                                        <option value="INTERMEDIATE">Medio (5 mapas, 50 alumnos)</option>
                                        <option value="PREMIUM">Premium (10 mapas, 80 alumnos)</option>
                                    </select>

                                    <button
                                        onClick={() => handleUpdateSubscription(teacher.schoolId, teacher.subscriptionPlan, teacher.subscriptionStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                                        className={`px-3 py-1 text-xs rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${teacher.subscriptionStatus === 'ACTIVE' ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                    >
                                        {teacher.subscriptionStatus === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-amber-400">
                                            {teacher.classroomsCount}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                                            <School className="w-3 h-3" /> Grupos
                                        </div>
                                    </div>
                                    <div className="text-center border-l border-slate-700">
                                        <div className="text-2xl font-black text-emerald-400">
                                            {teacher.studentsCount}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                                            <Users className="w-3 h-3" /> Alumnos
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => {
                                            setSelectedBreakdown(teacher.apiCallsBreakdown || []);
                                            setSelectedSchoolName(teacher.name);
                                            setShowBreakdown(true);
                                        }}
                                        className="text-center border-t border-slate-700 pt-4 col-span-2 cursor-pointer hover:bg-slate-700/30 rounded-lg transition-colors group/api"
                                    >
                                        <div className="text-xl font-black text-emerald-400 group-hover/api:scale-110 transition-transform">
                                            {teacher.apiCalls || 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5 uppercase tracking-tighter group-hover/api:text-emerald-400">
                                            Llamadas API (Gasto Est: ${((teacher.apiCalls || 0) * 0.002).toFixed(2)})
                                            <span className="text-[8px] bg-emerald-500/10 px-1 rounded ml-1">Ver Detalle</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingTeacher(teacher);
                                            setEditTeacherName(teacher.name);
                                            setEditTeacherPassword("");
                                            setEditTeacherPaymentDay(teacher.paymentDay || 1);
                                            setShowEditModal(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors cursor-pointer"
                                    >
                                        <School className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                        className="flex-[0.4] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/15 transition-colors cursor-pointer"
                                        title="Eliminar Maestro"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Edit Teacher Modal */}
                {showEditModal && editingTeacher && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                        <div className="bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up border border-slate-700">
                            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                                    <School className="w-5 h-5 text-emerald-400" /> Editar Maestro
                                </h3>
                                <button onClick={() => { setShowEditModal(false); setEditingTeacher(null); }} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                    <span className="text-xl font-bold rounded-full w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600">×</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={editTeacherName}
                                        onChange={(e) => setEditTeacherName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Nombre del maestro..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1 flex justify-between">
                                        Contraseña
                                        <span className="text-xs font-normal text-slate-500">Opcional: déjalo vacío para no cambiarla</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editTeacherPassword}
                                        onChange={(e) => setEditTeacherPassword(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Nueva contraseña..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Día de Corte de Pago</label>
                                    <select
                                        value={editTeacherPaymentDay}
                                        onChange={(e) => setEditTeacherPaymentDay(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <option key={day} value={day}>Día {day} de cada mes</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingEdit || (!editTeacherName.trim() && !editTeacherPassword.trim() && editTeacherPaymentDay === editingTeacher.paymentDay)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 mt-4 cursor-pointer"
                                >
                                    {isSavingEdit ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* API Breakdown Modal */}
                {showBreakdown && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                        <div className="bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up border border-slate-700 flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                <div>
                                    <h3 className="font-bold text-xl text-white flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-emerald-400" /> Detalle de Consumo
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">{selectedSchoolName}</p>
                                </div>
                                <button onClick={() => setShowBreakdown(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                    <span className="text-xl font-bold rounded-full w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 transition-colors">×</span>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                {selectedBreakdown.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-slate-500 italic">No hay llamadas registradas aún.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedBreakdown.map((user: any) => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${user.role === 'TEACHER' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                        {user.role === 'TEACHER' ? '👨‍🏫' : '👤'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white line-clamp-1">{user.name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                    <p className="text-sm font-black text-emerald-400">{user.apiCalls}</p>
                                                    <p className="text-[9px] text-emerald-500/70 uppercase">Llamadas</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-slate-900/30 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
                                <span>Total mostrado: {selectedBreakdown.length} usuarios</span>
                                <span className="font-mono">Costo Est. Total: ${(selectedBreakdown.reduce((acc, u) => acc + u.apiCalls, 0) * 0.002).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
