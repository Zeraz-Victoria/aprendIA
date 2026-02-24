import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        // Manually cascade delete progress related to this world to avoid FK constraint errors 
        // if the database schema hasn't fully synced or the PrismaClient is stale.
        await prisma.progress.deleteMany({
            where: { worldId: id }
        });

        // Also delete any detached student missions for this world
        await prisma.studentMission.deleteMany({
            where: { worldId: id }
        });

        await prisma.world.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting world:', error);
        return NextResponse.json({ error: 'Failed to delete world', details: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
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
