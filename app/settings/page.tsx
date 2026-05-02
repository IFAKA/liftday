'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadUserProfile } from '@/lib/storage';
import { REST_DURATION } from '@/lib/constants';
import { TopBar } from '@/components/TopBar';
import { ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [{ restDuration, heightCm, weightKg }] = useState(() => {
    if (typeof window === 'undefined') return { restDuration: REST_DURATION, heightCm: 172, weightKg: 66.6 };
    const profile = loadUserProfile();
    return {
      restDuration: profile?.restDuration ?? REST_DURATION,
      heightCm: profile?.heightCm ?? 172,
      weightKg: profile?.weightKg ?? 66.6,
    };
  });

  const mins = Math.floor(restDuration / 60);
  const secs = restDuration % 60;
  const restDisplay = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Settings</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-2">
        <button
          onClick={() => router.push('/settings/rest')}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl bg-white/5 border border-white/5 active:bg-white/10 transition-all"
        >
          <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
            <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Rest</span>
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white">{restDisplay}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30 shrink-0" />
        </button>

        <button
          onClick={() => router.push('/settings/body')}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl bg-white/5 border border-white/5 active:bg-white/10 transition-all"
        >
          <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
            <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Body & goal</span>
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white">{heightCm}cm · {weightKg}kg</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30 shrink-0" />
        </button>
      </div>
    </div>
  );
}
