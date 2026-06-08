import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { getNextPaymentDate } from "@/lib/subscription";

// --- MEMORIA RAM PARA CACHÉ ---
let cachedTeachers: any = null;
let lastFetch = 0;
const CACHE_DURATION = 15000; // 15 segundos

export async function GET(req: Request) {
    try {
        // 1. Verificar Caché para ahorrar RAM en Render
        const now = Date.now();
        if (cachedTeachers && (now - lastFetch < CACHE_DURATION)) {
            return NextResponse.json(cachedTeachers, { headers: { 'X-Vira-Cache': 'HIT' } });
        }

        // 2. Auth Check
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 3. Consulta Optimizada a Prisma
        const teachers = await prisma.user.findMany({
            where: { role: "TEACHER" },
            include: {
                _count: {
                    select: { ownedClassrooms: true }
                },
                school: {
                    include: {
                        _count: {
                            select: { 
                                users: { where: { role: "STUDENT" } } 
                            }
                        },
                        users: {
                            where: { apiCalls: { gt: 0 } },
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                apiCalls: true
                            },
                            orderBy: { apiCalls: 'desc' },
                            take: 20
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // 4. Formateo (Sin apiCalls para evitar el crash)
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
            paymentDay: t.school?.paymentDay || 1,
            nextPaymentDate: t.school?.nextPaymentDate || null,
            apiCalls: t.school?.apiCalls || 0,
            apiCallsBreakdown: t.school?.users || []
        }));

        // 5. Guardar en Caché antes de responder
        cachedTeachers = formattedTeachers;
        lastFetch = now;

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

        const { name, plan, password, paymentDay } = await req.json();

        if (!name?.trim() || !password?.trim()) {
            return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                name: { equals: name.trim(), mode: 'insensitive' }
            }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Ya existe este usuario." }, { status: 400 });
        }

        let maxMaps = 1, maxStudents = 25, subscriptionPlan = 'BASIC';
        if (plan === 'INTERMEDIATE') { maxMaps = 5; maxStudents = 50; subscriptionPlan = 'INTERMEDIATE'; }
        else if (plan === 'PREMIUM') { maxMaps = 10; maxStudents = 80; subscriptionPlan = 'PREMIUM'; }

        const targetPaymentDay = paymentDay !== undefined ? parseInt(paymentDay) : 1;
        const initialNextPaymentDate = getNextPaymentDate(targetPaymentDay);

        const virtualSchool = await prisma.school.create({
            data: {
                name: `Licencia de ${name.trim()}`,
                subscriptionPlan: subscriptionPlan as any,
                maxMaps,
                maxStudents,
                paymentDay: targetPaymentDay,
                nextPaymentDate: initialNextPaymentDate
            }
        });

        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        const teacher = await prisma.user.create({
            data: {
                name: name.trim(),
                password: hashedPassword,
                role: "TEACHER",
                schoolId: virtualSchool.id,
                avatar: "👨‍🏫"
            }
        });

        // Limpiar caché para que el nuevo maestro aparezca de inmediato
        cachedTeachers = null; 

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

        const { schoolId, teacherId, newName, newPassword, subscriptionPlan, subscriptionStatus, maxMaps, maxStudents, paymentDay } = await req.json();

        if (!schoolId) return NextResponse.json({ error: "School ID required" }, { status: 400 });

        const updateData: any = {};
        if (subscriptionPlan) {
            updateData.subscriptionPlan = subscriptionPlan;
            if (subscriptionPlan === 'INTERMEDIATE') { updateData.maxMaps = 5; updateData.maxStudents = 50; }
            else if (subscriptionPlan === 'PREMIUM') { updateData.maxMaps = 10; updateData.maxStudents = 80; }
            else { updateData.maxMaps = 1; updateData.maxStudents = 25; }
        }
        if (maxMaps !== undefined) updateData.maxMaps = parseInt(maxMaps);
        if (maxStudents !== undefined) updateData.maxStudents = parseInt(maxStudents);

        if (paymentDay !== undefined) {
            const parsedDay = parseInt(paymentDay);
            updateData.paymentDay = parsedDay;
            updateData.nextPaymentDate = getNextPaymentDate(parsedDay);
        }

        if (subscriptionStatus) {
            updateData.subscriptionStatus = subscriptionStatus;
            if (subscriptionStatus === "ACTIVE") {
                const currentSchool = await prisma.school.findUnique({
                    where: { id: schoolId },
                    select: { paymentDay: true }
                });
                const finalPaymentDay = paymentDay !== undefined ? parseInt(paymentDay) : (currentSchool?.paymentDay ?? 1);
                updateData.nextPaymentDate = getNextPaymentDate(finalPaymentDay);
            }
        }

        const updatedSchool = await prisma.school.update({
            where: { id: schoolId },
            data: updateData
        });

        if (newName?.trim() || newPassword?.trim()) {
            const userUpdateData: any = {};
            if (newName?.trim()) userUpdateData.name = newName.trim();
            if (newPassword?.trim()) {
                userUpdateData.password = await bcrypt.hash(newPassword.trim(), 10);
            }
            await prisma.user.update({ where: { id: teacherId }, data: userUpdateData });
        }

        cachedTeachers = null; // Limpiar caché
        return NextResponse.json({ success: true, school: updatedSchool });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get("teacherId");

        if (!teacherId) return NextResponse.json({ error: "teacherId required" }, { status: 400 });

        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { schoolId: true, role: true }
        });

        if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

        const schoolId = teacher.schoolId;

        if (schoolId) {
            // Limpieza masiva de datos relacionados (Cascade manual)
            const students = await prisma.user.findMany({ where: { schoolId, role: 'STUDENT' }, select: { id: true } });
            const sIds = students.map(s => s.id);
            if (sIds.length > 0) {
                await prisma.progress.deleteMany({ where: { studentId: { in: sIds } } });
                await prisma.inventory.deleteMany({ where: { studentId: { in: sIds } } });
                await prisma.userAchievement.deleteMany({ where: { studentId: { in: sIds } } });
                await prisma.user.deleteMany({ where: { id: { in: sIds } } });
            }
            await prisma.classroom.deleteMany({ where: { schoolId } });
            await prisma.world.deleteMany({ where: { schoolId } });
        }

        await prisma.user.delete({ where: { id: teacherId } });
        if (schoolId) await prisma.school.delete({ where: { id: schoolId } }).catch(() => {});

        cachedTeachers = null; 
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
