import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/grades?teacherId=xxx — fetch all grades for a teacher
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json([]);
        }

        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get("teacherId");

        if (!teacherId) {
            return NextResponse.json({ error: "teacherId required" }, { status: 400 });
        }

        const whereClause: any = { teacherId, schoolId };

        const grades = await prisma.grade.findMany({
            where: whereClause,
            include: {
                classrooms: {
                    include: {
                        _count: { select: { students: true } }
                    }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json(grades);
    } catch (error) {
        console.error("Error fetching grades:", error);
        return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
    }
}

// POST /api/grades — create a new grade
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        const { name, description, teacherId } = await req.json();

        if (!name?.trim() || !teacherId) {
            return NextResponse.json({ error: "Name and teacherId required" }, { status: 400 });
        }

        const grade = await prisma.grade.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                teacherId,
                schoolId: schoolId || null
            },
            include: {
                classrooms: true
            }
        });

        return NextResponse.json(grade, { status: 201 });
    } catch (error) {
        console.error("Error creating grade:", error);
        return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
    }
}

// DELETE /api/grades?id=xxx — delete a grade
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        // Classroom relation is NOT onDelete: Cascade by default for gradeId
        // Let's unassign classrooms from this grade first
        await prisma.classroom.updateMany({
            where: { gradeId: id },
            data: { gradeId: null }
        });

        await prisma.grade.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting grade:", error);
        return NextResponse.json({ error: "Failed to delete grade" }, { status: 500 });
    }
}
