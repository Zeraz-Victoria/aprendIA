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

        const formattedTeachers = teachers.map((t: any) => ({
            id: t.id,
            name: t.name,
            classroomsCount: t._count?.ownedClassrooms || 0,
            studentsCount: t.school?._count?.users || 0,
            lastActivity: t.lastActivity,
            schoolId: t.school?.id,
            subscriptionPlan: t.school?.subscriptionPlan || 'BASIC',
            subscriptionStatus: t.school?.subscriptionStatus || 'ACTIVE'
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

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { schoolId, subscriptionPlan, subscriptionStatus } = await req.json();

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        // Automatic limit setting
        let maxMaps = 1;
        let maxStudents = 25;

        if (subscriptionPlan === 'INTERMEDIATE') {
            maxMaps = 5;
            maxStudents = 50;
        } else if (subscriptionPlan === 'PREMIUM') {
            maxMaps = 10;
            maxStudents = 100;
        }

        const updatedSchool = await prisma.school.update({
            where: { id: schoolId },
            data: {
                subscriptionPlan,
                subscriptionStatus,
                maxMaps,
                maxStudents
            }
        });

        return NextResponse.json({ success: true, school: updatedSchool });
    } catch (error) {
        console.error("Error updating subscription:", error);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }
}
