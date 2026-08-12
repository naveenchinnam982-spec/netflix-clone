// ============================
// Stripe Webhook
// ============================
// Receives Stripe subscription lifecycle events (checkout completed,
// subscription updated/canceled) and mirrors them into Firestore.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ success: true, received: true });
  }

  try {
    let event: Stripe.Event;
    if (process.env.STRIPE_SECRET_KEY && endpointSecret) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    const db = getAdminDb()!;
    const session = event.data.object as Stripe.Checkout.Session & { subscription?: string };

    switch (event.type) {
      case 'checkout.session.completed': {
        const uid = session.client_reference_id || session.metadata?.uid;
        if (uid && session.subscription) {
          await db.collection('subscriptions').doc(uid).set({
            userId: uid,
            stripeSubscriptionId: session.subscription,
            provider: 'stripe',
            status: 'active',
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        // Subscriptions don't carry client_reference_id; find the user via the
        // subscriptions collection we wrote at checkout time.
        const subsSnap = await db
          .collection('subscriptions')
          .where('stripeSubscriptionId', '==', sub.id)
          .limit(1)
          .get();
        const uid = sub.metadata?.uid || subsSnap.docs[0]?.id;
        if (uid) {
          await db.collection('users').doc(uid).update({ subscription: 'free' });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
