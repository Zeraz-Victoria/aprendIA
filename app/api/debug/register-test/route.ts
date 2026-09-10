import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const results: Record<string, any> = {};

    // Test 1: Can we query RegistrationFingerprint table?
    try {
        const count = await prisma.registrationFingerprint.count();
        results.registrationFingerprint = { ok: true, count };
    } catch (e: any) {
        results.registrationFingerprint = { ok: false, error: e.message?.substring(0, 300) };
    }

    // Test 2: Can we query School table?
    try {
        const count = await prisma.school.count();
        results.school = { ok: true, count };
    } catch (e: any) {
        results.school = { ok: false, error: e.message?.substring(0, 300) };
    }

    // Test 3: Can we query User table (TEACHER role)?
    try {
        const teachers = await prisma.user.findMany({
            where: { role: "TEACHER" },
            select: { id: true, name: true, schoolId: true }
        });
        results.teachers = { ok: true, count: teachers.length, list: teachers.map(t => ({ id: t.id, name: t.name, schoolId: t.schoolId })) };
    } catch (e: any) {
        results.teachers = { ok: false, error: e.message?.substring(0, 300) };
    }

    // Test 4: Can we create a School?
    try {
        const testSchool = await prisma.school.create({
            data: {
                name: "__DEBUG_TEST_SCHOOL__",
                subscriptionPlan: "BASIC",
                maxMaps: 1,
                maxStudents: 25,
                subscriptionStatus: "ACTIVE"
            }
        });
        // Clean up immediately
        await prisma.school.delete({ where: { id: testSchool.id } });
        results.schoolCreate = { ok: true };
    } catch (e: any) {
        results.schoolCreate = { ok: false, error: e.message?.substring(0, 500) };
    }

    // Test 5: Check what columns exist in User table
    try {
        const cols = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'User' 
            ORDER BY ordinal_position
        `;
        results.userColumns = { ok: true, columns: cols };
    } catch (e: any) {
        results.userColumns = { ok: false, error: e.message?.substring(0, 300) };
    }

    // Test 6: Check what columns exist in School table
    try {
        const cols = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'School' 
            ORDER BY ordinal_position
        `;
        results.schoolColumns = { ok: true, columns: cols };
    } catch (e: any) {
        results.schoolColumns = { ok: false, error: e.message?.substring(0, 300) };
    }

    // Test 7: Check all tables in DB
    try {
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        results.allTables = { ok: true, tables };
    } catch (e: any) {
        results.allTables = { ok: false, error: e.message?.substring(0, 300) };
    }

    return NextResponse.json(results, { status: 200 });
}
