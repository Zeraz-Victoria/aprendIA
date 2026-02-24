import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const students = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            orderBy: { name: 'asc' },
            select: {
                id: true, name: true, email: true, avatar: true, role: true,
                status: true, lastActivity: true, lives: true, gems: true,
                streak: true, xp: true, classroomId: true
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
        const body = await req.json();
        const { name, avatar, classroomId } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }

        const student = await prisma.user.create({
            data: {
                name: name.trim(),
                avatar: avatar || '🧑🏻',
                role: 'STUDENT',
                status: 'active',
                lives: 5,
                gems: 0,
                streak: 0,
                xp: 0,
                classroomId: classroomId || null,
            }
        });

        return NextResponse.json(student, { status: 201 });
    } catch (error) {
        console.error('Error creating student:', error);
        return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }
}
