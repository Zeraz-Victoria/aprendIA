import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const role = (session.user as any)?.role;
        if (!['TEACHER', 'SUPERADMIN'].includes(role)) {
            return NextResponse.json({ error: 'Solo maestros pueden usar el bypass' }, { status: 403 });
        }

        const { studentId, worldId, levelId, evidenceType } = await req.json();

        if (!studentId || !worldId || levelId === undefined) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
        }

        const parsedLevelId = typeof levelId === 'string' ? parseInt(levelId, 10) : levelId;

        await prisma.progress.upsert({
            where: {
                studentId_worldId_levelId: { studentId, worldId, levelId: parsedLevelId }
            },
            update: {},
            create: { studentId, worldId, levelId: parsedLevelId }
        });

        const savedEntry = await prisma.evidenceEntry.create({
            data: {
                studentId,
                worldId,
                levelId: parsedLevelId,
                studentAnswer: `Bypass autorizado por docente (Tipo esperado: ${evidenceType || 'CUALQUIERA'})`,
                isCorrect: true,
                feedback: "Aprobado manualmente. Pendiente de subida fotográfica por el maestro.",
                topic: "Bypass Manual",
                emotionDetected: "Apoyado",
                status: "PENDING_TEACHER_UPLOAD"
            }
        });

        return NextResponse.json({ success: true, entryId: savedEntry.id });
    } catch (error: any) {
        console.error('Error in POST /api/evidence/bypass:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

