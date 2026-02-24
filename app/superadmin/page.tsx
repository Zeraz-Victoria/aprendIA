"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { School, Users, ShieldAlert, Plus, Power, Map } from "lucide-react";

export default function SuperadminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSchoolName, setNewSchoolName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            const role = (session?.user as any)?.role;
            if (role !== "SUPERADMIN") {
                router.push("/"); // Only superadmin allowed here
            } else {
                fetchSchools();
            }
        }
    }, [status, session, router]);

    const fetchSchools = async () => {
        try {
            const res = await fetch("/api/superadmin/schools");
            if (res.ok) {
                const data = await res.json();
                setSchools(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSchoolName.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch("/api/superadmin/schools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSchoolName })
            });

            if (res.ok) {
                setNewSchoolName("");
                fetchSchools();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
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
                    <h2 className="text-3xl font-bold">Escuelas Registradas ({schools.length})</h2>

                    <form onSubmit={handleCreateSchool} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nombre de la nueva escuela..."
                            value={newSchoolName}
                            onChange={(e) => setNewSchoolName(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                        />
                        <button
                            type="submit"
                            disabled={!newSchoolName.trim() || isCreating}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {isCreating ? "Creando..." : "Crear"}
                        </button>
                    </form>
                </div>

                {/* Grid */}
                {schools.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                        <School className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-slate-400">No hay escuelas registradas</h3>
                        <p className="text-sm text-slate-500 mt-2">Crea la primera escuela en el formulario de arriba.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schools.map(school => (
                            <div key={school.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-indigo-500/50 transition-colors group">
                                <div className="flex items-baseline justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1" title={school.name}>
                                        {school.name}
                                    </h3>
                                </div>
                                <div className="text-xs text-slate-500 mb-6 uppercase tracking-wider">
                                    ID: <span className="font-mono text-slate-400">{school.id}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 border-t border-slate-700 pt-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-indigo-400">
                                            {school._count.users}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                                            <Users className="w-3 h-3" /> Profes
                                        </div>
                                    </div>
                                    <div className="text-center border-l border-slate-700">
                                        <div className="text-2xl font-black text-amber-400">
                                            {school._count.classrooms}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                                            <School className="w-3 h-3" /> Grupos
                                        </div>
                                    </div>
                                    <div className="text-center border-l border-slate-700">
                                        <div className="text-2xl font-black text-emerald-400">
                                            {school._count.worlds}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                                            <Map className="w-3 h-3" /> Mapas
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
