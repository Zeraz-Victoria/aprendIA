import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        // Alumnos solo pueden ver sus propios logros
        const sessionUserId = (session.user as any)?.id;
        const role = (session.user as any)?.role;
        if (role === 'STUDENT' && sessionUserId !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const userAchievements = await prisma.userAchievement.findMany({
            where: { studentId },
            include: { achievement: true },
            orderBy: { earnedAt: "desc" }
        });

        return NextResponse.json(userAchievements.map(ua => ({
            ...ua.achievement,
            earnedAt: ua.earnedAt
        })));
    } catch (error) {
        console.error("Error fetching achievements:", error);
        return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 });
    }
}
