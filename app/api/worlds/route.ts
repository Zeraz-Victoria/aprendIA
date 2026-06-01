import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { withRetry } from '@/lib/db-retry';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const userId = (session?.user as any)?.id;
        const schoolId = (session?.user as any)?.schoolId;

        let whereClause: any;

        if (role === 'STUDENT' && userId) {
            // Students see worlds assigned to them OR their classroom
            const userWithClassroom = await prisma.user.findUnique({
                where: { id: userId },
                select: { classroomId: true }
            });

            whereClause = {
                OR: [
                    { assignedStudents: { some: { id: userId } } },
                    userWithClassroom?.classroomId ? { classrooms: { some: { id: userWithClassroom.classroomId } } } : {}
                ]
            };
        } else if (role === 'TEACHER') {
            whereClause = { teacherId: userId };
        } else if (schoolId) {
            // Admins see all worlds for their specific school
            whereClause = { schoolId };
        } else {
            // No schoolId in session, return nothing for safety
            return NextResponse.json([]);
        }

        const worlds = await prisma.world.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' },
            include: { classrooms: true }
        });

        // Parse daysJson back to objects for the frontend
        const parsedWorlds = worlds.map(world => ({
            ...world,
            days: JSON.parse(world.daysJson),
            pedagogy: world.pedagogyJson ? JSON.parse(world.pedagogyJson) : undefined
        }));

        return NextResponse.json(parsedWorlds, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('Error fetching worlds:', error);
        return NextResponse.json({ error: 'Failed to fetch worlds' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, title, theme, days, pedagogy, classroomIds } = body;

        if (days && Array.isArray(days) && days.length === 0) {
            console.warn(`[WARNING] Attempting to create an empty world: ${title}`);
        }

        if (!id || !title || !theme || !days) {
            return NextResponse.json({ error: 'Missing required world fields' }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const teacherId = (session?.user as any)?.id;
        const role = (session?.user as any)?.role;

        if (schoolId) {
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                include: { _count: { select: { worlds: true } } }
            });

            if (school) {
                if (school.subscriptionStatus === 'SUSPENDED') {
                    return NextResponse.json({ error: 'Cuenta suspendida. Contacte al administrador.' }, { status: 403 });
                }
                if (school._count.worlds >= school.maxMaps) {
                    return NextResponse.json({ error: `Has alcanzado el límite de ${school.maxMaps} mapa(s) para tu plan actual. Borra un mapa existente para crear uno nuevo.` }, { status: 403 });
                }
            }
        }

        const newWorld = await withRetry(async () => {
            return await prisma.world.create({
                data: {
                    id,
                    title,
                    theme,
                    schoolId,
                    teacherId: role === 'TEACHER' ? teacherId : null,
                    daysJson: JSON.stringify(days),
                    pedagogyJson: pedagogy ? JSON.stringify(pedagogy) : null,
                    ...(classroomIds && classroomIds.length > 0 && {
                        classrooms: {
                            connect: classroomIds.map((cId: string) => ({ id: cId }))
                        }
                    })
                },
                include: { classrooms: true }
            });
        });

        // Auto-assign: respect classroom selection
        if (schoolId) {
            let studentFilter: any = { schoolId, role: 'STUDENT' };

            // If specific classrooms were selected, only assign to students in those classrooms
            if (classroomIds && classroomIds.length > 0) {
                studentFilter = { classroomId: { in: classroomIds }, role: 'STUDENT' };
            }

            const targetStudents = await prisma.user.findMany({
                where: studentFilter,
                select: { id: true }
            });
            if (targetStudents.length > 0) {
                await prisma.world.update({
                    where: { id: newWorld.id },
                    data: {
                        assignedStudents: {
                            connect: targetStudents.map(s => ({ id: s.id }))
                        }
                    }
                });
                console.log(`Assigned world "${title}" to ${targetStudents.length} students (${classroomIds?.length > 0 ? `classrooms: ${classroomIds.join(',')}` : 'global'}).`);
            }
        }

        const parsedWorld = {
            ...newWorld,
            days: JSON.parse(newWorld.daysJson),
            pedagogy: newWorld.pedagogyJson ? JSON.parse(newWorld.pedagogyJson) : undefined
        };

        return NextResponse.json(parsedWorld, { status: 201 });
    } catch (error) {
        console.error('Error creating world:', error);
        return NextResponse.json({ error: 'Failed to create world' }, { status: 500 });
    }
}
