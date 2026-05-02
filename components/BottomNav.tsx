'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ChartBar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavContext } from '@/lib/nav-context';

const tabs = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/history', label: 'Progress', icon: ChartBar },
  { href: '/program', label: 'Program', icon: CalendarDays },
] as const;

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/history') return pathname.startsWith('/history');
  if (href === '/program') return pathname.startsWith('/program') || pathname === '/split' || pathname === '/routine' || pathname.startsWith('/settings') || pathname === '/sync';
  return false;
}

export function BottomNav() {
  const pathname = usePathname();
  const { hideNav } = useNavContext();

  if (hideNav || pathname === '/onboarding') return null;

  return (
    <nav className="shrink-0 border-t border-white/10 bg-black flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = isTabActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors min-h-[44px] min-[390px]:min-h-[52px] min-[390px]:py-3',
              active ? 'text-white' : 'text-white/30 active:text-white/60'
            )}
            aria-label={label}
          >
            <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
            <span className="sr-only">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
