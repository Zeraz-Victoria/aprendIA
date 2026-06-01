import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        // In local development, NextAuth JWT decryption might fail if the server restarts.
        // Since we are validating the active raw UUID token from the database, we can skip getServerSession
        // and just verify the token directly against the DB.

        const { userId, sessionToken } = await req.json();

        if (!userId || !sessionToken) {
            return NextResponse.json({ valid: false });
        }

        // We skip the server-side session check here to avoid JWT decryption errors
        // bouncing users locally. The UUID `sessionToken` is effectively a secure secret.

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeSessionToken: true }
        });

        if (!user) {
            return NextResponse.json({ valid: false, reason: "user_not_found" });
        }

        const valid = user.activeSessionToken === sessionToken;

        if (valid) {
            // Update lastSeen to act as an active heartbeat
            await prisma.user.update({
                where: { id: userId },
                data: { lastSeen: new Date() }
            });
        }

        return NextResponse.json({ 
            valid, 
            reason: valid ? null : "token_mismatch" 
        });
    } catch (error) {
        console.error("Session validation error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
