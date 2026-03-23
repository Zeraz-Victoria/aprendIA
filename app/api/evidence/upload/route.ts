import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { entryId, imageUrl } = await req.json();

        if (!entryId || !imageUrl) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos (entryId, imageUrl)' }, { status: 400 });
        }

        const updatedEntry = await prisma.evidenceEntry.update({
            where: { id: entryId },
            data: {
                imageUrl: imageUrl,
                status: "COMPLETED"
            }
        });

        return NextResponse.json({ success: true, entry: updatedEntry });
    } catch (error: any) {
        console.error('Error in PUT /api/evidence/upload:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
