import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
        const { title, theme, days, pedagogy, classroomIds } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const updatedWorld = await prisma.world.update({
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
            include: { classrooms: true }
        });

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

