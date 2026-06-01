import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schools = await prisma.school.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: {
                        users: { where: { role: "TEACHER" } },
                        classrooms: true,
                        worlds: true
                    }
                }
            }
        });

        return NextResponse.json(schools);
    } catch (error) {
        console.error("Error fetching schools:", error);
        return NextResponse.json({ error: "Failed to fetch schools" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { name } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const school = await prisma.school.create({
            data: { name: name.trim() }
        });

        return NextResponse.json(school, { status: 201 });
    } catch (error) {
        console.error("Error creating school:", error);
        return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
    }
}
