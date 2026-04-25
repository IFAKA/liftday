# Views-to-Routes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert 3 remaining useState-based views into proper Next.js App Router routes for URL persistence, back/forward, and shareability.

**Architecture:** Each view becomes a `page.tsx` under `app/`. Components keep their UI logic; pages handle data loading and routing. `HistoryScreen` and `TodayScreen` replace `useState` navigation with `router.push`.

**Tech Stack:** Next.js App Router, TypeScript, `useRouter` / `useParams` from `next/navigation`, `loadWorkoutData` from `lib/storage`.

---

### Task 1: Create `/onboarding` route

**Files:**
- Create: `app/onboarding/page.tsx`
- Modify: `components/TodayScreen.tsx` (lines 27–52)

**Step 1: Create the route page**

```tsx
// app/onboarding/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Onboarding } from '@/components/Onboarding';
import { saveUserProfile, getDefaultProfile } from '@/lib/storage';

const ONBOARDING_KEY = 'liftday_onboarding_completed';

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    saveUserProfile(getDefaultProfile());
    router.replace('/');
  };

  return <Onboarding onComplete={handleComplete} />;
}
```

**Step 2: Update TodayScreen to redirect instead of useState**

Remove the `showOnboarding` state and the `handleCompleteOnboarding` handler. Replace with a redirect in the `useEffect`:

In `components/TodayScreen.tsx`, replace lines 23–52:

```tsx
const ONBOARDING_KEY = 'liftday_onboarding_completed';

export function TodayScreen() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
    }
  }, [router]);

  const today = useMemo(() => {
    if (!mounted) return null;
    return new Date();
  }, [mounted]);

  if (!today) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-black">
        <Dumbbell className="w-8 h-8 text-white/50 animate-pulse" />
      </div>
    );
  }

  return <TodayContent date={today} />;
}
```

Also remove the `Onboarding` import from `TodayScreen.tsx` since it's no longer used there.

**Step 3: Verify**

- Fresh browser (clear localStorage) → should land on `/onboarding`, complete flow → redirects to `/`
- Returning user → stays on `/`

**Step 4: Commit**

```bash
git add app/onboarding/page.tsx components/TodayScreen.tsx
git commit -m "feat: convert onboarding to /onboarding route"
```

---

### Task 2: Create `/history/personal-bests` route

**Files:**
- Create: `app/history/personal-bests/page.tsx`
- Modify: `components/HistoryScreen.tsx` (remove `showPBs` state, replace with router.push)

**Step 1: Extract PBs computation to a utility** (optional but clean — the `prs` useMemo logic is ~15 lines, can inline it in the page instead)

**Step 2: Create the route page**

The `prs` computation currently lives in `HistoryScreen`. Copy it to the new page (data loaded same way as `/history/page.tsx`):

```tsx
// app/history/personal-bests/page.tsx
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { loadWorkoutData } from '@/lib/storage';
import { EXERCISES } from '@/lib/constants';
import { WorkoutData } from '@/lib/types';

export default function PersonalBestsPage() {
  const router = useRouter();
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    setData(loadWorkoutData());
  }, []);

  const prs = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of Object.values(data)) {
      if (!session.logged_at) continue;
      for (const ex of EXERCISES) {
        const reps = session[ex.key];
        if (reps && reps.length > 0) {
          const best = Math.max(...reps);
          if (!result[ex.key] || best > result[ex.key]) result[ex.key] = best;
        }
      }
    }
    return result;
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.back()} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={
          <div className="flex flex-col items-center">
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Personal Bests</span>
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">{Object.keys(prs).length} EXERCISES</span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
        <div className="flex flex-col gap-3">
          {EXERCISES.filter((ex) => prs[ex.key]).map((ex) => (
            <div key={ex.key} className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-fluid-ui font-black uppercase tracking-tight text-white truncate">{ex.name}</span>
              <div className="flex items-baseline gap-2 shrink-0 ml-3">
                <span className="text-fluid-exercise font-black tabular-nums tracking-tighter text-white leading-none">{prs[ex.key]}</span>
                <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">{ex.unit === 'seconds' ? 'Secs' : 'Reps'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Update HistoryScreen**

- Remove `showPBs` state and the `if (showPBs)` render block (lines 27, 67–98)
- Change the Personal Bests card `onClick` from `() => setShowPBs(true)` to `() => router.push('/history/personal-bests')`
- Add `useRouter` import if not present (it's not currently imported in HistoryScreen)

**Step 4: Verify**

- `/history` → tap Personal Bests → navigates to `/history/personal-bests`
- Back button / browser back → returns to `/history`

**Step 5: Commit**

```bash
git add app/history/personal-bests/page.tsx components/HistoryScreen.tsx
git commit -m "feat: convert personal bests to /history/personal-bests route"
```

---

### Task 3: Create `/history/[date]` route

**Files:**
- Create: `app/history/[date]/page.tsx`
- Modify: `components/HistoryScreen.tsx` (remove `selectedSession` state, replace with router.push)

**Step 1: Create the dynamic route page**

The date param format is `YYYY-MM-DD` (e.g. `2024-01-15`). The session detail logic currently in `HistoryScreen` lines 100–125 moves here:

```tsx
// app/history/[date]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { RoutineScreen } from '@/components/RoutineScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData, WorkoutType, Exercise } from '@/lib/types';
import { PUSH_EXERCISES, PULL_EXERCISES, LEGS_EXERCISES } from '@/lib/constants';

