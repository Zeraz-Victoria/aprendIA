import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET — Teacher fetches all student-to-student buff messages for their school
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId || (role !== 'TEACHER' && role !== 'SUPERADMIN')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all students in this school
        const schoolStudents = await prisma.user.findMany({
            where: { schoolId, role: "STUDENT" },
            select: { id: true, name: true, avatar: true }
        });

        const studentIds = schoolStudents.map(s => s.id);
        const studentMap = Object.fromEntries(schoolStudents.map(s => [s.id, s]));

        // Get all buffs sent to students in this school, most recent first
        const buffs = await prisma.buff.findMany({
            where: { targetId: { in: studentIds } },
            orderBy: { createdAt: "desc" },
            take: 100
        });

        // Enrich with target student info
        const enrichedBuffs = buffs.map(b => ({
            id: b.id,
            fromName: b.fromName,
            fromAvatar: b.fromAvatar,
            message: b.message,
            targetName: studentMap[b.targetId]?.name || "Desconocido",
            targetAvatar: studentMap[b.targetId]?.avatar || "👤",
            createdAt: b.createdAt,
            read: b.read
        }));

        return NextResponse.json(enrichedBuffs);
    } catch (e) {
        console.error("Fetch buff history error:", e);
        return NextResponse.json({ error: "Error fetching buff history" }, { status: 500 });
    }
}
