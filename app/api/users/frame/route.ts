import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request) {
    try {
        const { studentId, frame } = await req.json();

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
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
