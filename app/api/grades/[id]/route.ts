import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
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
