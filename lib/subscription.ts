import prisma from "./prisma";

/**
 * Calculates the next payment date based on a target payment day (1 to 31).
 * Handles shorter months (like Feb/April) by capping the day at the maximum days of that month.
 */
export function getNextPaymentDate(paymentDay: number): Date {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
    
    // Helper to get max days in a given year/month
    const getMaxDays = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    
    // Check if a payment date on this month is still upcoming
    const currentMaxDays = getMaxDays(year, month);
    const targetDayCurrent = Math.min(paymentDay, currentMaxDays);
    let dueDate = new Date(year, month, targetDayCurrent, 23, 59, 59, 999);
    
    // If the due date for the current month is today or in the past, move to the next month
    if (dueDate <= now) {
        month += 1;
        if (month > 11) {
            month = 0;
            year += 1;
        }
        const nextMaxDays = getMaxDays(year, month);
        const targetDayNext = Math.min(paymentDay, nextMaxDays);
        dueDate = new Date(year, month, targetDayNext, 23, 59, 59, 999);
    }
    
    return dueDate;
}

/**
 * Verifies if a school's subscription is active but expired.
 * If expired (now >= nextPaymentDate), it automatically suspends the school
 * and returns the updated school object.
 */
export async function checkAndSuspendSchool(schoolId: string): Promise<any> {
    const school = await prisma.school.findUnique({
        where: { id: schoolId }
    });
    
    if (!school) return null;
    
    // If active and nextPaymentDate is in the past, suspend it!
    if (
        school.subscriptionStatus === "ACTIVE" &&
        school.nextPaymentDate &&
        new Date() >= new Date(school.nextPaymentDate)
    ) {
        const updatedSchool = await prisma.school.update({
            where: { id: schoolId },
            data: { subscriptionStatus: "SUSPENDED" }
        });
        return updatedSchool;
    }
    
    return school;
}
