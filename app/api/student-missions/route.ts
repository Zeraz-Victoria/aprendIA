import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/student-missions?studentId=xxx&worldId=yyy
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const worldId = searchParams.get('worldId');

        if (!studentId || !worldId) {
            return NextResponse.json({ error: 'Missing studentId or worldId' }, { status: 400 });
        }

        const mission = await prisma.studentMission.findUnique({
            where: { studentId_worldId: { studentId, worldId } }
        });

        if (!mission) {
            return NextResponse.json({ days: [] });
        }

        return NextResponse.json({ days: JSON.parse(mission.daysJson) });
    } catch (error) {
        console.error('Error fetching student missions:', error);
        return NextResponse.json({ error: 'Failed to fetch student missions' }, { status: 500 });
    }
}

// POST /api/student-missions — create or append missions for a student
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { studentId, worldId, days, replace } = body;

        if (!studentId || !worldId || !days || !Array.isArray(days)) {
            return NextResponse.json({ error: 'Missing studentId, worldId, or days array' }, { status: 400 });
        }

        // Check if there's already a mission record for this student+world
        const existing = await prisma.studentMission.findUnique({
            where: { studentId_worldId: { studentId, worldId } }
        });

        if (existing) {
            // Append the new days to the existing ones
            const existingDays = JSON.parse(existing.daysJson);
            const merged = replace ? days : [...existingDays, ...days];
            const updated = await prisma.studentMission.update({
                where: { id: existing.id },
                data: { daysJson: JSON.stringify(merged) }
            });
            return NextResponse.json({ days: JSON.parse(updated.daysJson) });
        } else {
            // Create new record
            const created = await prisma.studentMission.create({
                data: {
                    studentId,
                    worldId,
                    daysJson: JSON.stringify(days)
                }
            });
            return NextResponse.json({ days: JSON.parse(created.daysJson) }, { status: 201 });
        }
    } catch (error) {
        console.error('Error creating student mission:', error);
        return NextResponse.json({ error: 'Failed to create student mission' }, { status: 500 });
    }
}
