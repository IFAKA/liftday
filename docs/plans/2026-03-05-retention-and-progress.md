# Psychological Retention & Visual Progress Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance user retention through a new segmented progress bar, streak loss warnings, milestone celebrations, and a "LEVELED UP" reveal for exercise progression.

**Architecture:**
- Update `ExerciseScreen` to use a more structured, segmented progress bar.
- Modify `TodayScreen` to display a streak loss warning on the idle state.
- Update `SessionComplete` to detect and celebrate session milestones and tier advancements.
- Update `hooks/useWorkout.ts` to expose the `advancedTiers` to `SessionComplete`.

**Tech Stack:** Next.js, React, Tailwind CSS v4, Lucide Icons.

---

### Task 1: Update ExerciseScreen with Segmented Progress Bar

**Files:**
- Modify: `components/ExerciseScreen.tsx`

**Step 1: Replace the current dot progress bar with a segmented version.**

```tsx
// Around line 105 in components/ExerciseScreen.tsx
<div className="flex-1 flex items-center gap-[3px] h-1.5">
  {Array.from({ length: totalExercises }).map((_, exIdx) => (
    <div 
      key={exIdx} 
      className={cn(
        "flex flex-1 gap-[2px] p-[1px] rounded-sm bg-muted/20",
        exIdx === exerciseIndex && "bg-foreground/10 ring-1 ring-foreground/20"
      )}
    >
      {Array.from({ length: setsPerExercise }).map((_, setIdx) => {
        const done = exIdx < exerciseIndex || (exIdx === exerciseIndex && setIdx < currentSet);
        const active = exIdx === exerciseIndex && setIdx === currentSet;
        return (
          <div
            key={setIdx}
            className={cn(
              'h-1 flex-1 rounded-[1px] transition-all duration-300',
              done ? 'bg-foreground' : active ? 'bg-foreground/40 animate-pulse' : 'bg-muted-foreground/10'
            )}
          />
        );
      })}
    </div>
  ))}
</div>
```

**Step 2: Run build to verify no regressions**

Run: `npm run build`
Expected: Success

**Step 3: Commit**

```bash
git add components/ExerciseScreen.tsx
git commit -m "feat: implement segmented progress bar in ExerciseScreen"
```

---

### Task 2: Implement Streak Loss Warning in TodayScreen

**Files:**
- Modify: `components/TodayScreen.tsx`

**Step 1: Update the idle state in `TodayContent` to show a streak loss warning.**

```tsx
// Inside TodayContent in components/TodayScreen.tsx
// Replace line 191-197 with:
{!isDone && (
  <div className="flex flex-col items-center gap-4 w-full">
    <Button
      size="lg"
      onClick={workout.startWorkout}
      className="rounded-full w-20 h-20 animate-pulse active:scale-95 transition-transform"
    >
      <Play className="w-10 h-10" />
    </Button>
    {streak > 0 && (
      <div 
        className="flex flex-col items-center gap-1.5"
        style={{ animation: 'stagger-in 400ms ease-out 400ms backwards' }}
      >
        <p className="text-xs text-orange-400 font-mono tracking-wider flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" />
          {streak} DAY STREAK
        </p>
        <p className="text-[10px] text-red-400/80 font-mono tracking-widest uppercase animate-pulse">
          Don't lose it today
        </p>
      </div>
    )}
  </div>
)}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Success

**Step 3: Commit**

```bash
git add components/TodayScreen.tsx
git commit -m "feat: add streak loss warning to TodayScreen"
```

---

### Task 3: Enhance SessionComplete with Tier Advancement Reveal

**Files:**
- Modify: `components/SessionComplete.tsx`

**Step 1: The logic for `advancedTiers` and milestone detection is already present in `SessionComplete.tsx`. I will ensure the visual reveal is prominent.**

```tsx
// Around line 230 in components/SessionComplete.tsx
{advancedTiers.length > 0 && (
  <div 
    className="flex flex-col items-center gap-1 mt-2"
    style={{ animation: 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 400ms backwards' }}
  >
    <p className="text-[10px] text-green-400 font-mono tracking-[0.2em] uppercase">
      LEVEL UP UNLOCKED
    </p>
    <p className="text-lg font-bold text-green-400 text-center uppercase">
      {advancedTiers.join(' & ')}
    </p>
  </div>
)}
```

**Step 2: Ensure the Milestone celebration is visible.**

```tsx
// Around line 220 in components/SessionComplete.tsx
{milestone && (
  <div 
    className="flex flex-col items-center gap-0.5"
    style={{ animation: 'slide-up-in 260ms ease-out 320ms backwards' }}
  >
    <p className="text-xs text-yellow-400 uppercase tracking-[0.3em] font-mono">
      ★ MILESTONE REACHED ★
    </p>
    <p className="text-sm text-yellow-500 font-bold uppercase">
      {milestone} SESSIONS COMPLETED
    </p>
  </div>
)}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Success

**Step 4: Commit**

```bash
git add components/SessionComplete.tsx
git commit -m "feat: enhance tier advancement and milestone reveal in SessionComplete"
```

---

### Task 4: Final Verification and Push

**Step 1: Run final lint and build**

Run: `npm run lint && npm run build`
Expected: Success

**Step 2: Push to origin**

Run: `git push origin main`
Expected: Success
