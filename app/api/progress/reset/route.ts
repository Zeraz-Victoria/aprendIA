import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const role = (session?.user as any)?.role;

        if (!schoolId || role === 'STUDENT') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { studentIds, worldId } = await req.json();

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: "Missing studentIds" }, { status: 400 });
        }

        // Delete progress entries for selected students
        const deleteFilter: any = {
            studentId: { in: studentIds },
        };
        if (worldId) {
            deleteFilter.worldId = worldId;
        }

        const deletedProgress = await prisma.progress.deleteMany({
            where: deleteFilter
        });

        // Also reset evidence entries for these students if worldId provided
        const evidenceFilter: any = {
            studentId: { in: studentIds },
        };
        if (worldId) {
            evidenceFilter.worldId = worldId;
        }

        const deletedEvidence = await prisma.evidenceEntry.deleteMany({
            where: evidenceFilter
        });

        // Reset XP and gems for selected students
        await prisma.user.updateMany({
            where: { id: { in: studentIds }, schoolId },
            data: { xp: 0, gems: 0 }
        });

        return NextResponse.json({
            success: true,
            deletedProgress: deletedProgress.count,
            deletedEvidence: deletedEvidence.count,
            message: `Se reinició el progreso de ${studentIds.length} alumno(s).`
        });
    } catch (error) {
        console.error("Error resetting progress:", error);
        return NextResponse.json({ error: "Failed to reset progress" }, { status: 500 });
    }
}
