import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const schoolId = (session?.user as any)?.schoolId;
    const role = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!schoolId && role !== 'STUDENT') {
        return NextResponse.json({});
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    try {
        const whereClause: any = {};
        // Students only load their own progress (massive speedup)
        if (role === 'STUDENT' && userId) {
            whereClause.studentId = userId;
        } else if (schoolId) {
            whereClause.student = { schoolId };
            if (studentId) {
                whereClause.studentId = studentId;
            }
        }

        const progressList = await prisma.progress.findMany({
            where: whereClause
        });

        // Convert flat list into ProgressMap format: { studentId: { worldId: [levelId] } }
        const progressMap: Record<string, Record<string, number[]>> = {};

        progressList.forEach((p: any) => {
            if (!progressMap[p.studentId]) {
                progressMap[p.studentId] = {};
            }
            if (!progressMap[p.studentId][p.worldId]) {
                progressMap[p.studentId][p.worldId] = [];
            }
            progressMap[p.studentId][p.worldId].push(p.levelId);
        });

        return NextResponse.json(progressMap, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('Error fetching progress:', error);
        return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { studentId, worldId, levelId, isBoss } = await req.json();

        if (!studentId || !worldId || levelId === undefined) {
            return NextResponse.json({ error: 'Missing required progress fields' }, { status: 400 });
        }

        const parsedLevelId = parseInt(String(levelId), 10);
        if (isNaN(parsedLevelId)) {
            return NextResponse.json({ error: 'Invalid levelId' }, { status: 400 });
        }

        // Upsert or Create since uniqueness is on [studentId, worldId, levelId]
        const existingProgress = await prisma.progress.findUnique({
            where: { studentId_worldId_levelId: { studentId, worldId, levelId: parsedLevelId } }
        });

        if (existingProgress) {
            return NextResponse.json({ message: 'Already completed' }, { status: 200 });
        }

        const newProgress = await prisma.progress.create({
            data: {
                studentId,
                worldId,
                levelId: parsedLevelId
            }
        });

        // -- Base Rewards --
        const baseLevelXp = isBoss ? 100 : 50;
        const baseLevelGems = isBoss ? 50 : 0;

        // -- Achievement Verification Logic -- //
        const user = await prisma.user.findUnique({
            where: { id: studentId },
            include: { progress: true, achievements: true }
        });

        if (user) {
            const allAchievements = await prisma.achievement.findMany();
            const earnedAchievementIds = new Set(user.achievements.map((a: any) => a.achievementId));

            const newGrants: string[] = [];
            let totalXpBonus = baseLevelXp;
            let totalGemsBonus = baseLevelGems;

            for (const ach of allAchievements) {
                if (earnedAchievementIds.has(ach.id)) continue; // Already has it

                let conditionMet = false;
                if (ach.condition === "FIRST_LEVEL" && user.progress.length === 1) conditionMet = true;
                if (ach.condition === "STREAK_3" && user.streak >= 3) conditionMet = true;
                if (ach.condition === "LEVELS_10" && user.progress.length >= 10) conditionMet = true;

                if (conditionMet) {
                    newGrants.push(ach.id);
                    totalXpBonus += ach.xpReward;
                }
            }

            if (totalXpBonus > 0 || totalGemsBonus > 0) {
                // Determine if we need to create achievements
                if (newGrants.length > 0) {
                    await prisma.userAchievement.createMany({
                        data: newGrants.map(achId => ({
                            studentId: user.id,
                            achievementId: achId
                        }))
                    });
                }

                // Update User XP & Gems
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        xp: { increment: totalXpBonus },
                        gems: { increment: totalGemsBonus }
                    }
                });
            }
        }

        return NextResponse.json(newProgress, { status: 201 });
    } catch (error: any) {
        // If it violates unique constraint, it means already completed. We can just return success.
        if (error.code === 'P2002') {
            return NextResponse.json({ message: 'Already completed' }, { status: 200 });
        }
        console.error('Error creating progress:', error);
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }
}
