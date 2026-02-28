import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
    try {
        // Seed Students
        const studentExist = await prisma.user.count({ where: { role: 'STUDENT' } });
        if (studentExist === 0) {
            const studentsToSeed = [
                { name: "Jimena", avatar: "👩🏻‍🎓", status: "active", lives: 3, gems: 450, streak: 12, xp: 1250 },
                { name: "Mateo", avatar: "👦🏽", status: "needs_help", lives: 2, gems: 120, streak: 2, xp: 400 },
                { name: "Sofia", avatar: "👧🏼", status: "active", lives: 3, gems: 900, streak: 25, xp: 3200 },
                { name: "Lucas", avatar: "🧑🏻", status: "idle", lives: 3, gems: 50, streak: 0, xp: 100 },
            ];

            await prisma.user.createMany({
                data: studentsToSeed.map(s => ({
                    ...s,
                    role: 'STUDENT',
                }))
            });
        }

        // Seed Teacher
        const teacherExist = await prisma.user.count({ where: { role: 'TEACHER' } });
        if (teacherExist === 0) {
            await prisma.user.create({
                data: {
                    name: "Profe",
                    avatar: "👨‍🏫",
                    status: "active",
                    role: 'TEACHER',
                }
            });
        }

        // Seed Achievements
        const achievementsExist = await prisma.achievement.count();
        if (achievementsExist === 0) {
            await prisma.achievement.createMany({
                data: [
                    { name: "Primera Sangre", description: "Completa tu primer nivel interactivo.", icon: "🎯", condition: "FIRST_LEVEL", xpReward: 100 },
                    { name: "Racha Ardiente", description: "Consigue una racha de 3 niveles.", icon: "🔥", condition: "STREAK_3", xpReward: 300 },
                    { name: "Maestro Matemático", description: "Completa 10 niveles en total.", icon: "👑", condition: "LEVELS_10", xpReward: 1000 },
                ]
            });
        }

        // Seed Raid Boss
        const raidBossExist = await prisma.raidBoss.count();
        if (raidBossExist === 0) {
            await prisma.raidBoss.create({
                data: {
                    name: "El Dragón del Álgebra",
                    imageUrl: "🐉",
                    maxHealth: 10000,
                    currentHealth: 10000,
                    status: "ACTIVE"
                }
            });
        }

        return NextResponse.json({ message: 'Seeded successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error seeding users:', error);
        return NextResponse.json({ error: 'Failed to seed users' }, { status: 500 });
    }
}
