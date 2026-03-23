"use client";

import React, { useState, useEffect } from "react";
import TeacherDashboard from "@/components/TeacherDashboard";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function TeacherPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && status === "unauthenticated") {
            router.push("/");
        }
    }, [mounted, status, router]);

    // Consistent loading for SSR + client
    if (!mounted || status === "loading") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-sky-600 font-bold text-xl">Inicializando Portal Docente...</div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    if (!session || (session.user as any)?.role !== 'TEACHER') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
                <p className="text-slate-600 mb-6">Solo los maestros pueden acceder a este panel.</p>
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold transition-colors"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <TeacherDashboard />
        </main>
    );
}
