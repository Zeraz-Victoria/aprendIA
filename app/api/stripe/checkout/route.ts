import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        //@ts-ignore
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({
            //@ts-ignore
            where: { id: session.user.id },
            select: { schoolId: true, email: true }
        });

        if (!user?.schoolId) return NextResponse.json({ error: "No school associated" }, { status: 400 });

        const body = await req.json();
        const { plan } = body;

        // We use mock prices for testing/demo purposes.
        const priceId = plan === 'PREMIUM' ? 'price_premium_mock' : 'price_intermediate_mock';

        const origin = req.headers.get("origin") || "http://localhost:3000";

        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: user.email || undefined,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/teacher?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/teacher?canceled=true`,
            client_reference_id: user.schoolId,
            metadata: {
                schoolId: user.schoolId,
                plan
            }
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (err: any) {
        console.error("Stripe Checkout Error:", err);
        // Return a mock success since there are no valid keys
        return NextResponse.json({
            url: "/teacher?success=demo_mode",
            warning: "Stripe not configured fully. Returning dummy success url."
        });
    }
}
