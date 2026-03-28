import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: Fetch all online students from the same school with their avatar positions
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ students: [] });
        }

        // Consider "online" if lastSeen within last 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30_000);

        const students = await prisma.user.findMany({
            where: {
                schoolId,
                role: "STUDENT",
                lastSeen: { gte: thirtySecondsAgo }
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                avatarX: true,
                avatarY: true,
                lastSeen: true,
            }
        });

        // Also fetch the shared room furniture (teacher-placed items)
        // The shared room is the VirtualRoom owned by any teacher within the school
        const teacherRoom = await prisma.virtualRoom.findFirst({
            where: {
                student: { schoolId, role: "TEACHER" }
            },
            include: { furniture: true }
        });

        // Fetch each student's personal desk placements
        const studentRooms = await prisma.virtualRoom.findMany({
            where: {
                student: { schoolId, role: "STUDENT" }
            },
            include: {
                furniture: true,
                student: { select: { id: true } }
            }
        });

        // Combine: personal furniture tagged with studentId
        const personalFurniture = studentRooms.flatMap((room: any) =>
            room.furniture.map((f: any) => ({
                ...f,
                ownerId: room.student.id
            }))
        );

        return NextResponse.json({
            students,
            sharedFurniture: teacherRoom?.furniture || [],
            personalFurniture,
        });
    } catch (error) {
        console.error("Error fetching classroom lobby:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Update current student's avatar position and lastSeen
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { avatarX, avatarY } = await req.json();

        await prisma.user.update({
            where: { id: userId },
            data: {
                avatarX: avatarX ?? 70,
                avatarY: avatarY ?? 65,
                lastSeen: new Date(),
            }
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error updating lobby position:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
