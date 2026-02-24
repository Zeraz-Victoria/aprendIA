import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const topStudents = await prisma.user.findMany({
            where: {
                role: "STUDENT"
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                xp: true,
                streak: true,
            },
            orderBy: {
                xp: "desc"
            },
            take: 10 // Top 10 Leaderboard
        });

        return NextResponse.json(topStudents);
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
