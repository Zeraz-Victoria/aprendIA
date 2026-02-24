import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const teachers = await prisma.user.findMany({
            where: { role: "TEACHER" },
            include: {
                _count: {
                    select: {
                        ownedClassrooms: true,
                    }
                },
                school: {
                    include: {
                        _count: {
                            select: {
                                users: {
                                    where: { role: "STUDENT" }
                                },
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Format to a flatter structure for the UI
        const formattedTeachers = teachers.map((t: any) => ({
            id: t.id,
            name: t.name,
            classroomsCount: t._count?.ownedClassrooms || 0,
            studentsCount: t.school?._count?.users || 0,
            lastActivity: t.lastActivity
        }));

        return NextResponse.json(formattedTeachers);
    } catch (error) {
        console.error("Error fetching teachers:", error);
        return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { name } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
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

        // Auto-create a virtual school for this teacher to preserve multi-tenancy isolation
        const virtualSchool = await prisma.school.create({
            data: {
                name: `Licencia de ${name.trim()}`
            }
        });

        const teacher = await prisma.user.create({
            data: {
                name: name.trim(),
                role: "TEACHER",
                schoolId: virtualSchool.id,
                avatar: "👨‍🏫"
            }
        });

        return NextResponse.json(teacher, { status: 201 });
    } catch (error) {
        console.error("Error creating teacher:", error);
        return NextResponse.json({ error: "Failed to create teacher" }, { status: 500 });
    }
}
