'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ChartBar, CalendarDays, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavContext } from '@/lib/nav-context';

const tabs = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/history', label: 'Progress', icon: ChartBar },
  { href: '/program', label: 'Program', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: User },
] as const;

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/history') return pathname.startsWith('/history');
  if (href === '/program') return pathname.startsWith('/program') || pathname === '/split' || pathname === '/routine' || pathname === '/settings/routine';
  if (href === '/settings') return pathname.startsWith('/settings') && pathname !== '/settings/routine';
  return false;
}

export function BottomNav() {
  const pathname = usePathname();
  const { hideNav } = useNavContext();

  if (hideNav || pathname === '/onboarding') return null;

  return (
    <nav className="shrink-0 border-t border-white/10 bg-black flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = isTabActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 min-[280px]:py-3 gap-1 transition-colors min-h-[44px]',
              active ? 'text-white' : 'text-white/30 active:text-white/60'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
            <span className="hidden min-[280px]:block text-[10px] font-black uppercase tracking-widest font-mono leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
