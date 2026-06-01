import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET: Fetch tickets for superadmin
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tickets = await (prisma as any).supportTicket.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        email: true,
                        avatar: true,
                        school: { select: { name: true } }
                    }
                }
            }
        });

        return NextResponse.json(tickets);
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Create a new support ticket from any logged-in user
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: 'Debes iniciar sesión para reportar un problema' }, { status: 401 });
        }

        const body = await req.json();
        const { message } = body;

        if (!message || message.trim().length === 0) {
            return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
        }

        const newTicket = await (prisma as any).supportTicket.create({
            data: {
                senderId: (session!.user as any).id,
                message: message.trim(),
            }
        });

        return NextResponse.json({ success: true, ticket: newTicket }, { status: 201 });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

// PATCH: Update ticket (reply + resolve)
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, status, adminReply } = body;

        if (!id) {
            return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
        }

        const updateData: any = {};
        if (status === 'OPEN' || status === 'RESOLVED') updateData.status = status;
        if (adminReply !== undefined) updateData.adminReply = adminReply;

        const updated = await (prisma as any).supportTicket.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating support ticket:', error);
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
}
