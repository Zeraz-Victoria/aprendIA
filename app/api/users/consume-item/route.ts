import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { studentId, itemId } = await req.json();

        if (!studentId || !itemId) {
            return NextResponse.json({ error: "Missing studentId or itemId" }, { status: 400 });
        }

        const sessionUserId = (session.user as any)?.id;
        const role = (session.user as any)?.role;
        if (role === 'STUDENT' && sessionUserId !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const itemRecord = await prisma.inventory.findFirst({
            where: { studentId, itemId }
        });

        if (!itemRecord) {
            return NextResponse.json({ error: "Item not found in inventory" }, { status: 404 });
        }

        await prisma.inventory.delete({ where: { id: itemRecord.id } });

        return NextResponse.json({ success: true, consumedId: itemRecord.id }, { status: 200 });
    } catch (e: any) {
        console.error("Failed to consume item", e);
        return NextResponse.json({ error: "Failed to consume" }, { status: 500 });
    }
}
