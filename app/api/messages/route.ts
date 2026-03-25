import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withRetry } from '@/lib/db-retry';

// GET: Fetch messages for the current user
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const role = (session?.user as any)?.role;
        const userId = (session?.user as any)?.id;

        if (!schoolId || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const messages = await withRetry(async () => {
            if (role === 'STUDENT') {
                // Students see global messages + messages where they are a recipient
                return await prisma.teacherMessage.findMany({
                    where: {
                        schoolId,
                        OR: [
                            { isGlobal: true },
                            { recipients: { some: { id: userId } } }
                        ]
                    },
                    include: {
                        sender: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                });
            } else {
                // Teachers see messages they sent
                return await prisma.teacherMessage.findMany({
                    where: { senderId: userId, schoolId },
                    include: {
                        sender: { select: { name: true } },
                        recipients: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                });
            }
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}

// POST: Teacher sends a message
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const role = (session?.user as any)?.role;
        const userId = (session?.user as any)?.id;

        if (!schoolId || !userId || role === 'STUDENT') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message, recipientIds, isGlobal } = await req.json();

        if (!message || message.trim().length === 0) {
            return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
        }

        const newMessage = await withRetry(async () => {
            return await prisma.teacherMessage.create({
                data: {
                    senderId: userId,
                    schoolId,
                    message: message.trim(),
                    isGlobal: isGlobal || false,
                    recipients: isGlobal ? undefined : {
                        connect: (recipientIds || []).map((id: string) => ({ id }))
                    }
                },
                include: {
                    sender: { select: { name: true } },
                    recipients: { select: { id: true, name: true } }
                }
            });
        });

        return NextResponse.json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
