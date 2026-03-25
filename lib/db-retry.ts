/**
 * Utility to retry Prisma operations when transient errors occur (like Connection Resets)
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const isConnectionError = 
                error?.message?.includes('ConnectionReset') || 
                error?.message?.includes('104') ||
                error?.message?.includes('Connection reset by peer') ||
                error?.message?.includes('P1001') ||
                error?.message?.includes('P2021');

            if (isConnectionError && attempt < maxRetries) {
                console.warn(`[DB RETRY] Attempt ${attempt}/${maxRetries} failed due to connection error. Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                // Exponential backoff
                delayMs *= 2;
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}
