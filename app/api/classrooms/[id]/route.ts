import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
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
