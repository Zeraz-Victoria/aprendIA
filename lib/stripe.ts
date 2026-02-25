import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_sk_test_123', {
    apiVersion: '2025-01-27.acacia' as any,
});
