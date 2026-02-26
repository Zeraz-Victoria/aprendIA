import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { studentId, worldId, levelId, password, evidenceType } = await req.json();

        // Basic passcode for teacher bypass, keeping it consistent with the existing one
        if (password !== "1234") {
            return NextResponse.json({ error: 'PIN de maestro incorrecto' }, { status: 401 });
        }

        if (!studentId || !worldId || levelId === undefined) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
        }

        const parsedLevelId = typeof levelId === 'string' ? parseInt(levelId, 10) : levelId;

        // Save progress immediately so the student can advance on the adventure map
        await prisma.progress.upsert({
            where: {
                studentId_worldId_levelId: {
                    studentId,
                    worldId,
                    levelId: parsedLevelId
                }
            },
            update: {},
            create: {
                studentId,
                worldId,
                levelId: parsedLevelId
            }
        });

        // Add to evidence queue with "PENDING_TEACHER_UPLOAD" status
        const savedEntry = await prisma.evidenceEntry.create({
            data: {
                studentId,
                worldId,
                levelId: parsedLevelId,
                studentAnswer: `Bypass autorizado por docente (Tipo esperado: ${evidenceType || 'CUALQUIERA'})`,
                isCorrect: true, // We assume teacher approves it conceptually
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
