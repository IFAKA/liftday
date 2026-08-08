import type { Metadata, Viewport } from 'next';
import './globals.css';
import { WakeLockProvider } from '@/components/WakeLockProvider';
import { DebugTraceButton } from '@/components/DebugTraceButton';
import { RouteTransition } from '@/components/RouteTransition';

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
      <body className="font-sans antialiased bg-black text-foreground overflow-hidden h-[100dvh]">
        <div className="mx-auto h-full w-full max-w-[430px] overflow-hidden bg-background relative flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <WakeLockProvider>
              <RouteTransition>{children}</RouteTransition>
            </WakeLockProvider>
          </div>
          <DebugTraceButton />
        </div>
      </body>
    </html>
  );
}
