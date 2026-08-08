'use client';

import { Check, Copy } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type WatchActionTone = 'primary' | 'secondary' | 'danger';

type WatchFooterAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: WatchActionTone;
};

interface WatchActionProps extends ComponentProps<typeof Button> {
  tone?: WatchActionTone;
}

function getWatchActionClassName(tone: WatchActionTone): string {
  if (tone === 'primary') {
    return 'bg-white text-black hover:bg-white/90';
  }
  if (tone === 'danger') {
    return 'border-red-400/25 bg-red-400/10 text-red-100 hover:bg-red-400/15';
  }
  return 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white';
}

export function WatchPrimaryAction({ className, tone = 'primary', ...props }: WatchActionProps) {
  return (
    <Button
      className={cn(
        'w-full btn-mobile-accessible !h-[56px] !min-h-[56px] rounded-full font-black uppercase tracking-tight active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[var(--ease-out-ui)]',
        getWatchActionClassName(tone),
        className
      )}
      {...props}
    />
  );
}

export function WatchSecondaryAction({ className, tone = 'secondary', variant = 'outline', ...props }: WatchActionProps) {
  return (
    <Button
      variant={variant}
      className={cn(
        'btn-mobile-secondary !h-[48px] !min-h-[48px] rounded-full font-black uppercase tracking-tight active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[var(--ease-out-ui)]',
        getWatchActionClassName(tone),
        className
      )}
      {...props}
    />
  );
}

interface WatchActionFooterProps {
  primary?: WatchFooterAction;
  secondary?: WatchFooterAction[];
  layout?: 'stack' | 'grid';
  className?: string;
}

export function WatchActionFooter({
  primary,
  secondary = [],
  layout = 'stack',
  className,
}: WatchActionFooterProps) {
  if (!primary && secondary.length === 0) return null;

  const secondaryClassName = layout === 'grid' ? 'w-full' : 'w-full';

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {primary && (
        <WatchPrimaryAction
          type="button"
          onClick={primary.onClick}
          disabled={primary.disabled}
          tone={primary.tone ?? 'primary'}
        >
          {primary.label}
        </WatchPrimaryAction>
      )}

      {secondary.length > 0 && (
        <div className={cn(layout === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-3')}>
          {secondary.map((action) => (
            <WatchSecondaryAction
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              tone={action.tone ?? 'secondary'}
              className={secondaryClassName}
            >
              {action.label}
            </WatchSecondaryAction>
          ))}
        </div>
      )}
    </div>
  );
}

interface WatchCopyButtonProps {
  copied: boolean;
  onClick: () => void;
  label: string;
  copiedLabel?: string;
  className?: string;
}

export function WatchCopyButton({ copied, onClick, label, copiedLabel = 'Copied', className }: WatchCopyButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'min-h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98]',
        copied && 'border-green-400/30 bg-green-400/10 text-green-400',
        className
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="text-[11px] font-black uppercase tracking-widest font-mono">
        {copied ? copiedLabel : label}
      </span>
    </Button>
  );
}

interface WatchStatusPillProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function WatchStatusPill({ children, tone = 'neutral', className }: WatchStatusPillProps) {
  const toneClassName = {
    neutral: 'border-white/10 bg-white/10 text-white/55',
    success: 'border-green-400/25 bg-green-400/10 text-green-300',
    warning: 'border-orange-400/25 bg-orange-400/10 text-orange-300',
    danger: 'border-red-400/25 bg-red-400/10 text-red-300',
  }[tone];

  return (
    <span className={cn('shrink-0 rounded-full border px-3 py-1 text-fluid-label font-black uppercase', toneClassName, className)}>
      {children}
    </span>
  );
}
