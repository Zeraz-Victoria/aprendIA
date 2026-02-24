import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { studentId, avatar } = body;

        if (!studentId || !avatar) {
            return NextResponse.json({ error: 'Missing studentId or avatar' }, { status: 400 });
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
