import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const role = (session.user as any)?.role;
        if (!['TEACHER', 'SUPERADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { name, description } = await req.json();

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const updatedGrade = await prisma.grade.update({
            where: { id },
            data: {
                name: name !== undefined ? name.trim() : undefined,
                description: description !== undefined ? (description?.trim() || null) : undefined,
            }
        });

        return NextResponse.json(updatedGrade);
    } catch (error) {
        console.error("Error updating grade:", error);
        return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const role = (session.user as any)?.role;
        if (!['TEACHER', 'SUPERADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        await prisma.grade.delete({ where: { id } });
        return NextResponse.json({ message: "Grade deleted successfully" });
    } catch (error) {
        console.error("Error deleting grade:", error);
        return NextResponse.json({ error: "Failed to delete grade" }, { status: 500 });
    }
}

