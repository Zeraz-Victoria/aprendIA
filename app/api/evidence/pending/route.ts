import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

let pendingEvidenceCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 15000;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get('teacherId');

        if (!teacherId) {
            return NextResponse.json({ error: 'Falta teacherId' }, { status: 400 });
        }

        const now = Date.now();
        if (pendingEvidenceCache[teacherId] && (now - pendingEvidenceCache[teacherId].timestamp < CACHE_TTL)) {
            return NextResponse.json(pendingEvidenceCache[teacherId].data);
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

        pendingEvidenceCache[teacherId] = { data: pendingEvidences, timestamp: now };
        return NextResponse.json(pendingEvidences);
    } catch (error: any) {
        console.error('Error in GET /api/evidence/pending:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
