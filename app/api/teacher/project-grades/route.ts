import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;

        if (role !== 'TEACHER' && role !== 'SUPERADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { studentId, worldId, grade, feedback } = await req.json();

        if (!studentId || !worldId || grade === undefined) {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        const numGrade = parseFloat(grade);
        if (numGrade < 5 || numGrade > 10) {
            return NextResponse.json({ error: "Grade must be between 5 and 10" }, { status: 400 });
        }

        const projectGrade = await prisma.projectGrade.upsert({
            where: {
                studentId_worldId: {
                    studentId,
                    worldId
                }
            },
            update: {
                grade: numGrade,
                feedback: feedback || null
            },
            create: {
                studentId,
                worldId,
                grade: numGrade,
                feedback: feedback || null
            }
        });

        return NextResponse.json(projectGrade);
    } catch (error) {
        console.error("Error setting project grade:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
