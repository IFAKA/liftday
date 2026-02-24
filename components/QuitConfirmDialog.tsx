'use client';

import { useEffect } from 'react';
import { Button } from './ui/button';

interface QuitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function QuitConfirmDialog({ open, onOpenChange, onConfirm }: QuitConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative bg-background border-t border-border rounded-t-2xl p-6 pb-10 w-full max-w-md shadow-xl animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />
        <h2 className="text-lg font-semibold text-center mb-2">Quit workout?</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Your progress for this session will be lost.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-full h-12"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 rounded-full h-12"
            onClick={onConfirm}
          >
            Quit
          </Button>
        </div>
      </div>
    </div>
  );
}
