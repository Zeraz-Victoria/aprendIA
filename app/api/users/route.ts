import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const role = (session?.user as any)?.role;
        const teacherId = (session?.user as any)?.id;

        if (!schoolId && role !== 'TEACHER') {
            return NextResponse.json([]);
        }

        let whereClause: any = { role: 'STUDENT' };

        if (role === 'TEACHER') {
            whereClause.teacherOwnerId = teacherId;
        } else if (schoolId) {
            whereClause.schoolId = schoolId;
        }

        const students = await prisma.user.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
            include: {
                assignedWorlds: true
            }
        });

        return NextResponse.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const teacherId = (session?.user as any)?.id;
        const role = (session?.user as any)?.role;

        const body = await req.json();
        const { name, avatar, classroomId } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }

        if (schoolId) {
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                include: { _count: { select: { users: { where: { role: 'STUDENT' } } } } }
            });

            if (school) {
                if (school.subscriptionStatus === 'SUSPENDED') {
                    return NextResponse.json({ error: 'Cuenta suspendida. Contacte al administrador.' }, { status: 403 });
                }
                if (school._count.users >= school.maxStudents) {
                    return NextResponse.json({ error: `Has alcanzado el límite de ${school.maxStudents} alumno(s) para tu plan actual.` }, { status: 403 });
                }
            }
        }

        const student = await prisma.user.create({
            data: {
                name: name.trim(),
                avatar: avatar || '🧑🏻',
                role: 'STUDENT',
                status: 'active',
                lives: 3,
                gems: 0,
                streak: 0,
                xp: 0,
                classroomId: classroomId || null,
                schoolId: schoolId || null,
                teacherOwnerId: role === 'TEACHER' ? teacherId : null,
            }
        });

        return NextResponse.json(student, { status: 201 });
    } catch (error) {
        console.error('Error creating student:', error);
        return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }
}
