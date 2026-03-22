import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Quick check to see if DB is responsive
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ status: "healthy", timestamp: new Date().toISOString() });
    } catch (e) {
        console.error("Health check failed:", e);
        return NextResponse.json({ status: "unhealthy", error: "Database unreachable" }, { status: 503 });
    }
}
