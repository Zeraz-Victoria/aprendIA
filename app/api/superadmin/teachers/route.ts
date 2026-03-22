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
                        },
                        apiCalls: true
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
            createdAt: t.school?.createdAt || t.lastActivity,
            schoolId: t.school?.id,
            subscriptionPlan: t.school?.subscriptionPlan || 'BASIC',
            subscriptionStatus: t.school?.subscriptionStatus || 'ACTIVE',
            apiCalls: t.school?.apiCalls || 0
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

        const { name, plan, password } = await req.json();

        if (!name?.trim() || !password?.trim()) {
            return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
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

        // Determine plan limits
        let maxMaps = 1;
        let maxStudents = 25;
        let subscriptionPlan = 'BASIC';
        if (plan === 'INTERMEDIATE') {
            maxMaps = 5;
            maxStudents = 50;
            subscriptionPlan = 'INTERMEDIATE';
        } else if (plan === 'PREMIUM') {
            maxMaps = 10;
            maxStudents = 80;
            subscriptionPlan = 'PREMIUM';
        }

        // Auto-create a virtual school for this teacher to preserve multi-tenancy isolation
        const virtualSchool = await prisma.school.create({
            data: {
                name: `Licencia de ${name.trim()}`,
                subscriptionPlan: subscriptionPlan as any,
                maxMaps,
                maxStudents
            }
        });

        const teacher = await prisma.user.create({
            data: {
                name: name.trim(),
                password: password.trim(),
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

        const { schoolId, teacherId, newName, newPassword, subscriptionPlan, subscriptionStatus, maxMaps, maxStudents } = await req.json();

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        const updateData: any = {};
        if (subscriptionPlan) updateData.subscriptionPlan = subscriptionPlan;
        if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;

        // Auto-limits when switching plans
        if (subscriptionPlan === 'INTERMEDIATE') {
            updateData.maxMaps = 5;
            updateData.maxStudents = 50;
        } else if (subscriptionPlan === 'PREMIUM') {
            updateData.maxMaps = 10;
            updateData.maxStudents = 80;
        } else if (subscriptionPlan === 'BASIC') {
            updateData.maxMaps = 1;
            updateData.maxStudents = 25;
        }

        // Manual overriding of limits
        if (maxMaps !== undefined) updateData.maxMaps = parseInt(maxMaps);
        if (maxStudents !== undefined) updateData.maxStudents = parseInt(maxStudents);

        const updatedSchool = await prisma.school.update({
            where: { id: schoolId },
            data: updateData
        });

        if (newName?.trim() || newPassword?.trim()) {
            if (!teacherId) return NextResponse.json({ error: "Teacher ID required for renaming" }, { status: 400 });

            const userUpdateData: any = {};
            if (newName?.trim()) userUpdateData.name = newName.trim();
            if (newPassword?.trim()) userUpdateData.password = newPassword.trim();

            await prisma.user.update({
                where: { id: teacherId },
                data: userUpdateData
            });
        }

        return NextResponse.json({ success: true, school: updatedSchool });
    } catch (error) {
        console.error("Error updating teacher/school data:", error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

// DELETE — Remove a teacher and all their data
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get("teacherId");

        if (!teacherId) {
            return NextResponse.json({ error: "teacherId required" }, { status: 400 });
        }

        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { schoolId: true, role: true }
        });

        if (!teacher || teacher.role !== 'TEACHER') {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        const schoolId = teacher.schoolId;

        if (schoolId) {
            // Delete all students under this school
            const students = await prisma.user.findMany({
                where: { schoolId, role: 'STUDENT' },
                select: { id: true }
            });
            const studentIds = students.map(s => s.id);

            if (studentIds.length > 0) {
                // Clean up student relations
                await prisma.progress.deleteMany({ where: { studentId: { in: studentIds } } });
                await prisma.inventory.deleteMany({ where: { studentId: { in: studentIds } } });
                await prisma.userAchievement.deleteMany({ where: { studentId: { in: studentIds } } });
                await prisma.raidContribution.deleteMany({ where: { studentId: { in: studentIds } } });
                await prisma.hint.deleteMany({ where: { studentId: { in: studentIds } } });
                await prisma.buff.deleteMany({ where: { targetId: { in: studentIds } } });
                await prisma.studentMission.deleteMany({ where: { studentId: { in: studentIds } } });
                await prisma.evidenceEntry.deleteMany({ where: { studentId: { in: studentIds } } });
                await prisma.user.deleteMany({ where: { id: { in: studentIds } } });
            }

            // Delete classrooms
            await prisma.classroom.deleteMany({ where: { schoolId } });

            // Delete worlds
            await prisma.world.deleteMany({ where: { schoolId } });

            // Delete grades
            await prisma.grade.deleteMany({ where: { schoolId } });

            // Delete raid bosses (no schoolId on RaidBoss, so skip if not needed)
        }

        // Delete the teacher user
        await prisma.user.delete({ where: { id: teacherId } });

        // Delete the virtual school
        if (schoolId) {
            await prisma.school.delete({ where: { id: schoolId } }).catch(() => { });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting teacher:", error);
        return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 });
    }
}
