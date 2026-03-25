import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withRetry } from "@/lib/db-retry";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const role = (session?.user as any)?.role;
        const userId = (session?.user as any)?.id;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        let studentId = searchParams.get('studentId');

        // If student is logged in, they can only see their own evidence
        if (role === 'STUDENT') {
            studentId = userId;
        }

        if (!studentId) {
            return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
        }

        const evidence = await withRetry(async () => {
            // Verify student belongs to school
            const student = await prisma.user.findFirst({ where: { id: studentId, schoolId } });
            if (!student) {
                return null;
            }

            return await prisma.evidenceEntry.findMany({
                where: { studentId },
                include: {
                    world: {
                        select: {
                            title: true,
                            theme: true,
                            schoolId: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });

        if (evidence === null) {
            return NextResponse.json({ error: "Student not found in your school" }, { status: 404 });
        }

        // Final safety filter: ensure world also matches schoolId (redundant but safe)
        const isolatedEvidence = evidence.filter(e => e.world?.schoolId === schoolId);

        return NextResponse.json(isolatedEvidence);
    } catch (error) {
        console.error("Error fetching evidence:", error);
        return NextResponse.json({ error: "Failed to fetch evidence entries" }, { status: 500 });
    }
}
