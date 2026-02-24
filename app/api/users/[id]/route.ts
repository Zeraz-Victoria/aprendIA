import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, avatar } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }

        const student = await prisma.user.update({
            where: { id },
            data: {
                name: name.trim(),
                avatar: avatar || undefined,
            }
        });

        return NextResponse.json(student);
    } catch (error) {
        console.error('Error updating student:', error);
        return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Delete related records first due to cascade, then user
        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
    }
}
