import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { studentId, frame } = await req.json();

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        const sessionUserId = (session.user as any)?.id;
        const role = (session.user as any)?.role;
        if (role === 'STUDENT' && sessionUserId !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: studentId },
            data: { activeFrame: frame || null },
            select: { id: true, activeFrame: true }
        });

        return NextResponse.json(updatedUser, { status: 200 });
    } catch (error) {
        console.error('Error updating frame:', error);
        return NextResponse.json({ error: 'Failed to update frame' }, { status: 500 });
    }
}
