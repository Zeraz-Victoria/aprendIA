import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Ensure user is authenticated and is a TEACHER
        if (!session?.user || (session.user as any).role !== "TEACHER") {
            return NextResponse.json({ error: "Unauthorized. Solo los maestros pueden otorgar gemas." }, { status: 403 });
        }

        const teacherId = (session.user as any).id;
        const { studentId, gemsToAdd } = await req.json();

        if (!studentId || gemsToAdd === undefined) {
            return NextResponse.json({ error: "Faltan datos requeridos (studentId, gemsToAdd)" }, { status: 400 });
        }

        const gemsAmount = parseInt(gemsToAdd, 10);
        if (isNaN(gemsAmount)) {
            return NextResponse.json({ error: "La cantidad de gemas debe ser un número válido." }, { status: 400 });
        }

        // Verify the student actually belongs to this teacher
        const student = await prisma.user.findFirst({
            where: {
                id: studentId,
                role: "STUDENT",
                teacherOwnerId: teacherId
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Estudiante no encontrado o no pertenece a tu clase." }, { status: 404 });
        }

        // Calculate new gem total (preventing negative total gems if withdrawing)
        const currentGems = student.gems || 0;
        const newTotal = Math.max(0, currentGems + gemsAmount);

        // Update the student's gems
        const updatedStudent = await prisma.user.update({
            where: { id: studentId },
            data: { gems: newTotal }
        });

        return NextResponse.json({
            success: true,
            message: gemsAmount >= 0 ? `Se sumaron ${gemsAmount} gemas.` : `Se restaron ${Math.abs(gemsAmount)} gemas.`,
            newTotal: updatedStudent.gems
        });

    } catch (error) {
        console.error("Error awarding gems:", error);
        return NextResponse.json({ error: "Error interno del servidor al modificar gemas" }, { status: 500 });
    }
}
