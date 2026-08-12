// ============================
// Subscription Checkout API
// ============================
// POST /api/subscriptions/checkout { planId: 'monthly' | 'yearly' }
// Creates a Stripe Checkout session for the chosen plan and returns the
// redirect URL. Falls back to a demo activation when Stripe keys are absent.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth';

const PLANS: Record<string, { priceId: string; name: string; amount: number; currency: string; interval: 'month' | 'year' }> = {
  monthly: {
    priceId: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly',
    name: 'Premium Monthly',
    amount: 999,
    currency: 'usd',
    interval: 'month',
  },
  yearly: {
    priceId: process.env.STRIPE_PRICE_YEARLY || 'price_yearly',
    name: 'Premium Yearly',
    amount: 9999,
    currency: 'usd',
    interval: 'year',
  },
};

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: 'Sign in to subscribe' }, { status: 401 });

  const { planId } = await request.json();
  const plan = PLANS[planId as string];
  if (!plan) return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });

  // ---- Stripe mode ----
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('YOUR_')) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?checkout=cancelled`,
      client_reference_id: user.uid,
      customer_email: user.email,
      metadata: { planId, uid: user.uid },
    });
    return NextResponse.json({ success: true, data: { url: session.url, sessionId: session.id } });
  }

  // ---- Razorpay mode ----
  if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('YOUR_')) {
    // Razorpay orders are created client-side with their checkout SDK;
    // this endpoint returns the order params the client needs.
    return NextResponse.json({
      success: true,
      data: {
        provider: 'razorpay',
        orderParams: {
          key: process.env.RAZORPAY_KEY_ID,
          name: 'StreamFlix',
          description: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          prefill: { email: user.email },
        },
        planId,
      },
    });
  }

  // ---- Demo mode: record a local subscription so the UI reflects it ----
  if (isFirebaseConfigured()) {
    try {
      const db = getAdminDb()!;
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.interval === 'month') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      await db.collection('subscriptions').doc(user.uid).set({
        userId: user.uid,
        plan: planId,
        provider: 'demo',
        amount: plan.amount / 100,
        currency: plan.currency,
        status: 'active',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
      });
      await db.collection('users').doc(user.uid).update({ subscription: planId });
    } catch {
      // Non-fatal in demo.
    }
  }

  return NextResponse.json({ success: true, data: { demo: true, planId, url: null } });
}
