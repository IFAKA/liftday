'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DEBUG_TRACE_CHANGE_EVENT,
  DEBUG_TRACE_KEY,
  getLiftDayTraceText,
  isDebugTraceEnabled,
} from '@/lib/debug-trace';
import { useNavContext } from '@/lib/nav-context';

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function DebugTraceButton() {
  const { hideNav } = useNavContext();
  const enabled = useSyncExternalStore(subscribeToDebugTrace, isDebugTraceEnabled, () => false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!enabled) return null;

  async function handleCopy() {
    await copyText(getLiftDayTraceText());
    setCopied(true);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn(
        'absolute right-3 z-[90] h-8 rounded-full border border-white/10 bg-black/70 px-3 text-[10px] font-black uppercase tracking-normal text-white/60 shadow-xl backdrop-blur-md active:scale-95 active:bg-white/10',
        hideNav ? 'bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+4.75rem)]'
      )}
      aria-label="Copy debug trace"
    >
      {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Trace'}
    </Button>
  );
}

function subscribeToDebugTrace(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === DEBUG_TRACE_KEY) onStoreChange();
  };

  window.addEventListener(DEBUG_TRACE_CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(DEBUG_TRACE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}
