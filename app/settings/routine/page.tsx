'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cleanRoutineDataSinceLatestRoutine, loadUserProfile, setActiveRoutine, TEMP_ROUTINE_CLEANUP_START_DATE } from '@/lib/storage';
import { ROUTINES } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Dumbbell, PersonStanding, Trash2 } from 'lucide-react';
import { WatchListItem } from '@/components/WatchSurface';

const ICONS = {
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
} as const;

export default function RoutineSettingPage() {
  const router = useRouter();
  const [activeRoutineId, setActiveRoutineId] = useState(() => {
    if (typeof window === 'undefined') return 'gym';
    return loadUserProfile()?.activeRoutine ?? 'gym';
  });
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  function handleSelect(id: string) {
    setActiveRoutineId(id);
    setActiveRoutine(id);
    router.back();
  }

  function handleCleanRoutineData() {
    const result = cleanRoutineDataSinceLatestRoutine();
    if (!result) {
      setCleanupMessage('Clean failed');
      setShowCleanupConfirm(false);
      return;
    }

    setCleanupMessage(`Kept ${result.keptSessions}. Removed ${result.removedSessions}.`);
    setShowCleanupConfirm(false);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" onClick={() => router.back()} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
            <ArrowLeft className="icon-lg" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Routine</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-3">
        <WatchListItem
          href="/program/detail"
          label="Active plan"
          title="View routine"
          subtitle="Exercises, set counts, SMV score, copy"
        />

        {ROUTINES.map(({ id, name, description, icon }) => {
          const isActive = activeRoutineId === id;
          const Icon = ICONS[icon];
          return (
            <WatchListItem
              key={id}
              onClick={() => handleSelect(id)}
              icon={Icon}
              title={name}
              subtitle={description}
              active={isActive}
              trailing={isActive ? <div className="h-2 w-2 shrink-0 rounded-full bg-white" /> : undefined}
            />
          );
        })}

        <WatchListItem
          onClick={() => setShowCleanupConfirm(true)}
          icon={Trash2}
          label="Temp"
          title="Clean routine"
          subtitle={cleanupMessage ?? `Keep ${TEMP_ROUTINE_CLEANUP_START_DATE}+ sessions. Reset tiers.`}
          trailing={<span className="text-fluid-label font-black uppercase text-red-300/80">Run</span>}
          className="border-red-400/15 bg-red-500/10 text-red-100 active:bg-red-500/15"
        />

        <p className="text-fluid-label text-white/20 font-mono mt-4 leading-relaxed px-1">
          Switching routines preserves all progress. Tiers are tracked independently per routine.
        </p>
      </div>

      <Dialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
        <DialogContent className="max-w-[18rem] rounded-2xl border-white/10 bg-zinc-950 p-5 text-white shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-fluid-ui font-black uppercase tracking-tight">
              Clean routine?
            </DialogTitle>
            <DialogDescription className="text-fluid-label leading-relaxed text-white/55">
              Keeps sessions from {TEMP_ROUTINE_CLEANUP_START_DATE}, clears older workouts, resets tiers, and keeps body logs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="destructive"
              onClick={handleCleanRoutineData}
              className="min-h-11 rounded-xl font-black uppercase"
            >
              Clean
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCleanupConfirm(false)}
              className="min-h-11 rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
