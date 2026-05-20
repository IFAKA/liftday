'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Check, ChevronLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { EXERCISES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatWorkoutType, getWorkoutTypeTone } from '@/lib/schedule';

export default function ExerciseDetailPage() {
  const router = useRouter();
  const { key } = useParams<{ key: string }>();
  const [copied, setCopied] = useState(false);
  const ex = EXERCISES.find((e) => e.key === key);

  if (!ex) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <span className="text-white/30 font-black uppercase tracking-widest text-fluid-label">Exercise not found</span>
      </div>
    );
  }

  const exerciseName = ex.name;

  async function handleCopyName() {
    await copyText(exerciseName);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => router.back()}
            className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleCopyName}
              className={cn('max-w-52 truncate rounded-lg px-2 py-1 text-fluid-ui font-black uppercase tracking-tight leading-none active:bg-white/10', getWorkoutTypeTone(ex.workoutType))}
              aria-label={`Copy ${exerciseName}`}
            >
              {exerciseName}
            </button>
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5 uppercase">{formatWorkoutType(ex.workoutType)}</span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCopyName}
            className={cn(
              'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-fluid-label font-black uppercase tracking-widest active:bg-white/10',
              copied ? 'text-green-300' : 'text-white/65'
            )}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy exercise name'}
          </button>
          <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">How to</span>
          <p className="text-fluid-ui text-white/80 leading-relaxed">{ex.instruction}</p>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 flex-1">
            <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">Unit</span>
            <span className="text-fluid-ui font-black uppercase text-white">{ex.unit === 'seconds' ? 'Seconds' : 'Reps'}</span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 flex-1">
            <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">Type</span>
            <span className={cn('text-fluid-ui font-black uppercase', getWorkoutTypeTone(ex.workoutType))}>{formatWorkoutType(ex.workoutType)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose the API but reject without a secure context.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}
