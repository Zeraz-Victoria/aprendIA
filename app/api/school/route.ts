import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { checkAndSuspendSchool } from "@/lib/subscription";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Lazy-check and suspend the school if subscription is expired
        await checkAndSuspendSchool(schoolId);

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: {
                _count: {
                    select: { worlds: true, users: { where: { role: 'STUDENT' } } }
                }
            }
        });

        if (!school) {
            return NextResponse.json({ error: 'Escuela no encontrada' }, { status: 404 });
        }

        return NextResponse.json(school);
    } catch (error) {
        console.error('Error fetching school data:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
