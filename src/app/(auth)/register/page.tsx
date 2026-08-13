// ============================
// Register Page
// ============================
// User registration with email/password and Google authentication.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { registerWithEmail, loginWithGoogle } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Normalize input before submitting so the stored profile and the
    // Firestore rule check (email == request.auth.token.email) are consistent.
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerWithEmail(trimmedEmail, password, trimmedName);
      router.push('/browse');
    } catch (err: any) {
      // The store already converts auth/* codes into actionable messages
      // (e.g. "An account with this email already exists").
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      router.push('/browse');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed. Please try again.');
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
      <h1 className="text-white text-3xl font-bold mb-8">Sign Up</h1>

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

      {/* Registration Form */}
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-netflix-gray" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Full Name"
              required
              className="w-full bg-netflix-light text-white border border-white/20 rounded pl-10 pr-4 py-3 outline-none focus:border-white/40 focus:ring-1 focus:ring-netflix-red transition-all"
            />
          </div>
        </div>

        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-netflix-gray" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
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

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-netflix-gray" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              minLength={6}
              className="w-full bg-netflix-light text-white border border-white/20 rounded pl-10 pr-4 py-3 outline-none focus:border-white/40 focus:ring-1 focus:ring-netflix-red transition-all"
            />
          </div>
        </div>

        {/* Terms Agreement */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 w-4 h-4 accent-netflix-red"
          />
          <span className="text-netflix-gray text-sm">
            I agree to the{' '}
            <Link href="/terms" className="text-blue-500 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-500 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-netflix-red text-white font-semibold py-3 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Sign Up'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-black px-4 text-netflix-gray">OR</span>
        </div>
      </div>

      {/* Google Sign Up */}
      <button
        onClick={handleGoogleSignUp}
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
        Sign up with Google
      </button>

      {/* Login Link */}
      <p className="mt-6 text-center text-netflix-gray text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:underline font-medium">
          Sign in now
        </Link>
      </p>
    </motion.div>
  );
}
