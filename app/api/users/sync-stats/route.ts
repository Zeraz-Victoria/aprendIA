import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { studentId, gemsToAdd, modifyStreak, livesToAdd } = await req.json();

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: studentId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
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
            return NextResponse.json({ message: "Nothing to update" }, { status: 200 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: studentId },
            data: dataToUpdate,
            select: { gems: true, streak: true }
        });

        return NextResponse.json(updatedUser, { status: 200 });
    } catch (e: any) {
        console.error("Failed to sync stats", e);
        return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
    }
}
