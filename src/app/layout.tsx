import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NavigationWrapper from '@/components/NavigationWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wardrobe — Your AI Style Assistant',
  description: 'Manage your wardrobe and get AI-powered outfit recommendations',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <main className="max-w-2xl mx-auto pb-24 min-h-screen">
          {children}
        </main>
        <NavigationWrapper />
      </body>
    </html>
  );
}
