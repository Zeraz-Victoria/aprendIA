import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get('teacherId');

        if (!teacherId) {
            return NextResponse.json({ error: 'Falta teacherId' }, { status: 400 });
        }

        // Obtener todas las aulas que le pertenecen a este maestro
        const classrooms = await prisma.classroom.findMany({
            where: { teacherId },
            select: { id: true }
        });

        const classroomIds = classrooms.map(c => c.id);

        // Buscar todas las evidencias pendientes de alumnos en esas aulas
        const pendingEvidences = await prisma.evidenceEntry.findMany({
            where: {
                status: "PENDING_TEACHER_UPLOAD",
                student: {
                    classroomId: { in: classroomIds }
                }
            },
            include: {
                student: {
                    select: { name: true, avatar: true }
                },
                world: {
                    select: { title: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(pendingEvidences);
    } catch (error: any) {
        console.error('Error in GET /api/evidence/pending:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
