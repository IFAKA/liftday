'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WatchScreenProps {
  top?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function WatchScreen({ top, children, footer, className, bodyClassName }: WatchScreenProps) {
  return (
    <div className={cn('flex h-full flex-col overflow-hidden bg-black text-white', className)}>
      {top}
      <main className={cn('min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 no-scrollbar', bodyClassName)}>
        {children}
      </main>
      {footer}
    </div>
  );
}

interface WatchBackButtonProps {
  href?: string;
  fallbackHref?: string;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

export function WatchBackButton({
  href,
  fallbackHref,
  onClick,
  ariaLabel = 'Back',
  className,
}: WatchBackButtonProps) {
  const router = useRouter();
  const classes = cn(
    '-ml-2 size-11 rounded-full text-white/55 hover:bg-transparent hover:text-white active:bg-white/10 active:text-white',
    className
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (fallbackHref) {
      router.push(fallbackHref);
      return;
    }
    router.back();
  };

  if (href) {
    return (
      <Button asChild variant="ghost" size="icon" aria-label={ariaLabel} className={classes}>
        <Link href={href}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant="ghost" size="icon" aria-label={ariaLabel} onClick={handleClick} className={classes}>
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
}

interface WatchSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function WatchSection({ title, children, className }: WatchSectionProps) {
  return (
    <section className={className}>
      {title && (
        <div className="mb-2 px-1">
          <span className="text-fluid-label font-black uppercase text-white/40">{title}</span>
        </div>
      )}
      {children}
    </section>
  );
}
