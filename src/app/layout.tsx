// ============================
// Root Layout
// ============================
// Global layout with metadata, fonts, providers, and PWA support.

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Netflix Clone - Streaming Platform',
    template: '%s | Netflix Clone',
  },
  description: 'A professional Netflix-style video streaming platform built with Next.js, featuring adaptive bitrate streaming, live streaming, AI features, and more.',
  keywords: [
    'video streaming',
    'Netflix clone',
    'movie streaming',
    'video platform',
    'live streaming',
    'Next.js',
    'React',
    'TypeScript',
  ],
  authors: [{ name: 'Netflix Clone Team' }],
  creator: 'Netflix Clone Team',
  publisher: 'Netflix Clone',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Netflix Clone',
    title: 'Netflix Clone - Streaming Platform',
    description: 'Watch thousands of movies, TV shows, and exclusive content.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Netflix Clone',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Netflix Clone - Streaming Platform',
    description: 'Watch thousands of movies, TV shows, and exclusive content.',
    images: ['/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#141414',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to important origins */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <link rel="dns-prefetch" href="//firestore.googleapis.com" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#181818',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
