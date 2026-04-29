import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        const posts = await prisma.classStoryPost.findMany({
            include: {
                teacher: { select: { name: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return NextResponse.json(posts);
    } catch (error) {
        console.error('Error fetching story:', error);
        return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 });
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

        const { content, imageUrl, classroomId } = await req.json();

        const post = await prisma.classStoryPost.create({
            data: {
                teacherId,
                content,
                imageUrl,
                classroomId: classroomId || null
            },
            include: {
                teacher: { select: { name: true, avatar: true } }
            }
        });

        return NextResponse.json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}
