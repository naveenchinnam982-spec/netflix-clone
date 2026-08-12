// ============================
// Footer Component
// ============================
// Netflix-inspired footer with links, social media, and legal info.

'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

const footerLinks = [
  {
    title: 'Navigation',
    links: [
      { label: 'Home', href: '/browse' },
      { label: 'Trending', href: '/trending' },
      { label: 'Latest', href: '/latest' },
      { label: 'Categories', href: '/categories' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Profile', href: '/profile' },
      { label: 'My List', href: '/my-list' },
      { label: 'History', href: '/history' },
      { label: 'Settings', href: '/dashboard/settings' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'Youtube' },
];

export function Footer() {
  return (
    <footer className="bg-netflix-darker border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        {/* Social Links */}
        <div className="flex items-center gap-6 mb-8">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              className="text-netflix-gray hover:text-white transition-colors duration-200"
              aria-label={social.label}
            >
              <social.icon className="w-5 h-5" />
            </a>
          ))}
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-white text-sm font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-netflix-gray text-xs hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* App Store Links */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-4">Get the App</h3>
            <div className="space-y-2">
              <Link
                href="#"
                className="block text-netflix-gray text-xs hover:text-white transition-colors"
              >
                iOS App Store
              </Link>
              <Link
                href="#"
                className="block text-netflix-gray text-xs hover:text-white transition-colors"
              >
                Google Play Store
              </Link>
            </div>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-xs text-netflix-gray">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="hover:text-white transition-colors">
                Cookie Preferences
              </Link>
              <Link href="/accessibility" className="hover:text-white transition-colors">
                Accessibility
              </Link>
            </div>
            <p className="text-netflix-gray text-xs">
              &copy; {new Date().getFullYear()} Netflix Clone. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
