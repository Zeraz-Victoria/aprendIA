import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function cleanCache() {
    const res = await prisma.aIPromptCache.deleteMany({});
    console.log("Deleted cache count:", res.count);
}
cleanCache();
