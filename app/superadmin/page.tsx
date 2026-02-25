"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { School, Users, ShieldAlert, Plus, Power, Map } from "lucide-react";

export default function SuperadminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTeacherName, setNewTeacherName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

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
        if (!newTeacherName.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch("/api/superadmin/teachers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTeacherName })
            });

            if (res.ok) {
                setNewTeacherName("");
                fetchTeachers();
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

    if (loading || status === "loading") {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-pulse text-indigo-400 font-bold">Cargando Panel...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <ShieldAlert className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-tight">SaaS Portal</h1>
                        <p className="text-xs text-indigo-300">Superadministrator</p>
                    </div>
                </div>

                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-red-600/20 hover:text-red-400 transition-colors rounded-lg text-sm font-medium"
                >
                    <Power className="w-4 h-4" /> Cerrar Sesión
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold">Maestros Registrados ({teachers.length})</h2>

                    <form onSubmit={handleCreateTeacher} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nombre del nuevo maestro..."
                            value={newTeacherName}
                            onChange={(e) => setNewTeacherName(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 text-white"
                        />
                        <button
                            type="submit"
                            disabled={!newTeacherName.trim() || isCreating}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
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
                            <div key={teacher.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-indigo-500/50 transition-colors group">
                                <div className="flex items-baseline justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1" title={teacher.name}>
                                        {teacher.name}
                                    </h3>
                                </div>
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
                                        <option value="BASIC">Básico (1 Mapa)</option>
                                        <option value="INTERMEDIATE">Medio (5 Mapas)</option>
                                        <option value="PREMIUM">Premium (10 Mapas)</option>
                                    </select>
                                    
                                    <button
                                        onClick={() => handleUpdateSubscription(teacher.schoolId, teacher.subscriptionPlan, teacher.subscriptionStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                                        className={`px-3 py-1 text-xs rounded font-bold transition-colors whitespace-nowrap ${teacher.subscriptionStatus === 'ACTIVE' ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
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
                                        <div className="text-2xl font-black text-indigo-400">
                                            {teacher.studentsCount}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                                            <Users className="w-3 h-3" /> Alumnos
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
