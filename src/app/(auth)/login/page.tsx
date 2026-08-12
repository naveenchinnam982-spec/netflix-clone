// ============================
// Login Page
// ============================
// User login with email/password and Google authentication.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/browse';
  const { loginWithEmail, loginWithGoogle, loginAsDemo } = useAuthStore();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      router.push(next);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      router.push(next);
    } catch (err: any) {
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'user') => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAsDemo(role);
      router.push(role === 'admin' ? '/dashboard' : '/browse');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-black/80 backdrop-blur-xl rounded-lg p-8 md:p-16 shadow-netflix-xl border border-white/10"
    >
      <h1 className="text-white text-3xl font-bold mb-8">Sign In</h1>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded mb-6"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Email Login Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-netflix-gray" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or phone number"
              required
              className="w-full bg-netflix-light text-white border border-white/20 rounded pl-10 pr-4 py-3 outline-none focus:border-white/40 focus:ring-1 focus:ring-netflix-red transition-all"
            />
          </div>
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-netflix-gray" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full bg-netflix-light text-white border border-white/20 rounded pl-10 pr-12 py-3 outline-none focus:border-white/40 focus:ring-1 focus:ring-netflix-red transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-netflix-gray hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-netflix-red text-white font-semibold py-3 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Demo Login */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-black px-4 text-netflix-gray">OR</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => handleDemoLogin('user')}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Demo User
        </button>
        <button
          onClick={() => handleDemoLogin('admin')}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Demo Admin
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-black px-4 text-netflix-gray">OR</span>
        </div>
      </div>

      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={isSubmitting}
        className="w-full bg-white text-black font-semibold py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>

      {/* Help Links */}
      <div className="mt-6 space-y-3 text-center">
        <Link
          href="/forgot-password"
          className="text-netflix-gray text-sm hover:text-white transition-colors block"
        >
          Forgot password?
        </Link>
        <p className="text-netflix-gray text-sm">
          New to Netflix Clone?{' '}
          <Link href="/register" className="text-white hover:underline font-medium">
            Sign up now
          </Link>
        </p>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-netflix-gray leading-relaxed">
        This page is protected by Google reCAPTCHA to ensure you are not a bot.{' '}
        <Link href="/privacy" className="text-blue-500 hover:underline">
          Learn more
        </Link>
        .
      </p>
    </motion.div>
  );
}
