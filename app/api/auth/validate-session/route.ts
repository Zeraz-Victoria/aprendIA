import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId, sessionToken } = await req.json();

        if (!userId || !sessionToken) {
            return NextResponse.json({ valid: false });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeSessionToken: true }
        });

        if (!user) {
            return NextResponse.json({ valid: false });
        }

        const valid = user.activeSessionToken === sessionToken;
        return NextResponse.json({ valid });
    } catch (error) {
        console.error("Session validation error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
