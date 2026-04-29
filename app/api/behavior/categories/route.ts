import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const teacherId = (session?.user as any)?.id;

        if (role !== 'TEACHER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const categories = await prisma.behaviorCategory.findMany({
            where: {
                OR: [
                    { teacherId: null },
                    { teacherId: teacherId }
                ]
            },
            orderBy: { name: 'asc' }
        });

        // If empty, create default ones
        if (categories.length === 0) {
            const defaults = [
                { name: 'Trabajo en equipo', icon: '🤝', weight: 1, isPositive: true, teacherId },
                { name: 'Participación', icon: '🙋', weight: 1, isPositive: true, teacherId },
                { name: 'Buen compañero', icon: '🫂', weight: 1, isPositive: true, teacherId },
                { name: 'Fuera de tarea', icon: '⚠️', weight: -1, isPositive: false, teacherId },
                { name: 'Interrupción', icon: '🗣️', weight: -1, isPositive: false, teacherId },
            ];
            await prisma.behaviorCategory.createMany({ data: defaults });
            
            const newCategories = await prisma.behaviorCategory.findMany({
                where: {
                    OR: [
                        { teacherId: null },
                        { teacherId: teacherId }
                    ]
                },
                orderBy: { name: 'asc' }
            });
            return NextResponse.json(newCategories);
        }

        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const teacherId = (session?.user as any)?.id;

        if (role !== 'TEACHER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, icon, weight, isPositive } = await req.json();

        const category = await prisma.behaviorCategory.create({
            data: {
                name,
                icon,
                weight,
                isPositive,
                teacherId
            }
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}
