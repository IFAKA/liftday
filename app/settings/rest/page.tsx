'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadUserProfile, setRestDuration } from '@/lib/storage';
import { REST_DURATION } from '@/lib/constants';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const REST_STEP = 15;
const REST_MIN = 30;
const REST_MAX = 300;

export default function RestSettingPage() {
  const router = useRouter();
  const [duration, setDuration] = useState(REST_DURATION);

  useEffect(() => {
    const profile = loadUserProfile();
    setDuration(profile?.restDuration ?? REST_DURATION);
  }, []);

  function adjust(delta: number) {
    setDuration((prev) => {
      const next = Math.min(REST_MAX, Math.max(REST_MIN, prev + delta));
      setRestDuration(next);
      return next;
    });
  }

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const display = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" onClick={() => router.back()} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
            <ArrowLeft className="icon-lg" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Rest</span>}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 pb-safe">
        <span className="font-mono font-black tabular-nums tracking-tighter text-white text-fluid-timer">
          {display}
        </span>

        <div className="flex gap-4 w-full">
          <button
            onClick={() => adjust(-REST_STEP)}
            disabled={duration <= REST_MIN}
            className="flex-1 py-5 rounded-2xl bg-white/10 text-white font-black text-fluid-ui uppercase tracking-tight active:bg-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all"
          >
            −15s
          </button>
          <button
            onClick={() => adjust(REST_STEP)}
            disabled={duration >= REST_MAX}
            className="flex-1 py-5 rounded-2xl bg-white/10 text-white font-black text-fluid-ui uppercase tracking-tight active:bg-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all"
          >
            +15s
          </button>
        </div>

        <p className="text-fluid-label text-white/20 font-mono text-center leading-relaxed">
          Default rest between sets
        </p>
      </div>
    </div>
  );
}
