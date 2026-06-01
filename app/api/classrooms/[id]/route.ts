import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const role = (session.user as any)?.role;
        if (!['TEACHER', 'SUPERADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { name, description, emoji, gradeId } = await req.json();

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const updatedClassroom = await prisma.classroom.update({
            where: { id },
            data: {
                name: name !== undefined ? name.trim() : undefined,
                description: description !== undefined ? (description?.trim() || null) : undefined,
                emoji: emoji !== undefined ? emoji : undefined,
                gradeId: gradeId !== undefined ? (gradeId || null) : undefined,
            }
        });

        return NextResponse.json(updatedClassroom);
    } catch (error) {
        console.error("Error updating classroom:", error);
        return NextResponse.json({ error: "Failed to update classroom" }, { status: 500 });
    }
}
