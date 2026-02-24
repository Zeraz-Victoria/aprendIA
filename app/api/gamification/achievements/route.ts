import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
        return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    try {
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
