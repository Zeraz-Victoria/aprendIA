import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const activeBoss = await prisma.raidBoss.findFirst({
            where: { status: "ACTIVE" },
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

        return NextResponse.json({
            ...activeBoss,
            topContributors
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch boss" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { studentId, damage } = await req.json();

        if (!studentId || !damage) {
            return NextResponse.json({ error: "Missing payload" }, { status: 400 });
        }

        const activeBoss = await prisma.raidBoss.findFirst({
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" }
        });

        if (!activeBoss) {
            return NextResponse.json({ message: "No active boss" }, { status: 404 });
        }

        // Deduct health
        const newHealth = Math.max(0, activeBoss.currentHealth - damage);

        await prisma.raidBoss.update({
            where: { id: activeBoss.id },
            data: {
                currentHealth: newHealth,
                status: newHealth === 0 ? "DEFEATED" : "ACTIVE"
            }
        });

        // Record Contribution
        await prisma.raidContribution.create({
            data: {
                raidBossId: activeBoss.id,
                studentId,
                damageDealt: damage
            }
        });

        // Deduct 5 gems and reward XP
        await prisma.user.update({
            where: { id: studentId },
            data: {
                gems: { decrement: 5 },
                xp: { increment: Math.floor(damage / 2) }
            }
        });

        return NextResponse.json({ currentHealth: newHealth });
    } catch (error) {
        return NextResponse.json({ error: "Attack failed" }, { status: 500 });
    }
}

// PUT — Create a new Raid Boss (Teacher action)
export async function PUT(req: Request) {
    try {
        const { name, imageUrl, maxHealth } = await req.json();

        if (!name || !imageUrl || !maxHealth) {
            return NextResponse.json({ error: "Missing name, imageUrl, or maxHealth" }, { status: 400 });
        }

        // Deactivate any current active boss
        await prisma.raidBoss.updateMany({
            where: { status: "ACTIVE" },
            data: { status: "DEFEATED" }
        });

        // Create the new boss
        const newBoss = await prisma.raidBoss.create({
            data: {
                name,
                imageUrl,
                maxHealth: parseInt(maxHealth),
                currentHealth: parseInt(maxHealth),
                status: "ACTIVE"
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
        const { action, maxHealth } = await req.json();

        const activeBoss = await prisma.raidBoss.findFirst({
            where: { status: "ACTIVE" },
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

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("Patch boss error:", error);
        return NextResponse.json({ error: "Failed to update boss" }, { status: 500 });
    }
}
