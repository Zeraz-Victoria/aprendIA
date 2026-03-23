import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ STRIPE_SECRET_KEY is missing. Stripe functionality will be disabled.');
}

export const stripe = new Stripe(key, {
    apiVersion: '2025-01-27.acacia' as any,
});
