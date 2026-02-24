import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/classrooms?teacherId=xxx — fetch all classrooms for a teacher
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get("teacherId");

        const classrooms = await prisma.classroom.findMany({
            where: teacherId ? { teacherId } : {},
            include: {
                _count: { select: { students: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(classrooms);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch classrooms" }, { status: 500 });
    }
}

// POST /api/classrooms — create a new classroom
export async function POST(req: Request) {
    try {
        const { name, emoji, description, teacherId, gradeId } = await req.json();

        if (!name?.trim() || !teacherId) {
            return NextResponse.json({ error: "Name and teacherId required" }, { status: 400 });
        }

        const classroom = await prisma.classroom.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                emoji: emoji || "📚",
                teacherId,
                gradeId: gradeId || null
            }
        });

        return NextResponse.json(classroom, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create classroom" }, { status: 500 });
    }
}

// PATCH /api/classrooms — assign a student to a classroom
export async function PATCH(req: Request) {
    try {
        const { studentId, classroomId } = await req.json();

        if (!studentId) {
            return NextResponse.json({ error: "studentId required" }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: studentId },
            data: { classroomId: classroomId || null } // null = remove from classroom
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to assign student" }, { status: 500 });
    }
}

// DELETE /api/classrooms?id=xxx — delete a classroom
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        // First remove all students from this classroom
        await prisma.user.updateMany({
            where: { classroomId: id },
            data: { classroomId: null }
        });

        await prisma.classroom.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete classroom" }, { status: 500 });
    }
}
