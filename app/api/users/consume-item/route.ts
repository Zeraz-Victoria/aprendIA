import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { studentId, itemId } = await req.json();

        if (!studentId || !itemId) {
            return NextResponse.json({ error: "Missing studentId or itemId" }, { status: 400 });
        }

        // Find the specific item in the inventory
        const itemRecord = await prisma.inventory.findFirst({
            where: {
                studentId,
                itemId
            }
        });

        if (!itemRecord) {
            return NextResponse.json({ error: "Item not found in inventory" }, { status: 404 });
        }

        // Delete (consume) it
        await prisma.inventory.delete({
            where: {
                id: itemRecord.id
            }
        });

        return NextResponse.json({ success: true, consumedId: itemRecord.id }, { status: 200 });
    } catch (e: any) {
        console.error("Failed to consume item", e);
        return NextResponse.json({ error: "Failed to consume" }, { status: 500 });
    }
}
