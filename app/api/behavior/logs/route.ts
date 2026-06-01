import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const teacherId = (session?.user as any)?.id;

        if (role !== 'TEACHER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { studentId, categoryId, note } = await req.json();

        const category = await prisma.behaviorCategory.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        const log = await prisma.behaviorLog.create({
            data: {
                studentId,
                teacherId,
                categoryId,
                note
            }
        });

        const pointsToAdd = category.weight;
        
        // Update gems (which act as Dojo points)
        await prisma.user.update({
            where: { id: studentId },
            data: {
                gems: {
                    increment: pointsToAdd
                }
            }
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error('Error logging behavior:', error);
        return NextResponse.json({ error: 'Failed to log behavior' }, { status: 500 });
    }
}
