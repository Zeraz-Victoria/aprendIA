import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, password, fingerprint } = body;

        if (!name?.trim() || !password?.trim()) {
            return NextResponse.json(
                { error: "El nombre y la contraseña son obligatorios." },
                { status: 400 }
            );
        }

        const cleanName = name.trim();
        const cleanPassword = password.trim();

        if (cleanPassword.length < 4) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 4 caracteres." },
                { status: 400 }
            );
        }

        // Obtener IP del cliente para doble seguridad
        const forwardedFor = req.headers.get("x-forwarded-for");
        const realIp = req.headers.get("x-real-ip");
        const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : (realIp || null);

        // 1. CANDADO ANTI-ABUSO: Verificar si el dispositivo o IP ya creó una prueba gratis
        // Wrapped in try-catch in case RegistrationFingerprint table doesn't exist yet
        try {
            if (fingerprint) {
                const existingFingerprint = await prisma.registrationFingerprint.findUnique({
                    where: { fingerprint }
                });

                if (existingFingerprint) {
                    return NextResponse.json(
                        {
                            error: "Ya se ha creado una cuenta de prueba gratuita en este dispositivo. Contacta al administrador al 2723303963 para contratar un plan."
                        },
                        { status: 400 }
                    );
                }
            }

            if (ipAddress && ipAddress !== "127.0.0.1" && ipAddress !== "::1") {
                const existingIp = await prisma.registrationFingerprint.findFirst({
                    where: { ipAddress }
                });

                if (existingIp) {
                    return NextResponse.json(
                        {
                            error: "Ya se ha creado una cuenta de prueba gratuita desde esta red de internet. Contacta al administrador al 2723303963 para activar tu plan."
                        },
                        { status: 400 }
                    );
                }
            }
        } catch (fingerprintError) {
            // Table may not exist in production yet — skip fingerprint check
            console.warn("RegistrationFingerprint check skipped (table may not exist):", fingerprintError);
        }

        // 2. Verificar si ya existe un usuario con este nombre
        const existingUser = await prisma.user.findFirst({
            where: {
                name: { equals: cleanName, mode: "insensitive" }
            }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Ya existe una cuenta registrada con este nombre. Por favor ingresa o utiliza un nombre distinto." },
                { status: 400 }
            );
        }

        // 3. Configurar los 3 DÍAS GRATIS en el PLAN MEDIO (INTERMEDIATE: 5 mapas, 50 alumnos)
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 72 horas

        let school;
        try {
            school = await prisma.school.create({
                data: {
                    name: `Licencia de ${cleanName}`,
                    subscriptionPlan: "INTERMEDIATE",
                    maxMaps: 5,
                    maxStudents: 50,
                    subscriptionStatus: "ACTIVE",
                    trialEndsAt: trialEndsAt
                }
            });
        } catch (schoolError: any) {
            console.error("Error creating school (possibly missing columns):", schoolError);
            // Try minimal school creation without optional fields
            try {
                school = await prisma.school.create({
                    data: {
                        name: `Licencia de ${cleanName}`,
                        subscriptionPlan: "INTERMEDIATE",
                        subscriptionStatus: "ACTIVE"
                    }
                });
            } catch (schoolError2: any) {
                console.error("Error creating minimal school:", schoolError2);
                return NextResponse.json(
                    { error: "Error al crear la licencia. La base de datos puede necesitar actualización. Contacta al administrador.", detail: schoolError2.message?.substring(0, 200) },
                    { status: 500 }
                );
            }
        }

        // 4. Hashear la contraseña
        const hashedPassword = await bcrypt.hash(cleanPassword, 10);

        // 5. Crear la cuenta de docente
        const teacher = await prisma.user.create({
            data: {
                name: cleanName,
                password: hashedPassword,
                role: "TEACHER",
                schoolId: school.id,
                avatar: "👨‍🏫"
            }
        });

        // 6. Guardar el candado de registro por dispositivo/IP (non-blocking)
        if (fingerprint) {
            try {
                await prisma.registrationFingerprint.create({
                    data: {
                        fingerprint,
                        ipAddress: ipAddress || undefined
                    }
                });
            } catch (err) {
                console.warn("Error guardando fingerprint de registro (tabla puede no existir):", err);
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: "¡Cuenta creada exitosamente con 3 días gratis de Plan Medio!",
                user: {
                    id: teacher.id,
                    name: teacher.name,
                    role: teacher.role
                }
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error en registro de docente:", error);
        return NextResponse.json(
            { 
                error: "Ocurrió un error al crear la cuenta. Inténtalo de nuevo.",
                detail: error?.message?.substring(0, 300) || "Unknown error"
            },
            { status: 500 }
        );
    }
}
