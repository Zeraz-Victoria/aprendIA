import prisma from "@/lib/prisma";

export interface PlanConfig {
    label: string;
    maxStudents: number;
    maxMaps: number;
    maxClassrooms: number;
    monthlyAiCalls: number;
}

export const PLAN_CONFIG: Record<string, PlanConfig> = {
    TRIAL: {
        label: "Prueba Gratuita (3 Días)",
        maxStudents: 15,
        maxMaps: 1,
        maxClassrooms: 1,
        monthlyAiCalls: 5,
    },
    BASIC: {
        label: "Plan Básico",
        maxStudents: 25,
        maxMaps: 2,
        maxClassrooms: 1,
        monthlyAiCalls: 30,
    },
    INTERMEDIATE: {
        label: "Plan Intermedio",
        maxStudents: 50,
        maxMaps: 6,
        maxClassrooms: 3,
        monthlyAiCalls: 100,
    },
    PREMIUM: {
        label: "Plan Premium",
        maxStudents: 100,
        maxMaps: 15,
        maxClassrooms: 99,
        monthlyAiCalls: 300,
    },
};

export function getPlanConfig(planName?: string | null): PlanConfig {
    const key = (planName || "BASIC").toUpperCase();
    return PLAN_CONFIG[key] || PLAN_CONFIG.BASIC;
}

/**
 * Validates whether a school has remaining quota for AI generation.
 * Returns { allowed: boolean, currentCalls: number, limit: number, error?: string }
 */
export async function checkAiQuota(schoolId: string) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: {
            id: true,
            apiCalls: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
        }
    });

    if (!school) {
        return { allowed: false, currentCalls: 0, limit: 0, error: "Escuela no encontrada." };
    }

    const limits = getPlanConfig(school.subscriptionPlan);
    const maxAiCalls = limits.monthlyAiCalls;

    if (school.subscriptionStatus === "SUSPENDED") {
        return {
            allowed: false,
            currentCalls: school.apiCalls,
            limit: maxAiCalls,
            error: "Tu cuenta está suspendida. Contacta a un administrador para reactivar tu servicio."
        };
    }

    if (school.apiCalls >= maxAiCalls) {
        return {
            allowed: false,
            currentCalls: school.apiCalls,
            limit: maxAiCalls,
            error: `Has alcanzado el límite mensual de ${maxAiCalls} llamadas de IA para tu ${limits.label}. Actualiza tu plan para continuar generando aventuras.`
        };
    }

    return { allowed: true, currentCalls: school.apiCalls, limit: maxAiCalls };
}

/**
 * Increment AI calls for a school and user
 */
export async function incrementAiUsage(schoolId: string, userId?: string) {
    try {
        await prisma.school.update({
            where: { id: schoolId },
            data: { apiCalls: { increment: 1 } }
        });

        if (userId) {
            await prisma.user.update({
                where: { id: userId },
                data: { apiCalls: { increment: 1 } }
            }).catch(() => {});
        }
    } catch (e) {
        console.error("Error incrementing AI usage:", e);
    }
}

/**
 * Extends the school's active period by N days and reactivates it immediately.
 */
export async function extendSchoolSubscription(schoolId: string, daysToAdd: number) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { subscriptionEndsAt: true, subscriptionStatus: true }
    });

    if (!school) throw new Error("Escuela no encontrada");

    const now = new Date();
    const currentDue = school.subscriptionEndsAt && new Date(school.subscriptionEndsAt) > now
        ? new Date(school.subscriptionEndsAt)
        : now;

    const newDueDate = new Date(currentDue.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    newDueDate.setHours(23, 59, 59, 999);

    const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
            subscriptionEndsAt: newDueDate,
            subscriptionStatus: "ACTIVE",
        }
    });

    return updated;
}
