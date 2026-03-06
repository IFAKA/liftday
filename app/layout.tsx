import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { WakeLockProvider } from '@/components/WakeLockProvider';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LiftDay',
  description: 'Your daily lifting companion',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LiftDay',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
  interactiveWidget: 'resizes-visual',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} font-mono antialiased bg-[#000000] text-foreground`}>
        <div className="w-full max-w-md mx-auto h-[100dvh] overflow-hidden bg-background relative shadow-2xl ring-1 ring-white/5 sm:rounded-3xl sm:h-[min(850px,100dvh)] sm:my-auto flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <WakeLockProvider>{children}</WakeLockProvider>
        </div>
      </body>
    </html>
  );
}
