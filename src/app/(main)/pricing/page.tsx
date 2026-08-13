// ============================
// Pricing Page
// ============================
// Plan selection with Stripe checkout. In demo mode the checkout calls the
// /api/subscriptions/checkout route which returns a Stripe session when
// configured; otherwise it falls back to a demo upgrade (local only).

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Zap } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'monthly',
    name: 'Premium',
    tagline: 'For serious streamers',
    price: 9.99,
    period: 'month',
    features: ['Up to 4K + HDR streaming', 'Ad-free experience', 'Offline downloads', 'Live online classes', 'Watch together sessions', 'Priority support'],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Premium Yearly',
    tagline: 'Best value — 2 months free',
    price: 99.99,
    period: 'year',
    features: ['Everything in Premium', 'Save over 15%', 'Early access to features', 'Exclusive badge', 'Priority streaming lanes'],
    popular: false,
  },
];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const user = useAuthStore(s => s.user);
  const isPremium = user && ['premium', 'monthly', 'yearly'].includes(user.subscription);

  const subscribe = async (planId: string) => {
    if (!user) {
      window.location.href = `/login?next=/pricing`;
      return;
    }
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
        return;
      }
      // Demo mode fallback: simulate activation.
      await new Promise((r) => setTimeout(r, 900));
      toast.success(`Welcome to ${planId === 'yearly' ? 'Premium Yearly' : 'Premium'}! (demo mode)`);
      setLoadingPlan(null);
    } catch {
      toast.error('Checkout unavailable — configure Stripe keys');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-6xl mx-auto px-4 md:px-12 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm mb-6">
            <Zap className="w-4 h-4 text-yellow-400" /> Cancel anytime
          </div>
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-4">Choose the plan that is right for you</h1>
          <p className="text-netflix-gray text-lg">Downgrade or cancel at any time. Prices in USD.</p>
          {isPremium && (
            <p className="mt-4 inline-block bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-4 py-1.5 text-sm">
              You are on the {user?.subscription} plan
            </p>
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'relative rounded-2xl border p-8 flex flex-col',
                plan.popular
                  ? 'border-netflix-red bg-netflix-red/5 shadow-glow-red'
                  : 'border-white/10 bg-netflix-dark/50'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-netflix-red text-white text-xs font-bold px-4 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-netflix-gray text-sm mt-1">{plan.tagline}</p>
              <p className="mt-6 text-4xl font-bold">
                {formatCurrency(plan.price)}
                <span className="text-base text-netflix-gray font-normal">/{plan.period}</span>
              </p>
              {plan.id === 'yearly' && (
                <p className="text-green-500 text-sm mt-1">Equivalent to {formatCurrency(8.33)}/month</p>
              )}
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-netflix-gray-light">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan.id)}
                disabled={loadingPlan !== null}
                className={cn(
                  'mt-8 rounded-xl font-semibold py-3.5 transition-colors flex items-center justify-center gap-2 disabled:opacity-60',
                  plan.popular ? 'bg-netflix-red hover:bg-red-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                )}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Redirecting to checkout...
                  </>
                ) : isPremium ? (
                  'Manage Plan'
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-netflix-gray text-sm mt-10 max-w-xl mx-auto">
          Payments processed securely via <span className="text-white">Stripe</span> or{' '}
          <span className="text-white">Razorpay</span>. Free plan includes 480p streaming with ads.
        </p>
      </div>
    </div>
  );
}
