import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const role = (session?.user as any)?.role;
        const teacherId = (session?.user as any)?.id;

        if (!schoolId && role !== 'TEACHER' && role !== 'STUDENT') {
            return NextResponse.json([]);
        }

        // === FAST PATH: Students only need their own profile ===
        if (role === 'STUDENT') {
            const studentId = (session?.user as any)?.id;
            if (!studentId) return NextResponse.json([]);

            const student = await prisma.user.findUnique({
                where: { id: studentId },
                include: {
                    assignedWorlds: true,
                    projectGrades: true
                }
            });

            if (!student) return NextResponse.json([]);

            // Compute activity grades for just this one student
            const evidenceStats = await prisma.evidenceEntry.groupBy({
                by: ['worldId'],
                where: { studentId, grade: { not: null } },
                _sum: { grade: true }
            });

            const studentProjectGrades: any[] = [];
            let totalProjectGradesSum = 0;
            const assignedWorldsCount = student.assignedWorlds?.length || 0;

            student.assignedWorlds?.forEach((world: any) => {
                const stats = evidenceStats.find((s: any) => s.worldId === world.id);
                const sumGrades = stats?._sum?.grade || 0;
                let totalLevels = 8;
                try {
                    const days = JSON.parse(world.daysJson);
                    totalLevels = Array.isArray(days) ? days.length : 8;
                } catch (e) {}
                const projectGrade = parseFloat((sumGrades / totalLevels).toFixed(1));
                studentProjectGrades.push({ worldId: world.id, averageGrade: projectGrade });
                totalProjectGradesSum += projectGrade;
            });

            const globalGrade = assignedWorldsCount > 0
                ? parseFloat((totalProjectGradesSum / assignedWorldsCount).toFixed(1))
                : null;

            return NextResponse.json([{
                ...student,
                automaticProjectGrades: studentProjectGrades,
                globalActivityAverage: globalGrade
            }], {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            });
        }

        // === TEACHER / ADMIN PATH: fetch all students in the school ===
        let whereClause: any = { role: 'STUDENT' };

        if (schoolId) {
            whereClause.schoolId = schoolId;
        } else {
            return NextResponse.json([]);
        }

        const students = await prisma.user.findMany({
            where: whereClause,
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
        });

        // Fetch activity-based stats for each student and world
        const evidenceStats = await prisma.evidenceEntry.groupBy({
            by: ['studentId', 'worldId'],
            where: {
                student: { schoolId },
                grade: { not: null }
            },
            _sum: { grade: true }
        });

        // Pre-parse the number of levels for each world involved
        const worldLevelsCount: Record<string, number> = {};
        
        // Map stats to students efficiently via a Map
        const statsMap = new Map();
        evidenceStats.forEach(s => {
            const key = `${s.studentId}_${s.worldId}`;
            statsMap.set(key, s._sum?.grade || 0);
        });

        const studentsWithStats = students.map((student: any) => {
            const studentProjectGrades: any[] = [];
            let totalProjectGradesSum = 0;
            const assignedWorldsCount = student.assignedWorlds?.length || 0;

            student.assignedWorlds?.forEach((world: any) => {
                const key = `${student.id}_${world.id}`;
                const sumGrades = statsMap.get(key) || 0;
                
                let totalLevels = 8;
                if (worldLevelsCount[world.id] !== undefined) {
                    totalLevels = worldLevelsCount[world.id];
                } else {
                    try {
                        const days = JSON.parse(world.daysJson);
                        totalLevels = Array.isArray(days) ? days.length : 8;
                        worldLevelsCount[world.id] = totalLevels;
                    } catch (e) {
                         worldLevelsCount[world.id] = 8;
                    }
                }

                const projectGrade = parseFloat((sumGrades / totalLevels).toFixed(1));
                studentProjectGrades.push({
                    worldId: world.id,
                    averageGrade: projectGrade
                });
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

        return NextResponse.json(studentsWithStats, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const schoolId = (session?.user as any)?.schoolId;
        const teacherId = (session?.user as any)?.id;
        const role = (session?.user as any)?.role;

        const body = await req.json();
        const { name, avatar, classroomId } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }

        if (schoolId) {
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                include: { _count: { select: { users: { where: { role: 'STUDENT' } } } } }
            });

            if (school) {
                if (school.subscriptionStatus === 'SUSPENDED') {
                    return NextResponse.json({ error: 'Cuenta suspendida. Contacte al administrador.' }, { status: 403 });
                }
                if (school._count.users >= school.maxStudents) {
                    return NextResponse.json({ error: `Has alcanzado el límite de ${school.maxStudents} alumno(s) para tu plan actual.` }, { status: 403 });
                }
            }
        }

        // Logic logic logic logic logic logic logic logic logic logic logic logic logic

        // Generate a 6-character unique student code
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like I, O, 1, 0
        let newStudentCode = '';
        let isUnique = false;

        while (!isUnique) {
            newStudentCode = '';
            for (let i = 0; i < 6; i++) {
                newStudentCode += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            // Check if it's truly unique in the DB
            const existingUser = await prisma.user.findFirst({
                where: { studentCode: newStudentCode }
            });
            if (!existingUser) {
                isUnique = true;
            }
        }

        const student = await prisma.user.create({
            data: {
                name: name.trim(),
                avatar: avatar || '🧑🏻',
                role: 'STUDENT',
                status: 'active',
                studentCode: newStudentCode,
                lives: 3,
                gems: 0,
                streak: 0,
                xp: 0,
                classroomId: classroomId || null,
                schoolId: schoolId || null,
                teacherOwnerId: role === 'TEACHER' ? teacherId : null,
            }
        });

        // Auto-assign existing worlds from this school to the new student
        if (schoolId) {
            const schoolWorlds = await prisma.world.findMany({
                where: { schoolId },
                select: { id: true }
            });

            if (schoolWorlds.length > 0) {
                await prisma.user.update({
                    where: { id: student.id },
                    data: {
                        assignedWorlds: {
                            connect: schoolWorlds.map((w: { id: string }) => ({ id: w.id }))
                        }
                    }
                });
            }
        }

        const updatedStudent = await prisma.user.findUnique({
            where: { id: student.id },
            include: { assignedWorlds: true }
        });

        return NextResponse.json(updatedStudent, { status: 201 });
    } catch (error) {
        console.error('Error creating student:', error);
        return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }
}
