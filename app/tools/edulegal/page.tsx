"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import EduLegalApp from "@/components/edulegal/App";

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
        <EduLegalApp onBack={() => router.push("/teacher")} />
    );
}
