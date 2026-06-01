import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json([], { status: 200 });
        }

        const topStudents = await prisma.user.findMany({
            where: {
                role: "STUDENT",
                schoolId
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                activeFrame: true,
                xp: true,
                streak: true,
            },
            orderBy: {
                xp: "desc"
            },
            take: 20
        });

        return NextResponse.json(topStudents);
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
