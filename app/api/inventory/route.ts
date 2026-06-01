import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const schoolId = (session?.user as any)?.schoolId;
    const role = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!schoolId && role !== 'STUDENT') {
        return NextResponse.json({});
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    try {
        const whereClause: any = {};
        // Students only load their own inventory (massive speedup)
        if (role === 'STUDENT' && userId) {
            whereClause.studentId = userId;
        } else if (schoolId) {
            whereClause.student = { schoolId };
            if (studentId) {
                whereClause.studentId = studentId;
            }
        }

        const inventoryList = await prisma.inventory.findMany({
            where: whereClause
        });

        // Map list to Record<studentId, itemId[]>
        const inventoryMap: Record<string, string[]> = {};
        inventoryList.forEach(inv => {
            if (!inventoryMap[inv.studentId]) {
                inventoryMap[inv.studentId] = [];
            }
            inventoryMap[inv.studentId].push(inv.itemId);
        });

        return NextResponse.json(inventoryMap);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { studentId, itemId, cost } = await req.json();

        if (!studentId || !itemId) {
            return NextResponse.json({ error: 'Missing required inventory fields' }, { status: 400 });
        }

        // Transaction to securely deduct gems and add item to inventory
        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.user.findUnique({ where: { id: studentId } });

            if (!student || student.gems < cost) {
                throw new Error('Insufficient gems or student not found');
            }

            await tx.user.update({
                where: { id: studentId },
                data: { gems: student.gems - cost }
            });

            const newItem = await tx.inventory.create({
                data: { studentId, itemId }
            });

            return { newItem, remainingGems: student.gems - cost };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error during purchase:', errorMessage);
        return NextResponse.json({ error: 'Failed to complete purchase', details: errorMessage }, { status: 400 });
    }
}
