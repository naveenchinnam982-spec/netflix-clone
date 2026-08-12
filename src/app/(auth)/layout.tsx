// ============================
// Auth Layout
// ============================
// Shared layout for authentication pages (login, register, forgot-password).

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Authentication',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-netflix-black relative flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/a1dc92ca-091d-4779-9467-2b8c8c3f1a0b/web/IN-en-20241111-popsignuptwoweeks-perspective_alpha_website_large.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      </div>

      {/* Logo */}
      <div className="relative z-10 px-4 md:px-12 pt-6">
        <Link href="/">
          <h1 className="text-netflix-red text-3xl md:text-4xl font-bold">
            STREAMFLIX
          </h1>
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 bg-black/70 backdrop-blur-sm py-6">
        <div className="max-w-md mx-auto px-4">
          <p className="text-netflix-gray text-xs text-center">
            &copy; {new Date().getFullYear()} Netflix Clone. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
