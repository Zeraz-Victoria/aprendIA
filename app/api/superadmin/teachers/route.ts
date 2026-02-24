import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { name, schoolId } = await req.json();

        if (!name?.trim() || !schoolId) {
            return NextResponse.json({ error: "Name and School ID are required" }, { status: 400 });
        }

        // Verify school exists
        const school = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        // Look for existing user with that name just in case
        const existingUser = await prisma.user.findFirst({
            where: {
                name: {
                    equals: name.trim(),
                    mode: 'insensitive'
                }
            }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Ya existe un usuario con este nombre. Intenta uno más específico (ej. 'Profe Juan M')." }, { status: 400 });
        }

        const teacher = await prisma.user.create({
            data: {
                name: name.trim(),
                role: "TEACHER",
                schoolId: schoolId,
                avatar: "👨‍🏫"
            }
        });

        return NextResponse.json(teacher, { status: 201 });
    } catch (error) {
        console.error("Error creating teacher:", error);
        return NextResponse.json({ error: "Failed to create teacher" }, { status: 500 });
    }
}
