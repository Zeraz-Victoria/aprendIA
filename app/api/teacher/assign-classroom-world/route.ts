// Force Editor cache refresh
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!session || (user.role !== 'TEACHER' && user.role !== 'SUPERADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { classroomId, worldId, action = 'assign' } = await req.json();
        const schoolId = user.schoolId;

        if (!classroomId || !worldId) {
            return NextResponse.json({ error: 'Missing classroomId or worldId' }, { status: 400 });
        }

        // Verify that the world exists and belongs to the teacher's school
        const world = await prisma.world.findUnique({
            where: { id: worldId, schoolId }
        });

        if (!world) {
            return NextResponse.json({ error: 'World not found or unauthorized' }, { status: 404 });
        }

        // Verify the classroom belongs to the teacher
        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId, teacherId: user.id }
        });

        if (!classroom && user.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 });
        }

        // Connect or Disconnect the specific world to/from the specific classroom
        const updatedClassroom = await prisma.classroom.update({
            where: { id: classroomId },
            data: {
                worlds: action === 'unassign'
                    ? { disconnect: { id: worldId } }
                    : { connect: { id: worldId } }
            },
            include: {
                worlds: {
                    select: { id: true, title: true, theme: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Mapa ${world.title} ${action === 'unassign' ? 'desasignado del' : 'asignado al'} Salón exitosamente.`,
            worlds: updatedClassroom.worlds
        });

    } catch (error) {
        console.error('Error assigning classroom world:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
