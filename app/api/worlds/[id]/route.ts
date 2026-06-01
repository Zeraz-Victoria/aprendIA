import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";

import { withRetry } from '@/lib/db-retry';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const role = (session.user as any)?.role;
        if (!['TEACHER', 'SUPERADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await prisma.progress.deleteMany({ where: { worldId: id } });
        await prisma.studentMission.deleteMany({ where: { worldId: id } });
        await prisma.world.delete({ where: { id } });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting world:', error);
        return NextResponse.json({ error: 'Failed to delete world', details: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const role = (session.user as any)?.role;
        if (!['TEACHER', 'SUPERADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const body = await req.json();
        const { title, theme, days, pedagogy, classroomIds, studentIds } = body;
        const schoolId = (session.user as any)?.schoolId;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const updatedWorld = await withRetry(async () => {
            return await prisma.world.update({
                where: { id },
                data: {
                    title,
                    theme,
                    daysJson: JSON.stringify(days),
                    pedagogyJson: pedagogy !== undefined ? (pedagogy ? JSON.stringify(pedagogy) : null) : undefined,
                    ...(classroomIds !== undefined && {
                        classrooms: {
                            set: classroomIds.map((cId: string) => ({ id: cId }))
                        }
                    })
                },
                include: {
                    classrooms: true,
                    assignedStudents: { select: { id: true, name: true } }
                }
            });
        });

        // Resync assignedStudents when classrooms change
        if (classroomIds !== undefined && schoolId) {
            let targetStudentIds: string[] = [];

            if (classroomIds.length > 0) {
                // Specific classrooms selected — only those students
                const classroomStudents = await prisma.user.findMany({
                    where: { classroomId: { in: classroomIds }, role: 'STUDENT' },
                    select: { id: true }
                });
                targetStudentIds = classroomStudents.map(s => s.id);
            } else {
                // Global — all school students
                const allStudents = await prisma.user.findMany({
                    where: { schoolId, role: 'STUDENT' },
                    select: { id: true }
                });
                targetStudentIds = allStudents.map(s => s.id);
            }

            // Also include individually-selected students
            if (studentIds && studentIds.length > 0) {
                const combined = new Set([...targetStudentIds, ...studentIds]);
                targetStudentIds = Array.from(combined);
            }

            await prisma.world.update({
                where: { id },
                data: {
                    assignedStudents: {
                        set: targetStudentIds.map(sId => ({ id: sId }))
                    }
                }
            });
        }

        const parsedWorld = {
            ...updatedWorld,
            days: JSON.parse(updatedWorld.daysJson),
            pedagogy: updatedWorld.pedagogyJson ? JSON.parse(updatedWorld.pedagogyJson) : undefined
        };

        return NextResponse.json(parsedWorld);
    } catch (error) {
        console.error('Error updating world:', error);
        return NextResponse.json({ error: 'Failed to update world' }, { status: 500 });
    }
}

