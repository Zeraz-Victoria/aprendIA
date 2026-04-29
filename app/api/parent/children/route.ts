import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const parentId = (session?.user as any)?.id;

        if (role !== 'PARENT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const relations = await prisma.parentChild.findMany({
            where: { parentId },
            include: {
                child: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        gems: true,
                        classroomId: true
                    }
                }
            }
        });

        const children = relations.map(r => r.child);
        return NextResponse.json(children);
    } catch (error) {
        console.error('Error fetching children:', error);
        return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }
}