const TYPE_COLOR: Record<Exclude<WorkoutType, 'rest'>, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

export default function HistoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const dateKey = params.date;
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    setData(loadWorkoutData());
  }, []);

  const session = data[dateKey];
  if (!session) {
    // Data not loaded yet or invalid date — show nothing (avoids flash)
    return null;
  }

  const wt = session.workout_type;
  const allExercises: Exercise[] = wt === 'push' ? PUSH_EXERCISES : wt === 'pull' ? PULL_EXERCISES : LEGS_EXERCISES;
  const exercisesWithReps = allExercises.filter((ex) => {
    const reps = session[ex.key];
    return reps && reps.length > 0;
  });
  const loggedReps: Record<string, number[]> = {};
  for (const ex of exercisesWithReps) {
    const reps = session[ex.key];
    if (reps) loggedReps[ex.key] = reps;
  }
  const displayDate = new Date(dateKey + 'T12:00:00');

  return (
    <RoutineScreen
      exercises={exercisesWithReps}
      title={wt?.toUpperCase() ?? ''}
      titleColor={wt ? TYPE_COLOR[wt] : 'text-white'}
      subtitle={format(displayDate, 'MMM d, EEE').toUpperCase()}
      loggedReps={loggedReps}
      onBack={() => router.back()}
    />
  );
}
```

**Step 2: Update HistoryScreen**

- Remove `selectedSession` state (line 26)
- Remove the `if (selectedSession)` render block (lines 100–125)
- Change each session card `onClick` from `() => setSelectedSession(dateKey)` to `() => router.push(\`/history/${dateKey}\`)`
- Add `useRouter` import (needed for the PBs change in Task 2 too)

**Step 3: Clean up HistoryScreen**

After Tasks 2 and 3, `HistoryScreen` no longer needs:
- `useState` for `selectedSession` or `showPBs`
- `RoutineScreen` import
- The `useEffect` that manually manages `popstate` (lines 29–37) — the browser handles this natively now via real routes

The `onBack` prop can stay (used by the Back button in the TopBar, called from `/history/page.tsx` via `router.push('/')`).

**Step 4: Verify**

- `/history` → tap a session → navigates to `/history/2024-01-15`
- Back button / browser back → returns to `/history`
- Direct URL to `/history/2024-01-15` works

**Step 5: Commit**

```bash
git add app/history/[date]/page.tsx components/HistoryScreen.tsx
git commit -m "feat: convert history detail to /history/[date] route"
```

---

### Task 4: Final cleanup + push

**Step 1: Remove dead code from HistoryScreen**

After tasks 2 and 3, verify these are gone:
- `selectedSession` state
- `showPBs` state  
- `if (showPBs)` block
- `if (selectedSession)` block
- `RoutineScreen` import
- Manual `popstate` useEffect
- `useState` import (if only used for the above)

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Push**

```bash
git push origin main
```
