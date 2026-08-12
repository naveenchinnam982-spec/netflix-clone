// ============================
// Forgot Password Page
// ============================
// Password reset with email verification link.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { resetPassword } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
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
      {isSent ? (
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-white text-3xl font-bold mb-4">Check Your Email</h1>
          <p className="text-netflix-gray mb-6">
            We sent a password reset link to <strong className="text-white">{email}</strong>
          </p>
          <p className="text-netflix-gray text-sm mb-8">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button onClick={handleSubmit} className="text-white hover:underline">
              try again
            </button>
          </p>
          <Link
            href="/login"
            className="text-netflix-gray hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      ) : (
        <>
          <Link
            href="/login"
            className="text-netflix-gray hover:text-white transition-colors inline-flex items-center gap-2 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          <h1 className="text-white text-3xl font-bold mb-2">Forgot Password?</h1>
          <p className="text-netflix-gray mb-8">
            Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
          </p>

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

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-netflix-red text-white font-semibold py-3 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
}
