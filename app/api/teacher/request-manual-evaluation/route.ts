import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { studentId, worldId, levelId, evidenceType } = body;

        // Ensure we have a valid dayNumber/levelId
        const dayNumber = typeof levelId === 'string' ? parseInt(levelId, 10) : (levelId || 1);

        if (!studentId || !worldId) {
            return NextResponse.json({ error: "Faltan datos requeridos (studentId, worldId)" }, { status: 400 });
        }

        // Reemplazar la creación/actualización de Progress por EvidenceEntry
        const existingEvidence = await prisma.evidenceEntry.findFirst({
            where: {
                studentId,
                worldId,
                levelId: dayNumber,
            }
        });

        if (existingEvidence) {
            await prisma.evidenceEntry.update({
                where: { id: existingEvidence.id },
                data: {
                    status: 'PENDING_TEACHER_UPLOAD',
                }
            });
        } else {
            await prisma.evidenceEntry.create({
                data: {
                    studentId,
                    worldId,
                    levelId: dayNumber,
                    status: 'PENDING_TEACHER_UPLOAD',
                    studentAnswer: "Esperando evidencia del profesor...",
                    isCorrect: false,
                    feedback: "Esperando evaluación.",
                    canAdvance: false
                }
            });
        }

        // También aseguremonos que exista el record de progreso
        const existingProgress = await prisma.progress.findUnique({
            where: {
                studentId_worldId_levelId: {
                    studentId,
                    worldId,
                    levelId: dayNumber,
                }
            }
        });

        if (!existingProgress) {
            await prisma.progress.create({
                data: {
                    studentId,
                    worldId,
                    levelId: dayNumber
                }
            });
        }

        return NextResponse.json({ success: true, message: "Estado actualizado a pendiente de maestro" });

    } catch (error) {
        console.error("Error updating progress to manual upload:", error);
        return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
    }
}
