import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (!webhookSecret) {
            // Fallback for local testing / demo without secrets
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        }
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const schoolId = session.client_reference_id || session.metadata?.schoolId;
                const plan = session.metadata?.plan as "BASIC" | "INTERMEDIATE" | "PREMIUM";

                if (schoolId && plan) {
                    const maxMaps = plan === 'PREMIUM' ? 10 : (plan === 'INTERMEDIATE' ? 5 : 1);
                    const maxStudents = plan === 'PREMIUM' ? 100 : (plan === 'INTERMEDIATE' ? 50 : 25);

                    await prisma.school.update({
                        where: { id: schoolId },
                        //@ts-ignore
                        data: {
                            subscriptionPlan: plan,
                            subscriptionStatus: "ACTIVE",
                            maxMaps,
                            maxStudents
                        }
                    });
                }
                break;
            }
            case 'invoice.payment_failed':
            case 'customer.subscription.deleted': {
                const dataObj = event.data.object;
                const customerEmail = dataObj.customer_email || dataObj.email;

                if (customerEmail) {
                    const user = await prisma.user.findFirst({
                        where: { email: customerEmail, role: "TEACHER" }
                    });

                    if (user?.schoolId) {
                        await prisma.school.update({
                            where: { id: user.schoolId },
                            //@ts-ignore
                            data: { subscriptionStatus: "SUSPENDED" }
                        });
                    }
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (e) {
        console.error("Webhook processing error:", e);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
}
