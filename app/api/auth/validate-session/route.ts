import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
    try {
        // Requiere sesión activa — solo usuarios autenticados pueden validar su token
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ valid: false });
        }

        const { userId, sessionToken } = await req.json();

        if (!userId || !sessionToken) {
            return NextResponse.json({ valid: false });
        }

        // El usuario solo puede validar su propia sesión
        const sessionUserId = (session.user as any)?.id;
        if (sessionUserId !== userId) {
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
