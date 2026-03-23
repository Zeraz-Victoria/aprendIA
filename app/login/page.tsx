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
            <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
                <div className="animate-pulse text-sky-600 font-bold text-xl">Revisando credenciales...</div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return <StudentLogin />;
    }

    return null;
}
