import prisma from './prisma';

/**
 * Tracks an AI API call by incrementing the counter for both the student (or teacher) 
 * and their associated school.
 * 
 * @param userId The ID of the user (student or teacher) making the call.
 * @param schoolId The ID of the school the user belongs to.
 */
export async function trackAICall(userId: string, schoolId: string | null) {
  if (!userId) return;

  try {
    const operations = [];

    // 1. Increment User's apiCalls
    operations.push(
      prisma.user.update({
        where: { id: userId },
        data: { apiCalls: { increment: 1 } }
      })
    );

    // 2. Increment School's apiCalls if schoolId is provided
    if (schoolId) {
      operations.push(
        prisma.school.update({
          where: { id: schoolId },
          data: { apiCalls: { increment: 1 } }
        })
      );
    }

    // Run as a transaction for consistency
    await prisma.$transaction(operations);
  } catch (error) {
    console.error(`[trackAICall] Failed to track API call for user ${userId}:`, error);
  }
}
