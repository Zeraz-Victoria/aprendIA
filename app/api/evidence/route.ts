import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
        }

        const evidence = await prisma.evidenceEntry.findMany({
            where: { studentId },
            include: {
                world: {
                    select: {
                        title: true,
                        theme: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(evidence);
    } catch (error) {
        console.error("Error fetching evidence:", error);
        return NextResponse.json({ error: "Failed to fetch evidence entries" }, { status: 500 });
    }
}
