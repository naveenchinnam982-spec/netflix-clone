// ============================
// Landing Page
// ============================
// Public, Netflix-inspired marketing page: hero with email CTA, feature rows,
// live-classes section, pricing preview, FAQ accordion, and footer.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Tv, Download, MonitorPlay, Users, Sparkles, ChevronDown, ArrowRight, Radio } from 'lucide-react';
import { DEMO_VIDEOS } from '@/lib/demo-data';
import { cn } from '@/lib/utils';

const HERO_IMAGE = DEMO_VIDEOS[2].thumbnail; // Tears of Steel
const FEATURE_IMAGE_1 = DEMO_VIDEOS[0].thumbnail; // Big Buck Bunny
const FEATURE_IMAGE_2 = DEMO_VIDEOS[3].thumbnail; // Elephants Dream

const features = [
  {
    icon: Tv,
    title: 'Enjoy on your TV',
    description: 'Watch on smart TVs, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray players, and more.',
    image: FEATURE_IMAGE_1,
    reverse: false,
  },
  {
    icon: Download,
    title: 'Download your shows to watch offline',
    description: 'Save your favorites easily and always have something to watch.',
    image: FEATURE_IMAGE_2,
    reverse: true,
  },
  {
    icon: MonitorPlay,
    title: 'Watch everywhere',
    description: 'Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV without paying more.',
    image: DEMO_VIDEOS[1].thumbnail,
    reverse: false,
  },
];

