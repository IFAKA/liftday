'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WatchScreenProps {
  top?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  scrollable?: boolean;
}

export function WatchScreen({
  top,
  children,
  footer,
  className,
  bodyClassName,
  footerClassName,
  scrollable = true,
}: WatchScreenProps) {
  return (
    <div className={cn('watch-shell flex h-full min-h-0 flex-col overflow-hidden bg-black text-white', className)}>
      {top}
      <main className={cn(
        'min-h-0 flex-1 px-4 pt-3 no-scrollbar',
        scrollable ? 'overflow-y-auto pb-8' : 'overflow-hidden',
        bodyClassName
      )}>
        {children}
      </main>
      {footer && (
        <footer className={cn('w-full shrink-0 px-4 pb-safe', footerClassName)}>
          {footer}
        </footer>
      )}
    </div>
  );
}

interface WatchBackButtonProps {
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

export function WatchBackButton({
  href,
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

interface WorkoutFlowScreenProps {
  top?: ReactNode;
  progress?: number;
  children: ReactNode;
  footer?: ReactNode;
  overlay?: ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  flashClassName?: string;
  progressClassName?: string;
  onClick?: () => void;
}

export function WorkoutFlowScreen({
  top,
  progress,
  children,
  footer,
  overlay,
  className,
  bodyClassName,
  footerClassName,
  flashClassName,
  progressClassName,
  onClick,
}: WorkoutFlowScreenProps) {
  return (
    <div
      className={cn('relative flex h-full w-full flex-col overflow-hidden bg-black text-white', flashClassName, className)}
      onClick={onClick}
    >
      {typeof progress === 'number' && (
        <Progress
          value={progress}
          className={cn(
            'absolute left-0 right-0 top-0 z-50 h-0.5 rounded-none bg-white/10 [&_[data-slot=progress-indicator]]:bg-white',
            progressClassName
          )}
        />
      )}

      {top}

      <main className={cn('flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4', bodyClassName)}>
        {children}
      </main>

      {footer && (
        <footer className={cn('z-20 w-full shrink-0 px-4 pb-safe', footerClassName)}>
          {footer}
        </footer>
      )}

      {overlay}
    </div>
  );
}
