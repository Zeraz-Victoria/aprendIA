import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

let hintsCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 15000;

// GET /api/hints?studentId=xxx — fetch unread hints for a student
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
        }

        // Verify student belongs to school
        const student = await prisma.user.findUnique({ where: { id: studentId, schoolId } });
        if (!student) return NextResponse.json({ error: "Unauthorized access to student" }, { status: 403 });

        const now = Date.now();
        if (hintsCache[studentId] && (now - hintsCache[studentId].timestamp < CACHE_TTL)) {
            return NextResponse.json(hintsCache[studentId].data);
        }

        const hints = await prisma.hint.findMany({
            where: { studentId, read: false },
            orderBy: { createdAt: 'desc' },
        });

        hintsCache[studentId] = { data: hints, timestamp: now };
        return NextResponse.json(hints);
    } catch (error) {
        console.error('Error fetching hints:', error);
        return NextResponse.json({ error: 'Failed to fetch hints' }, { status: 500 });
    }
}

// POST /api/hints — create a new hint from the teacher
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { studentId, message } = body;

        if (!studentId || !message) {
            return NextResponse.json({ error: 'Missing studentId or message' }, { status: 400 });
        }

        // Verify student belongs to school
        const student = await prisma.user.findUnique({ where: { id: studentId, schoolId } });
        if (!student) return NextResponse.json({ error: "Unauthorized student target" }, { status: 403 });

        const hint = await prisma.hint.create({
            data: { studentId, message },
        });

        return NextResponse.json(hint, { status: 201 });
    } catch (error) {
        console.error('Error creating hint:', error);
        return NextResponse.json({ error: 'Failed to create hint' }, { status: 500 });
    }
}

// PATCH /api/hints — mark hints as read
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { hintIds } = body;

        if (!hintIds || !Array.isArray(hintIds)) {
            return NextResponse.json({ error: 'Missing hintIds array' }, { status: 400 });
        }

        await prisma.hint.updateMany({
            where: { id: { in: hintIds } },
            data: { read: true },
        });

        hintsCache = {}; // Global invalidation for simplicity
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking hints as read:', error);
        return NextResponse.json({ error: 'Failed to update hints' }, { status: 500 });
    }
}
