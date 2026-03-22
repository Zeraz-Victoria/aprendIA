import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

let buffsCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 15000;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const _t = searchParams.get('t'); // Cache busting

        if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

        const now = Date.now();
        if (buffsCache[studentId] && (now - buffsCache[studentId].timestamp < CACHE_TTL)) {
            return NextResponse.json(buffsCache[studentId].data);
        }

        const buffs = await prisma.buff.findMany({
            where: {
                targetId: studentId,
                read: false
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        buffsCache[studentId] = { data: buffs, timestamp: now };
        return NextResponse.json(buffs);
    } catch (e) {
        console.error("Fetch pending buffs error:", e);
        return NextResponse.json({ error: "Error fetching buffs" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { buffIds } = await req.json();

        if (!buffIds || !Array.isArray(buffIds)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        await prisma.buff.updateMany({
            where: { id: { in: buffIds } },
            data: { read: true }
        });

        buffsCache = {}; // Invalidate globally on update to be safe
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Mark buffs read error:", e);
        return NextResponse.json({ error: "Error updating buffs" }, { status: 500 });
    }
}
