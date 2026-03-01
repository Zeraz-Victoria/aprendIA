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

        const { studentId, worldId, action = 'assign' } = await req.json();
        const schoolId = user.schoolId;

        if (!studentId || !worldId) {
            return NextResponse.json({ error: 'Missing studentId or worldId' }, { status: 400 });
        }

        // Verify that the world actually exists AND belongs to the teacher's school
        const world = await prisma.world.findUnique({
            where: { id: worldId, schoolId }
        });

        if (!world) {
            return NextResponse.json({ error: 'World not found or unauthorized' }, { status: 404 });
        }

        // Verify the student belongs to the same school
        const targetStudent = await prisma.user.findUnique({
            where: { id: studentId, schoolId, role: 'STUDENT' }
        });

        if (!targetStudent) {
            return NextResponse.json({ error: 'Student not found in your school' }, { status: 404 });
        }

        // Connect or Disconnect the specific world to/from the specific student
        const updatedStudent = await prisma.user.update({
            where: { id: studentId },
            data: {
                assignedWorlds: action === 'unassign'
                    ? { disconnect: { id: worldId } }
                    : { connect: { id: worldId } }
            },
            include: {
                assignedWorlds: true
            }
        }) as any;

        return NextResponse.json({
            success: true,
            message: `Mapa ${world.title} asignado exitosamente al alumno.`,
            assignedWorlds: updatedStudent.assignedWorlds
        });

    } catch (error) {
        console.error('Error assigning world:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
