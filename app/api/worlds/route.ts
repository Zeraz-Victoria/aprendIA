import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        let classroomId = null;

        if (session?.user && (session.user as any).role === 'STUDENT') {
            const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { classroomId: true } });
            classroomId = user?.classroomId;
        }

        const schoolId = (session?.user as any)?.schoolId;

        const baseWhere: any = schoolId ? { schoolId } : {};

        const whereClause: any = classroomId
            ? {
                ...baseWhere,
                OR: [
                    { classrooms: { some: { id: classroomId } } },
                    { classrooms: { none: {} } }
                ]
            }
            : baseWhere;

        const worlds = await prisma.world.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' },
            include: { classrooms: true }
        });

        // Parse daysJson back to objects for the frontend
        const parsedWorlds = worlds.map(world => ({
            ...world,
            days: JSON.parse(world.daysJson),
            pedagogy: world.pedagogyJson ? JSON.parse(world.pedagogyJson) : undefined
        }));

        return NextResponse.json(parsedWorlds);
    } catch (error) {
        console.error('Error fetching worlds:', error);
        return NextResponse.json({ error: 'Failed to fetch worlds' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, title, theme, days, pedagogy, classroomIds } = body;

        if (!id || !title || !theme || !days) {
            return NextResponse.json({ error: 'Missing required world fields' }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (schoolId) {
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                include: { _count: { select: { worlds: true } } }
            });

            if (school) {
                if (school.subscriptionStatus === 'SUSPENDED') {
                    return NextResponse.json({ error: 'Cuenta suspendida. Contacte al administrador.' }, { status: 403 });
                }
                if (school._count.worlds >= school.maxMaps) {
                    return NextResponse.json({ error: `Has alcanzado el límite de ${school.maxMaps} mapa(s) para tu plan actual. Borra un mapa existente para crear uno nuevo.` }, { status: 403 });
                }
            }
        }

        const newWorld = await prisma.world.create({
            data: {
                id,
                title,
                theme,
                schoolId,
                daysJson: JSON.stringify(days),
                pedagogyJson: pedagogy ? JSON.stringify(pedagogy) : null,
                ...(classroomIds && classroomIds.length > 0 && {
                    classrooms: {
                        connect: classroomIds.map((cId: string) => ({ id: cId }))
                    }
                })
            },
            include: { classrooms: true }
        });

        const parsedWorld = {
            ...newWorld,
            days: JSON.parse(newWorld.daysJson),
            pedagogy: newWorld.pedagogyJson ? JSON.parse(newWorld.pedagogyJson) : undefined
        };

        return NextResponse.json(parsedWorld, { status: 201 });
    } catch (error) {
        console.error('Error creating world:', error);
        return NextResponse.json({ error: 'Failed to create world' }, { status: 500 });
    }
}
