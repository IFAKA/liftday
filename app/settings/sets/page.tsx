'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadUserProfile, setSetsPerExercise } from '@/lib/storage';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function SetsSettingPage() {
  const router = useRouter();
  const [sets, setSets] = useState(2);

  useEffect(() => {
    const profile = loadUserProfile();
    setSets(profile?.setsPerExercise ?? 2);
  }, []);

  function select(n: number) {
    setSets(n);
    setSetsPerExercise(n);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" onClick={() => router.back()} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
            <ArrowLeft className="icon-lg" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Sets</span>}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 pb-safe">
        <span className="font-mono font-black tabular-nums tracking-tighter text-white text-fluid-timer">
          {sets}
        </span>

        <div className="flex gap-4 w-full">
          {[2, 3].map((n) => (
            <button
              key={n}
              onClick={() => select(n)}
              className={`flex-1 py-5 rounded-2xl font-black text-fluid-ui uppercase tracking-tight transition-all ${
                sets === n
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white active:bg-white/20'
              }`}
            >
              {n} sets
            </button>
          ))}
        </div>

        <p className="text-fluid-label text-white/20 font-mono text-center leading-relaxed">
          Sets per exercise
        </p>
      </div>
    </div>
  );
}
