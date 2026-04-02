import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

/**
 * Single bootstrap endpoint for teachers/admins.
 * Consolidates 6+ parallel requests into ONE burst.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const role = (session?.user as any)?.role;
        const teacherId = (session?.user as any)?.id;

        if ((role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPERADMIN') || !schoolId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Run ALL primary queries in parallel
        const [dbStudents, dbWorlds, dbClassrooms, dbGrades, progressList, inventoryList] = await Promise.all([
            // 1. Students in school
            prisma.user.findMany({
                where: { schoolId, role: 'STUDENT' },
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                    status: true,
                    lives: true,
                    gems: true,
                    streak: true,
                    xp: true,
                    classroomId: true,
                    activeFrame: true,
                    studentCode: true,
                    lastSeen: true,
                    assignedWorlds: true,
                    projectGrades: true
                }
            }),

            // 2. Worlds in school (or by teacher)
            prisma.world.findMany({
                where: role === 'TEACHER' ? { teacherId } : { schoolId },
                orderBy: { createdAt: 'asc' },
                include: {
                    classrooms: true,
                    assignedStudents: { select: { id: true, name: true } }
                }
            }),

            // 3. Classrooms
            prisma.classroom.findMany({
                where: role === 'TEACHER' ? { teacherId } : { schoolId },
                include: { _count: { select: { students: true } } },
                orderBy: { createdAt: "desc" }
            }),

            // 4. Grades
            prisma.grade.findMany({
                where: role === 'TEACHER' ? { teacherId } : { schoolId },
                orderBy: { name: 'asc' }
            }),

            // 5. Progress for school
            prisma.progress.findMany({
                where: { student: { schoolId } }
            }),

            // 6. Inventory for school
            prisma.inventory.findMany({
                where: { student: { schoolId } }
            })
        ]);

        // === Post-Processing (similar to existing route logic) ===

        // Pre-parse world level counts for grade calculation
        const worldLevelsCount: Record<string, number> = {};
        const parsedWorlds = dbWorlds.map(w => {
            const days = JSON.parse(w.daysJson);
            worldLevelsCount[w.id] = Array.isArray(days) ? days.length : 8;
            return {
                ...w,
                days,
                pedagogy: w.pedagogyJson ? JSON.parse(w.pedagogyJson) : undefined
            };
        });

        // Fetch activity grades (grouped by student/world)
        const evidenceStats = await prisma.evidenceEntry.groupBy({
            by: ['studentId', 'worldId'],
            where: { student: { schoolId }, grade: { not: null } },
            _sum: { grade: true }
        });

        const statsMap = new Map();
        evidenceStats.forEach(s => {
            statsMap.set(`${s.studentId}_${s.worldId}`, s._sum?.grade || 0);
        });

        const studentsWithStats = dbStudents.map((student: any) => {
            // Merge explicit individual assignments and implicit classroom assignments
            const implicitWorlds = student.classroomId 
                ? parsedWorlds.filter(w => w.classrooms?.some((c: any) => c.id === student.classroomId))
                : [];
            
            const allAssignedMap = new Map();
            (student.assignedWorlds || []).forEach((w: any) => allAssignedMap.set(w.id, { id: w.id, title: w.title, theme: w.theme }));
            implicitWorlds.forEach((w: any) => allAssignedMap.set(w.id, { id: w.id, title: w.title, theme: w.theme }));
            
            student.assignedWorlds = Array.from(allAssignedMap.values());

            const studentProjectGrades: any[] = [];
            let totalProjectGradesSum = 0;
            const assignedWorldsCount = student.assignedWorlds.length;

            student.assignedWorlds.forEach((world: any) => {
                const sumGrades = statsMap.get(`${student.id}_${world.id}`) || 0;
                const totalLevels = worldLevelsCount[world.id] || 8;
                const projectGrade = parseFloat((sumGrades / totalLevels).toFixed(1));
                
                studentProjectGrades.push({ worldId: world.id, averageGrade: projectGrade });
                totalProjectGradesSum += projectGrade;
            });

            const globalGrade = assignedWorldsCount > 0 
                ? parseFloat((totalProjectGradesSum / assignedWorldsCount).toFixed(1))
                : null;

            return {
                ...student,
                automaticProjectGrades: studentProjectGrades,
                globalActivityAverage: globalGrade
            };
        });

        // Progress Map: { studentId: { worldId: [levelId] } }
        const progressMap: Record<string, Record<string, number[]>> = {};
        progressList.forEach((p: any) => {
            if (!progressMap[p.studentId]) progressMap[p.studentId] = {};
            if (!progressMap[p.studentId][p.worldId]) progressMap[p.studentId][p.worldId] = [];
            progressMap[p.studentId][p.worldId].push(p.levelId);
        });

        // Inventory Map: { studentId: [itemId] }
        const inventoryMap: Record<string, string[]> = {};
        inventoryList.forEach((inv: any) => {
            if (!inventoryMap[inv.studentId]) inventoryMap[inv.studentId] = [];
            inventoryMap[inv.studentId].push(inv.itemId);
        });

        return NextResponse.json({
            students: studentsWithStats,
            worlds: parsedWorlds,
            classrooms: dbClassrooms,
            grades: dbGrades,
            progress: progressMap,
            inventory: inventoryMap
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error('Teacher Bootstrap error:', error);
        return NextResponse.json({ error: 'Failed to bootstrap teacher data' }, { status: 500 });
    }
}
