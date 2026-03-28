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

        let whereClause: any = { role: 'STUDENT' };

        // Always filter by schoolId — this ensures ALL students in the school are visible,
        // regardless of whether they were created with teacherOwnerId or not.
        // Filtering by teacherOwnerId caused map assignments to go to wrong duplicate students.
        if (schoolId) {
            whereClause.schoolId = schoolId;
        } else if (role === 'STUDENT') {
            // Fallback for students not formally assigned to a school: fetch just themselves 
            // so the game can load their profile in LearningContext.
            whereClause.id = (session?.user as any)?.id;
        } else {
            // Fallback for edge case: teacher without schoolId — show nobody
            return NextResponse.json([]);
        }

        const students = await prisma.user.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
            include: {
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

        // Map stats to students
        const studentsWithStats = students.map((student: any) => {
            const studentProjectGrades: any[] = [];
            let totalProjectGradesSum = 0;
            const assignedWorldsCount = student.assignedWorlds?.length || 0;

            student.assignedWorlds?.forEach((world: any) => {
                const stats = evidenceStats.find((s: any) => s.studentId === student.id && s.worldId === world.id);
                const sumGrades = stats?._sum?.grade || 0;
                
                let totalLevels = 8; // Default if parsing fails
                try {
                    const days = JSON.parse(world.daysJson);
                    totalLevels = Array.isArray(days) ? days.length : 8;
                } catch (e) {}

                // Cumulative grade: Sum / TotalLevels (e.g. 10 levels * 10 max = 100 points. 100/10 = 10)
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
