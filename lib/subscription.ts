import prisma from './prisma';

export interface SubscriptionStatusResult {
    allowed: boolean;
    reason?: string;
    isExpired?: boolean;
    plan?: string;
    trialEndsAt?: Date | null;
    subscriptionEndsAt?: Date | null;
    daysLeft?: number | null;
    showBanner?: boolean;
}

/**
 * Verifica si la escuela de un usuario tiene acceso activo (prueba de 3 días o suscripción de 30 días)
 */
export async function checkSchoolSubscriptionAccess(schoolId: string | null): Promise<SubscriptionStatusResult> {
    if (!schoolId) {
        return { allowed: true };
    }

    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                subscriptionStatus: true,
                subscriptionPlan: true,
                trialEndsAt: true,
                subscriptionEndsAt: true,
            }
        });

        if (!school) {
            return { allowed: false, reason: "Escuela no encontrada." };
        }

        const now = new Date();

        // 1. Si ya está suspendida explícitamente
        if (school.subscriptionStatus === "SUSPENDED") {
            return {
                allowed: false,
                reason: "Tu suscripción se encuentra suspendida o ha expirado.",
                isExpired: true,
                plan: school.subscriptionPlan
            };
        }

        // 2. Verificar vencimiento de prueba (3 días)
        if (school.trialEndsAt && now > school.trialEndsAt && (!school.subscriptionEndsAt || now > school.subscriptionEndsAt)) {
            // Actualizar a suspendido
            await prisma.school.update({
                where: { id: schoolId },
                data: { subscriptionStatus: "SUSPENDED" }
            }).catch(() => {});

            return {
                allowed: false,
                reason: "Tus 3 días de prueba gratis han finalizado. Activa tu plan por WhatsApp para continuar.",
                isExpired: true,
                plan: school.subscriptionPlan
            };
        }

        // 3. Verificar vencimiento de plan pagado (30 días)
        if (school.subscriptionEndsAt && now > school.subscriptionEndsAt) {
            await prisma.school.update({
                where: { id: schoolId },
                data: { subscriptionStatus: "SUSPENDED" }
            }).catch(() => {});

            return {
                allowed: false,
                reason: "Tu plan de 30 días ha expirado. Renueva tu plan por WhatsApp para continuar.",
                isExpired: true,
                plan: school.subscriptionPlan
            };
        }

        // 4. Calcular días restantes para banner (si faltan 3 días o menos)
        const expirationDate = school.subscriptionEndsAt || school.trialEndsAt;
        let daysLeft: number | null = null;
        let showBanner = false;

        if (expirationDate) {
            const diffMs = expirationDate.getTime() - now.getTime();
            daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            if (daysLeft <= 3) {
                showBanner = true;
            }
        }

        return {
            allowed: true,
            plan: school.subscriptionPlan,
            trialEndsAt: school.trialEndsAt,
            subscriptionEndsAt: school.subscriptionEndsAt,
            daysLeft,
            showBanner
        };
    } catch (error) {
        console.error("Error al verificar suscripción de escuela:", error);
        return { allowed: true };
    }
}

/**
 * Verifica la suscripción dado el ID de usuario (docente o alumno)
 */
export async function checkUserSubscriptionAccess(userId: string, schoolId?: string | null): Promise<SubscriptionStatusResult> {
    let targetSchoolId = schoolId;

    if (!targetSchoolId && userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true, teacherOwner: { select: { schoolId: true } } }
        });
        targetSchoolId = user?.schoolId || user?.teacherOwner?.schoolId || null;
    }

    return checkSchoolSubscriptionAccess(targetSchoolId || null);
}
