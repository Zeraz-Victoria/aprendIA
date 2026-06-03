import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function calculateChildGlobalAverage(child: any) {
    const assignedWorlds = child.assignedWorlds || [];
    if (assignedWorlds.length === 0) return null;

    let totalProjectGradesSum = 0;
    let gradedWorldsCount = 0;
    assignedWorlds.forEach((world: any) => {
        const worldEvidences = (child.evidenceEntries || []).filter((e: any) => e.worldId === world.id && e.grade !== null);
        if (worldEvidences.length > 0) {
            const sumGrades = worldEvidences.reduce((acc: number, curr: any) => acc + (curr.grade || 0), 0);
            
            let totalLevels = 8;
            try {
                const days = JSON.parse(world.daysJson);
                if (Array.isArray(days) && days.length > 0) {
                    totalLevels = days.length;
                }
            } catch (e) {}

            const projectGrade = totalLevels > 0 ? parseFloat((sumGrades / totalLevels).toFixed(1)) : 0;
            totalProjectGradesSum += projectGrade;
            gradedWorldsCount++;
        }
    });

    return gradedWorldsCount > 0 
        ? parseFloat((totalProjectGradesSum / gradedWorldsCount).toFixed(1))
        : null;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (code) {
            const student = await prisma.user.findFirst({
                where: {
                    studentCode: code.trim().toUpperCase(),
                    role: 'STUDENT'
                },
                include: {
                    assignedWorlds: {
                        select: {
                            id: true,
                            title: true,
                            theme: true,
                            daysJson: true
                        }
                    },
                    progress: {
                        select: {
                            worldId: true,
                            levelId: true
                        }
                    },
                    evidenceEntries: {
                        select: {
                            id: true,
                            worldId: true,
                            levelId: true,
                            isCorrect: true,
                            feedback: true,
                            grade: true,
                            createdAt: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    },
                    behaviorLogsReceived: {
                        include: {
                            category: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            if (!student) {
                return NextResponse.json({ error: 'No se encontró ningún alumno con el código especificado.' }, { status: 404 });
            }

            const parsedWorlds = (student.assignedWorlds || []).map((w: any) => {
                let totalLevels = 8;
                try {
                    const days = JSON.parse(w.daysJson);
                    if (Array.isArray(days)) {
                        totalLevels = days.length;
                    }
                } catch (e) {}
                return {
                    id: w.id,
                    title: w.title,
                    theme: w.theme,
                    totalLevels
                };
            });

            const globalActivityAverage = calculateChildGlobalAverage(student);

            const mappedChild = {
                id: student.id,
                name: student.name,
                avatar: student.avatar,
                gems: student.gems,
                xp: student.xp,
                streak: student.streak,
                lives: student.lives,
                classroomId: student.classroomId,
                globalActivityAverage: globalActivityAverage,
                assignedWorlds: parsedWorlds,
                progress: student.progress,
                evidenceEntries: student.evidenceEntries,
                behaviorLogs: student.behaviorLogsReceived,
                studentCode: student.studentCode
            };

            return NextResponse.json(mappedChild);
        }

        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const parentId = (session?.user as any)?.id;

        if (role !== 'PARENT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const relations = await prisma.parentChild.findMany({
            where: { parentId },
            include: {
                child: {
                    include: {
                        assignedWorlds: {
                            select: {
                                id: true,
                                title: true,
                                theme: true,
                                daysJson: true
                            }
                        },
                        progress: {
                            select: {
                                worldId: true,
                                levelId: true
                            }
                        },
                        evidenceEntries: {
                            select: {
                                id: true,
                                worldId: true,
                                levelId: true,
                                isCorrect: true,
                                feedback: true,
                                grade: true,
                                createdAt: true
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        },
                        behaviorLogsReceived: {
                            include: {
                                category: true
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }
                    }
                }
            }
        });

        const children = relations.map(r => {
            const child = r.child;
            const parsedWorlds = (child.assignedWorlds || []).map((w: any) => {
                let totalLevels = 8;
                try {
                    const days = JSON.parse(w.daysJson);
                    if (Array.isArray(days)) {
                        totalLevels = days.length;
                    }
                } catch (e) {}
                return {
                    id: w.id,
                    title: w.title,
                    theme: w.theme,
                    totalLevels
                };
            });

            const globalActivityAverage = calculateChildGlobalAverage(child);

            return {
                id: child.id,
                name: child.name,
                avatar: child.avatar,
                gems: child.gems,
                xp: child.xp,
                streak: child.streak,
                lives: child.lives,
                classroomId: child.classroomId,
                globalActivityAverage: globalActivityAverage,
                assignedWorlds: parsedWorlds,
                progress: child.progress,
                evidenceEntries: child.evidenceEntries,
                behaviorLogs: child.behaviorLogsReceived
            };
        });

        return NextResponse.json(children);
    } catch (error: any) {
        console.error('Error fetching children:', error);
        return NextResponse.json({ error: `Error del Servidor: ${error.message || 'Failed to fetch children'}` }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const parentId = (session?.user as any)?.id;

        if (role !== 'PARENT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { code, name } = await req.json();

        if (!code && !name) {
            return NextResponse.json({ error: 'Debes ingresar el código de vinculación o el nombre de tu hijo.' }, { status: 400 });
        }

        let student = null;

        if (code) {
            // Buscar estudiante por código de vinculación
            student = await prisma.user.findFirst({
                where: {
                    studentCode: code.trim().toUpperCase(),
                    role: 'STUDENT'
                }
            });
        } else if (name) {
            // Buscar estudiante por nombre exacto (case-insensitive)
            student = await prisma.user.findFirst({
                where: {
                    name: {
                        equals: name.trim(),
                        mode: 'insensitive'
                    },
                    role: 'STUDENT'
                }
            });
        }

        if (!student) {
            return NextResponse.json({ error: 'No se encontró ningún alumno con los datos proporcionados. Verifica que el nombre o código sean correctos.' }, { status: 404 });
        }

        // Verificar si ya está vinculado
        const existingRelation = await prisma.parentChild.findUnique({
            where: {
                parentId_childId: {
                    parentId,
                    childId: student.id
                }
            }
        });

        if (existingRelation) {
            return NextResponse.json({ error: 'Este alumno ya se encuentra vinculado a tu cuenta.' }, { status: 400 });
        }

        // Crear vínculo
        await prisma.parentChild.create({
            data: {
                parentId,
                childId: student.id
            }
        });

        // Obtener el objeto completo para retornarlo de inmediato al cliente
        const childData = await prisma.user.findUnique({
            where: { id: student.id },
            include: {
                assignedWorlds: {
                    select: {
                        id: true,
                        title: true,
                        theme: true,
                        daysJson: true
                    }
                },
                progress: {
                    select: {
                        worldId: true,
                        levelId: true
                    }
                },
                evidenceEntries: {
                    select: {
                        id: true,
                        worldId: true,
                        levelId: true,
                        isCorrect: true,
                        feedback: true,
                        grade: true,
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                behaviorLogsReceived: {
                    include: {
                        category: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!childData) {
            return NextResponse.json({ error: 'Error al cargar los datos del alumno vinculado.' }, { status: 500 });
        }

        const parsedWorlds = (childData.assignedWorlds || []).map((w: any) => {
            let totalLevels = 8;
            try {
                const days = JSON.parse(w.daysJson);
                if (Array.isArray(days)) {
                    totalLevels = days.length;
                }
            } catch (e) {}
            return {
                id: w.id,
                title: w.title,
                theme: w.theme,
                totalLevels
            };
        });

        const globalActivityAverage = calculateChildGlobalAverage(childData);

        const mappedChild = {
            id: childData.id,
            name: childData.name,
            avatar: childData.avatar,
            gems: childData.gems,
            xp: childData.xp,
            streak: childData.streak,
            lives: childData.lives,
            classroomId: childData.classroomId,
            globalActivityAverage: globalActivityAverage,
            assignedWorlds: parsedWorlds,
            progress: childData.progress,
            evidenceEntries: childData.evidenceEntries,
            behaviorLogs: childData.behaviorLogsReceived
        };

        return NextResponse.json({
            success: true,
            message: 'Alumno vinculado correctamente.',
            child: mappedChild
        });

    } catch (error) {
        console.error('Error linking child:', error);
        return NextResponse.json({ error: 'Ocurrió un error en el servidor al intentar vincular.' }, { status: 500 });
    }
}

