'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '@/lib/clipboard';

export function useCopyFeedback({ resetMs = 1400 }: { resetMs?: number } = {}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearCopiedTimeout = useCallback(() => {
    if (timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => clearCopiedTimeout, [clearCopiedTimeout]);

  const copy = useCallback(async (key: string, text: string) => {
    await copyText(text);
    clearCopiedTimeout();
    setCopiedKey(key);
    timeoutRef.current = window.setTimeout(() => {
      setCopiedKey((currentKey) => (currentKey === key ? null : currentKey));
      timeoutRef.current = null;
    }, resetMs);
  }, [clearCopiedTimeout, resetMs]);

  const isCopied = useCallback((key: string) => copiedKey === key, [copiedKey]);

  return { copiedKey, copy, isCopied };
}
