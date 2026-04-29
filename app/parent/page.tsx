"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import ClassStoryFeed from "@/components/ClassStoryFeed";
import { LogOut, Star } from "lucide-react";

export default function ParentPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [children, setChildren] = useState<any[]>([]);
    const [activeChild, setActiveChild] = useState<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/");
    }, [status, router]);

    useEffect(() => {
        if (session && (session.user as any)?.role === 'PARENT') {
            fetch("/api/parent/children")
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setChildren(data);
                        if (data.length > 0) setActiveChild(data[0]);
                    }
                });
        }
    }, [session]);

    if (status === "loading") return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse text-[#AD74C3] font-bold">Cargando Portal...</div>;

    if (!session || (session.user as any)?.role !== 'PARENT') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold text-rose-600 mb-4">Acceso Denegado</h1>
                <p className="text-[#522566] font-medium mb-6">Solo los padres/tutores pueden acceder a este panel.</p>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="bg-[#522566] text-white px-8 py-3 font-bold rounded-xl shadow-lg active:scale-95 transition-all">Volver al Inicio</button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 text-[#522566] font-medium">
            {/* Header */}
            <header className="bg-white border-b border-[#EADFF0] p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#F8EDFB] rounded-xl flex items-center justify-center text-[#AD74C3]">👨‍👩‍👧‍👦</div>
                    <h1 className="text-lg font-black uppercase tracking-widest text-[#522566]">Portal Familia</h1>
                </div>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="text-[#AD74C3] hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar (Hijos) */}
                <div className="md:col-span-1 space-y-4">
                    <h2 className="font-bold text-lg text-[#522566]">Mis Estudiantes</h2>
                    {children.length === 0 ? (
                        <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-[#EADFF0] text-sm text-[#AD74C3] font-medium text-center">
                            No tienes hijos vinculados a tu cuenta todavía. Pide el código de vinculación al profesor.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {children.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => setActiveChild(child)}
                                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 ${activeChild?.id === child.id ? 'bg-[#522566] border-[#AD74C3] text-white shadow-xl scale-[1.02]' : 'bg-white border-[#EADFF0] hover:border-[#AD74C3]'}`}
                                >
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="w-14 h-14 shrink-0 bg-[#F8EDFB] rounded-full flex items-center justify-center text-3xl border-2 border-white/20 shadow-inner">
                                            {child.avatar || '🧑🏻'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-lg truncate w-full">{child.name}</h3>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Star className={`w-3.5 h-3.5 fill-current ${activeChild?.id === child.id ? 'text-amber-400' : 'text-amber-500'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${activeChild?.id === child.id ? 'text-[#EADFF0]' : 'text-[#AD74C3]'}`}>{child.gems || 0} Pts</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-full py-2 rounded-xl text-center text-[9px] font-black uppercase tracking-widest ${activeChild?.id === child.id ? 'bg-white/10 text-white' : 'bg-[#F8EDFB] text-[#7A3A8E]'}`}>
                                        Ver Historia de Clase
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Feed */}
                <div className="md:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg text-[#522566]">Historia de la Clase</h2>
                        {activeChild && (
                            <span className="bg-[#EADFF0] text-[#7A3A8E] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                                Mostrando clase de: {activeChild.name}
                            </span>
                        )}
                    </div>
                    
                    {activeChild ? (
                        <div className="bg-slate-50/50 rounded-3xl min-h-[60vh]">
                            <ClassStoryFeed classroomId={activeChild.classroomId || 'global'} isTeacher={false} />
                        </div>
                    ) : (
                        <div className="bg-white p-12 text-center rounded-3xl border-2 border-dashed border-[#EADFF0]">
                            <div className="text-6xl mb-4 opacity-50 grayscale">📚</div>
                            <p className="text-[#522566] font-bold text-lg">Selecciona un estudiante</p>
                            <p className="text-[#AD74C3] text-sm mt-2">Para ver la actividad, fotos y novedades de su salón de clases.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
