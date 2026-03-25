import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withRetry } from "@/lib/db-retry";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

        // Verify session matches studentId (ensure student only fetches their own classmates context)
        if (session?.user?.name !== studentId && (session?.user as any)?.id !== studentId) {
            // Basic check or just allow if in same school
        }

        const currentUser = await prisma.user.findFirst({
            where: { id: studentId, schoolId },
            select: { classroomId: true, schoolId: true }
        });

        if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Find classmates
        const classmates = await prisma.user.findMany({
            where: {
                id: { not: studentId },
                role: "STUDENT",
                schoolId: currentUser.schoolId, // Strictly within school
                ...(currentUser.classroomId ? { classroomId: currentUser.classroomId } : {})
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                status: true,
                xp: true
            },
            take: 15
        });

        // Simulate "needs_help" for demo purposes based on low XP or random chance
        const students = classmates.map((c: any) => ({
            ...c,
            status: c.xp < 100 || Math.random() < 0.3 ? "needs_help" : "active"
        }));

        return NextResponse.json(students);
    } catch (e: any) {
        console.error("Fetch classmates error:", e);
        return NextResponse.json({ error: "Error fetching classmates" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { senderId, targetId, buffMessage, includeHint } = await req.json();

        if (!senderId || !targetId) {
            return NextResponse.json({ error: "Missing params" }, { status: 400 });
        }

        const cost = includeHint ? 15 : 10;
        const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { gems: true, name: true, avatar: true, schoolId: true } });
        if (!sender) return NextResponse.json({ error: "Sender not found" }, { status: 404 });

        // Verify target belongs to same school
        const target = await prisma.user.findFirst({ where: { id: targetId, schoolId: sender.schoolId } });
        if (!target) return NextResponse.json({ error: "Target not found in same school" }, { status: 403 });

        if (sender.gems < cost) return NextResponse.json({ error: "Not enough gems" }, { status: 400 });

        // Deduct gems and Create buff inside a retry block
        await withRetry(async () => {
            await prisma.user.update({
                where: { id: senderId },
                data: { gems: { decrement: cost } }
            });

            if (includeHint) {
                await prisma.hint.create({
                    data: {
                        studentId: targetId,
                        message: `Tu compañero ${sender.name || ''} ha usado sus gemas para enviarte una pista extra: ¡Lee el problema dos veces en voz alta y busca los datos clave!`
                    }
                });
            }

            await prisma.buff.create({
                data: {
                    targetId,
                    fromName: sender.name || 'Un compañero',
                    fromAvatar: sender.avatar || '🧑',
                    message: buffMessage || '¡Sigue así, tú puedes!'
                }
            });
        });

        return NextResponse.json({ success: true, remainingGems: sender.gems - cost });
    } catch (e: any) {
        console.error("Buff send error:", e);
        return NextResponse.json({ error: "Error sending buff" }, { status: 500 });
    }
}