const faqs = [
  { q: 'What is StreamFlix?', a: 'StreamFlix is a Netflix-style video streaming platform featuring adaptive bitrate streaming up to 4K, live online classes, watch-together sessions, and an AI-assisted content pipeline.' },
  { q: 'How much does StreamFlix cost?', a: 'Start with a free plan. Premium unlocks 4K streaming, offline downloads, live classes, and ad-free viewing for $9.99/month or $99.99/year.' },
  { q: 'Where can I watch?', a: 'Watch anywhere, anytime — on your phone, tablet, laptop, or TV. Sign in with your account and resume exactly where you left off.' },
  { q: 'Can teachers host live classes?', a: 'Yes. Teachers can start Zoom-style live sessions with chat, screen sharing, whiteboard, raise hand, and attendance tracking.' },
  { q: 'How do I cancel?', a: 'Cancel anytime in your account settings. You keep access until the end of your billing period.' },
];

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled ? 'bg-netflix-black/95 backdrop-blur-md shadow-netflix' : 'bg-gradient-to-b from-black/70 to-transparent'
      )}
    >
      <div className="flex items-center justify-between px-4 md:px-12 h-16 md:h-20">
        <Link href="/" className="text-netflix-red text-3xl md:text-4xl font-bold tracking-tighter">STREAMFLIX</Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-white text-sm font-medium hover:text-netflix-gray-light transition-colors">Sign In</Link>
          <Link href="/register" className="bg-netflix-red text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors">Get Started</Link>
        </div>
      </div>
    </nav>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-netflix-black text-white">
      <LandingNav />

      {/* ============ HERO ============ */}
      <section className="relative h-[92vh] min-h-[600px] overflow-hidden">
        <Image src={HERO_IMAGE} alt="StreamFlix hero" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-netflix" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-netflix-black to-transparent" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center gap-2 mb-6 glass px-4 py-2 rounded-full text-sm text-white/90"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Adaptive 4K streaming · Live classes · Watch together
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight"
          >
            Unlimited movies, TV shows, and more
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-lg md:text-2xl text-white/90"
          >
            Watch anywhere. Cancel anytime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 w-full max-w-xl"
          >
            <p className="text-sm md:text-base text-white/80 mb-4">
              Ready to watch? Enter your email to create or restart your membership.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/register?email=${encodeURIComponent(email)}`;
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 bg-black/60 backdrop-blur border border-white/25 rounded px-4 py-3.5 text-white outline-none focus:border-netflix-red transition-colors placeholder:text-white/50"
              />
              <button
                type="submit"
                className="bg-netflix-red hover:bg-red-700 transition-colors rounded px-8 py-3.5 font-semibold text-lg flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      {features.map((feature, i) => (
        <section key={feature.title} className={cn('border-t-8 border-netflix-darker py-16 md:py-24', feature.reverse && 'bg-netflix-darker/40')}>
          <div className="max-w-6xl mx-auto px-4 md:px-12 grid md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: feature.reverse ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              className={cn(feature.reverse && 'md:order-2')}
            >
              <feature.icon className="w-10 h-10 text-netflix-red mb-4" />
              <h2 className="text-2xl md:text-4xl font-bold mb-4">{feature.title}</h2>
              <p className="text-netflix-gray-light text-base md:text-lg leading-relaxed">{feature.description}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: feature.reverse ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              className={cn('relative rounded-xl overflow-hidden shadow-netflix-xl', feature.reverse && 'md:order-1')}
            >
              <Image src={feature.image} alt={feature.title} width={1280} height={720} className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-card opacity-60" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 glass px-3 py-2 rounded-lg text-sm">
                <Play className="w-4 h-4 fill-netflix-red text-netflix-red" />
                <span>4K · Adaptive bitrate · HLS + DASH</span>
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* ============ LIVE CLASSES ============ */}
      <section className="border-t-8 border-netflix-darker py-16 md:py-24 bg-netflix-darker/40">
        <div className="max-w-6xl mx-auto px-4 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm mb-6">
              <Radio className="w-4 h-4 text-netflix-red animate-pulse" />
              Live Classes
            </div>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Zoom-style live online classes</h2>
            <p className="text-netflix-gray-light text-lg max-w-2xl mx-auto mb-10">
              Teachers go live with chat, screen sharing, whiteboard, raise hand, mute controls, recording, and automatic attendance.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {['Live Chat', 'Screen Sharing', 'Whiteboard', 'Attendance'].map((item) => (
                <div key={item} className="glass rounded-xl p-5 flex flex-col items-center gap-3 hover:bg-white/[0.07] transition-colors">
                  <Users className="w-6 h-6 text-netflix-red" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/register"
              className="inline-block mt-10 bg-netflix-red hover:bg-red-700 transition-colors rounded px-8 py-3.5 font-semibold"
            >
              Join a live class
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="border-t-8 border-netflix-darker py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 md:px-12">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-12">Choose your plan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Free', price: '$0', period: '/forever', features: ['480p streaming', 'Ads supported', 'Watch 1 device', 'Basic search'] },
              { name: 'Premium', price: '$9.99', period: '/month', features: ['Up to 4K + HDR', 'Ad-free', 'Offline downloads', 'Live classes', 'Watch together'] },
              { name: 'Premium Yearly', price: '$99.99', period: '/year', features: ['Everything in Premium', '2 months free', 'Priority support', 'Early access features'] },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn(
                  'rounded-xl border p-8 flex flex-col',
                  i === 1
                    ? 'border-netflix-red bg-netflix-red/5 shadow-glow-red'
                    : 'border-white/10 bg-netflix-dark/50'
                )}
              >
                {i === 1 && (
                  <span className="self-start bg-netflix-red text-white text-xs font-bold px-3 py-1 rounded-full mb-4">MOST POPULAR</span>
                )}
                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold mb-1">{plan.price}<span className="text-sm text-netflix-gray font-normal">{plan.period}</span></p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-netflix-gray-light">
                      <span className="text-green-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={cn(
                    'mt-8 rounded font-semibold py-3 text-center transition-colors',
                    i === 1 ? 'bg-netflix-red hover:bg-red-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                  )}
                >
                  Start your plan
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-t-8 border-netflix-darker py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 md:px-12">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="bg-netflix-dark/70 border border-white/5 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium">{faq.q}</span>
                  <ChevronDown className={cn('w-5 h-5 text-netflix-red transition-transform duration-300', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && (
                  <p className="px-6 pb-5 text-netflix-gray-light text-sm leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t-8 border-netflix-darker py-12">
        <div className="max-w-3xl mx-auto px-4 md:px-12">
          <p className="text-netflix-gray text-sm mb-6">Questions? Contact us at support@streamflix.dev</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-netflix-gray">
            {['FAQ', 'Help Center', 'Account', 'Media Center', 'Investor Relations', 'Jobs', 'Redeem Gift Cards', 'Buy Gift Cards', 'Ways to Watch', 'Terms of Use', 'Privacy', 'Cookie Preferences', 'Corporate Information', 'Contact Us', 'Legal Notices', 'Only on StreamFlix'].map((l) => (
              <Link key={l} href="/" className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
          <p className="mt-8 text-netflix-gray text-xs">© {new Date().getFullYear()} StreamFlix. A Netflix-style streaming platform demo.</p>
        </div>
      </footer>
    </div>
  );
}
