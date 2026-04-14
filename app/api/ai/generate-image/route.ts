import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { trackAICall } from "@/lib/ai-tracker";

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) {
        return NextResponse.json({ error: 'Missing prompt parameter' }, { status: 400 });
    }

    try {
        // Use Gemini's Imagen model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: `Generate a cute, colorful 2D illustration suitable for children (ages 8-12) about: "${prompt}". 
                    The style should be: cartoon, vector art, bright colors, educational, friendly.
                    Return ONLY the image, no text.`
                }]
            }],
            generationConfig: {
                responseModalities: ["IMAGE", "TEXT"] as any,
            } as any,
        });

        // Increment API calls
        const userId = (session.user as any).id;
        const schoolId = (session.user as any).schoolId;
        if (userId) {
            await trackAICall(userId, schoolId);
        }

        const response = result.response;
        const candidates = response.candidates;

        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            for (const part of parts) {
                if ((part as any).inlineData) {
                    const imageData = (part as any).inlineData;
                    const buffer = Buffer.from(imageData.data, 'base64');
                    return new NextResponse(buffer, {
                        headers: {
                            'Content-Type': imageData.mimeType || 'image/png',
                            'Cache-Control': 'public, max-age=86400',
                        },
                    });
                }
            }
        }

        // Fallback: return a simple SVG placeholder
        return generateSvgPlaceholder(prompt);
    } catch (error) {
        console.error('Image generation error:', error);
        return generateSvgPlaceholder(prompt);
    }
}

function generateSvgPlaceholder(prompt: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#e0e7ff"/>
                <stop offset="100%" style="stop-color:#c4b5fd"/>
            </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#bg)" rx="16"/>
        <text x="400" y="180" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#6366f1">🎨</text>
        <text x="400" y="240" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#4f46e5" font-weight="bold">
            ${prompt.substring(0, 60)}
        </text>
    </svg>`;

    return new NextResponse(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
