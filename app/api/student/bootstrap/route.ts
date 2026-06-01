import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * Single bootstrap endpoint for students.
 * Returns ALL data needed to render the student page in ONE request.
 * This eliminates 7+ round trips through the Cloudflare tunnel.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const studentId = (session?.user as any)?.id;
        const schoolId = (session?.user as any)?.schoolId;

        if (role !== 'STUDENT' || !studentId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Run ALL queries in parallel — single DB round trip burst
        const [student, progressList, inventoryList, hintsList, evidenceList, messagesList] = await Promise.all([
            // 1. Student profile with assigned worlds and project grades
            prisma.user.findUnique({
                where: { id: studentId },
                include: {
                    assignedWorlds: true,
                    projectGrades: true,
                    classroom: {
                        include: {
                            worlds: true
                        }
                    }
                }
            }),

            // 2. Student's progress
            prisma.progress.findMany({
                where: { studentId }
            }),

            // 3. Student's inventory
            prisma.inventory.findMany({
                where: { studentId }
            }),

            // 4. Unread hints
            prisma.hint.findMany({
                where: { studentId, read: false },
                orderBy: { createdAt: 'desc' }
            }),

            // 5. Evidence/evaluations
            prisma.evidenceEntry.findMany({
                where: { studentId },
                orderBy: { createdAt: 'desc' },
                include: { world: { select: { title: true, theme: true } } }
            }),

            // 6. Teacher messages (last 30 days)
            schoolId ? prisma.teacherMessage.findMany({
                where: {
                    schoolId,
                    OR: [
                        { isGlobal: true },
                        { recipients: { some: { id: studentId } } }
                    ],
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { sender: { select: { name: true } } }
            }) : Promise.resolve([])
        ]);

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // COMBINE INDIVIDUAL AND CLASSROOM WORLDS - NO DUPLICATES
        const individualWorlds = student.assignedWorlds || [];
        const classroomWorlds = (student as any).classroom?.worlds || [];
        
        // Merge without duplicates by ID
        const worldMap = new Map();
        [...individualWorlds, ...classroomWorlds].forEach(w => {
            if (!worldMap.has(w.id)) {
                worldMap.set(w.id, w);
            }
        });
        const allWorlds = Array.from(worldMap.values());

        // Compute activity grades for this student
        const evidenceStats = await prisma.evidenceEntry.groupBy({
            by: ['worldId'],
            where: { studentId, grade: { not: null } },
            _sum: { grade: true }
        });

        const automaticProjectGrades: any[] = [];
        let totalProjectGradesSum = 0;
        const assignedWorldsCount = allWorlds.length;

        allWorlds.forEach((world: any) => {
            const stats = evidenceStats.find((s: any) => s.worldId === world.id);
            const sumGrades = stats?._sum?.grade || 0;
            let totalLevels = 8;
            try {
                const days = JSON.parse(world.daysJson);
                totalLevels = Array.isArray(days) ? days.length : 8;
            } catch (e) {}
            const projectGrade = parseFloat((sumGrades / totalLevels).toFixed(1));
            automaticProjectGrades.push({ worldId: world.id, averageGrade: projectGrade });
            totalProjectGradesSum += projectGrade;
        });

        const globalActivityAverage = assignedWorldsCount > 0
            ? parseFloat((totalProjectGradesSum / assignedWorldsCount).toFixed(1))
            : null;

        // Build progress map: { studentId: { worldId: [levelId] } }
        const progressMap: Record<string, Record<string, number[]>> = {};
        progressList.forEach((p: any) => {
            if (!progressMap[p.studentId]) progressMap[p.studentId] = {};
            if (!progressMap[p.studentId][p.worldId]) progressMap[p.studentId][p.worldId] = [];
            progressMap[p.studentId][p.worldId].push(p.levelId);
        });

        // Build inventory map: { studentId: [itemId] }
        const inventoryMap: Record<string, string[]> = {};
        inventoryList.forEach((inv: any) => {
            if (!inventoryMap[inv.studentId]) inventoryMap[inv.studentId] = [];
            inventoryMap[inv.studentId].push(inv.itemId);
        });

        // Parse assigned worlds for frontend
        const parsedWorlds = allWorlds.map((w: any) => ({
            ...w,
            days: w.daysJson ? JSON.parse(w.daysJson) : (w.days || []),
            pedagogy: w.pedagogyJson ? JSON.parse(w.pedagogyJson) : undefined
        })) || [];

        return NextResponse.json({
            user: {
                ...student,
                assignedWorlds: parsedWorlds, // Sync individual + classroom worlds
                automaticProjectGrades,
                globalActivityAverage
            },
            worlds: parsedWorlds,
            progress: progressMap,
            inventory: inventoryMap,
            hints: hintsList,
            evaluations: evidenceList,
            messages: messagesList
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('Bootstrap error:', error);
        return NextResponse.json({ error: 'Failed to bootstrap' }, { status: 500 });
    }
}
