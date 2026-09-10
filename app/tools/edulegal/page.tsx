"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import EduLegalApp from "@/components/edulegal/App";

import UserAccountMenu from "@/components/UserAccountMenu";
import { ArrowLeft } from "lucide-react";

export default function EduLegalPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && status === "unauthenticated") {
            router.push("/");
        }
    }, [mounted, status, router]);

    if (!mounted || status === "loading") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-green-600 font-bold text-xl">
                    Cargando EduLegal...
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-50 shadow-xs">
                <button
                    type="button"
                    onClick={() => router.push("/teacher")}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al Panel Docente
                </button>
                <UserAccountMenu />
            </header>
            <div className="flex-1">
                <EduLegalApp onBack={() => router.push("/teacher")} />
            </div>
        </div>
    );
}
