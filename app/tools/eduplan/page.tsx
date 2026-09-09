"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import EduPlanApp from "@/components/eduplan/App";

export default function EduPlanPage() {
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
                <div className="animate-pulse text-purple-600 font-bold text-xl">
                    Cargando EduPlan AI...
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <EduPlanApp onBack={() => router.push("/teacher")} />
    );
}
