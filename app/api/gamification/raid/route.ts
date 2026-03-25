import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

let bossCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 15000;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json(null);
        }

        const now = Date.now();
        if (bossCache[schoolId] && (now - bossCache[schoolId].timestamp < CACHE_TTL)) {
            return NextResponse.json(bossCache[schoolId].data);
        }

        const activeBoss = await prisma.raidBoss.findFirst({
            where: { schoolId },
            orderBy: { createdAt: "desc" },
            include: {
                contributions: {
                    include: { student: { select: { id: true, name: true, avatar: true } } },
                    orderBy: { damageDealt: "desc" }
                }
            }
        });

        if (!activeBoss) {
            return NextResponse.json(null);
        }

        // Aggregate contributions per student
        const contributionMap: Record<string, { name: string; avatar: string | null; totalDamage: number }> = {};
        for (const c of activeBoss.contributions) {
            if (!contributionMap[c.studentId]) {
                contributionMap[c.studentId] = { name: c.student.name || "Anónimo", avatar: c.student.avatar, totalDamage: 0 };
            }
            contributionMap[c.studentId].totalDamage += c.damageDealt;
        }
        const topContributors = Object.values(contributionMap)
            .sort((a, b) => b.totalDamage - a.totalDamage)
            .slice(0, 5);

        const responseData = {
            ...activeBoss,
            topContributors
        };
        bossCache[schoolId] = { data: responseData, timestamp: now };
        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error in Raid Boss GET:", error);
        return NextResponse.json({ error: "Failed to fetch boss" }, { status: 500 });
    }
}

import { pusherServer } from "@/lib/pusher";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { studentId, damage } = await req.json();

        if (!studentId || !damage) {
            return NextResponse.json({ error: "Missing payload" }, { status: 400 });
        }

        const activeBoss = await prisma.raidBoss.findFirst({
            where: { status: "ACTIVE", schoolId },
            orderBy: { createdAt: "desc" }
        });

        if (!activeBoss) {
            return NextResponse.json({ message: "No active boss" }, { status: 404 });
        }

        // Perform all writes in a single transaction to prevent connection exhaustion and race conditions
        const [updatedBoss] = await prisma.$transaction([
            prisma.raidBoss.update({
                where: { id: activeBoss.id },
                data: { currentHealth: { decrement: damage } }
            }),
            prisma.raidContribution.create({
                data: {
                    raidBossId: activeBoss.id,
                    studentId,
                    damageDealt: damage
                }
            }),
            prisma.user.update({
                where: { id: studentId },
                data: {
                    gems: { decrement: 5 },
                    xp: { increment: Math.floor(damage / 2) }
                }
            })
        ]);

        let newHealth = Math.max(0, updatedBoss.currentHealth);

        // If health drops to/below 0, we do a quick status update
        if (newHealth === 0 && activeBoss.status !== "DEFEATED") {
            await prisma.raidBoss.update({
                where: { id: activeBoss.id },
                data: { currentHealth: 0, status: "DEFEATED" }
            });
        }

        // Trigger Real-Time sync
        try {
            await pusherServer.trigger('raid-boss', 'hp-update', {
                bossId: activeBoss.id,
                currentHealth: newHealth,
                maxHealth: activeBoss.maxHealth,
                attackerId: studentId,
                damageAmount: damage
            });
        } catch (e) {
            console.error("Pusher trigger error (probably missing keys, safe to ignore locally):", e);
        }

        return NextResponse.json({ currentHealth: newHealth });
    } catch (error) {
        return NextResponse.json({ error: "Attack failed" }, { status: 500 });
    }
}

// PUT — Create a new Raid Boss (Teacher action)
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, imageUrl, maxHealth } = await req.json();

        if (!name || !imageUrl || !maxHealth) {
            return NextResponse.json({ error: "Missing name, imageUrl, or maxHealth" }, { status: 400 });
        }

        // Deactivate any current active boss for THIS school
        await prisma.raidBoss.updateMany({
            where: { status: "ACTIVE", schoolId },
            data: { status: "DEFEATED" }
        });

        // Create the new boss
        const newBoss = await prisma.raidBoss.create({
            data: {
                name,
                imageUrl,
                maxHealth: parseInt(maxHealth),
                currentHealth: parseInt(maxHealth),
                status: "ACTIVE",
                schoolId
            }
        });

        return NextResponse.json(newBoss);
    } catch (error) {
        console.error("Create boss error:", error);
        return NextResponse.json({ error: "Failed to create boss" }, { status: 500 });
    }
}

// PATCH — Reset boss HP or update boss (Teacher action)
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;

        if (!schoolId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { action, maxHealth, name, imageUrl } = await req.json();

        const activeBoss = await prisma.raidBoss.findFirst({
            where: { status: "ACTIVE", schoolId },
            orderBy: { createdAt: "desc" }
        });

        if (!activeBoss) {
            return NextResponse.json({ error: "No active boss" }, { status: 404 });
        }

        if (action === "reset") {
            const hp = maxHealth ? parseInt(maxHealth) : activeBoss.maxHealth;
            const updated = await prisma.raidBoss.update({
                where: { id: activeBoss.id },
                data: { currentHealth: hp, maxHealth: hp, status: "ACTIVE" }
            });
            return NextResponse.json(updated);
        }

        if (action === "update") {
            const dataToUpdate: any = {};
            if (name) dataToUpdate.name = name;
            if (imageUrl) dataToUpdate.imageUrl = imageUrl;
            if (maxHealth) {
                dataToUpdate.maxHealth = parseInt(maxHealth);
                dataToUpdate.currentHealth = parseInt(maxHealth);
            }
            const updated = await prisma.raidBoss.update({
                where: { id: activeBoss.id },
                data: dataToUpdate
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("Patch boss error:", error);
        return NextResponse.json({ error: "Failed to update boss" }, { status: 500 });
    }
}
