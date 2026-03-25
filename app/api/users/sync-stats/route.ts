import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withRetry } from '@/lib/db-retry';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { studentId, gemsToAdd, modifyStreak, livesToAdd } = await req.json();

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        // Un alumno solo puede modificar sus propias stats
        const sessionUserId = (session.user as any)?.id;
        const role = (session.user as any)?.role;
        if (role === 'STUDENT' && sessionUserId !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await withRetry(async () => {
            const user = await prisma.user.findUnique({ where: { id: studentId } });
            if (!user) {
                return { error: "User not found", status: 404 };
            }

            const dataToUpdate: any = {};

            if (typeof gemsToAdd === 'number') {
                dataToUpdate.gems = Math.max(0, user.gems + gemsToAdd);
            }

            if (typeof livesToAdd === 'number') {
                dataToUpdate.lives = Math.max(0, Math.min(3, user.lives + livesToAdd));
            }

            if (modifyStreak === 'reset') {
                dataToUpdate.streak = 0;
            } else if (modifyStreak === 'increment') {
                dataToUpdate.streak = { increment: 1 };
            }

            if (Object.keys(dataToUpdate).length === 0) {
                return { message: "Nothing to update", status: 200 };
            }

            const updatedUser = await prisma.user.update({
                where: { id: studentId },
                data: dataToUpdate,
                select: { gems: true, streak: true }
            });

            return { data: updatedUser, status: 200 };
        });

        if ((result as any).error) {
            return NextResponse.json({ error: (result as any).error }, { status: (result as any).status });
        }

        return NextResponse.json((result as any).data || result, { status: (result as any).status || 200 });
    } catch (e: any) {
        console.error("Failed to sync stats", e);
        return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
    }
}
