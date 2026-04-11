"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import StudentLogin from "@/components/StudentLogin";

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            const role = (session.user as any)?.role;
            if (role === 'TEACHER') {
                router.push("/teacher");
            } else {
                router.push("/student");
            }
        }
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div style={{ background: '#F8EDFB' }} className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-[#EADFF0] border-t-[#7A3A8E] animate-spin" />
                    <p style={{ color: '#7A3A8E' }} className="font-semibold text-sm">Revisando credenciales...</p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return <StudentLogin />;
    }

    return null;
}
