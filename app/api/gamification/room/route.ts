import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId") || (session.user as any).id;

        // Any authenticated user can view a public room.

        let room = await prisma.virtualRoom.findUnique({
            where: { studentId },
            include: { furniture: true }
        });

        // Initialize empty room if it doesn't exist yet
        if (!room) {
            room = await prisma.virtualRoom.create({
                data: {
                    studentId,
                    theme: "basic_room"
                },
                include: { furniture: true }
            });
        }

        return NextResponse.json(room);
    } catch (error) {
        console.error("Error fetching virtual room:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "STUDENT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const studentId = (session.user as any).id;
        const body = await req.json();
        const { theme, placements } = body;

        // Using a transaction to clear old placements and insert new ones
        const updatedRoom = await prisma.$transaction(async (tx) => {
            // Ensure room exists
            const room = await tx.virtualRoom.upsert({
                where: { studentId },
                update: { theme: theme || "basic_room" },
                create: { studentId, theme: theme || "basic_room" }
            });

            // Delete existing placements
            await tx.furniturePlacement.deleteMany({
                where: { roomId: room.id }
            });

            // Insert new placements
            if (placements && placements.length > 0) {
                await tx.furniturePlacement.createMany({
                    data: placements.map((p: any) => ({
                        roomId: room.id,
                        itemId: p.itemId,
                        positionX: p.positionX,
                        positionY: p.positionY,
                        positionZ: p.positionZ || 0,
                        rotation: p.rotation || 0
                    }))
                });
            }

            // Return updated room with furniture
            return await tx.virtualRoom.findUnique({
                where: { id: room.id },
                include: { furniture: true }
            });
        });

        return NextResponse.json(updatedRoom);
    } catch (error) {
        console.error("Error saving virtual room:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
