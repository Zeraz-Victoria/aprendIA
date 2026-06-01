import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { studentId, avatar } = body;

        if (!studentId || !avatar) {
            return NextResponse.json({ error: 'Missing studentId or avatar' }, { status: 400 });
        }

        // Un alumno solo puede cambiar su propio avatar
        const sessionUserId = (session.user as any)?.id;
        const role = (session.user as any)?.role;
        if (role === 'STUDENT' && sessionUserId !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: studentId },
            data: { avatar }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error updating avatar:", error);
        return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }
}
