import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkCache() {
    const cache = await prisma.aIPromptCache.findUnique({
        where: {
            topic_theme: {
                topic: 'fracciones basicas',
                theme: 'detective'
            }
        }
    });
    console.log(cache);
}

checkCache();
