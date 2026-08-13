# Explicit Superset Pairings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Encode the fixed routine's intended supersets and surface the paired exercise during workout execution without changing exercise selection, set allocation, schedule, or time cap.

**Architecture:** Add an optional `supersetGroup` to routine slots. The resolved workout plan carries that group forward, and a pure helper resolves the partner for any plan item. Workout screens receive only the partner name, keeping the existing sequential logging and persistence model stable while making the superset relationship visible.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Playwright.

---

### Task 1: Add routine pairing metadata

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/routines/gym.ts`
- Modify: `lib/routine-plan.ts`
- Modify: `lib/superset.ts`
- Test: `e2e/smv-engine.spec.ts`

Add optional slot-level group IDs, assign explicit pairs to the four gym sessions, preserve unpaired final slots, and expose partner lookup from the resolved plan.

### Task 2: Surface pairing context in workout screens

**Files:**
- Modify: `hooks/useWorkout.ts`
- Modify: `components/TodayScreen.tsx`
- Modify: `components/ExerciseScreen.tsx`
- Modify: `components/RestTimer.tsx`
- Modify: `components/ExerciseTransition.tsx`

Pass the current/next partner names through the existing workout flow and display a compact watch-friendly cue near the exercise title or next-exercise context.

### Task 3: Add UI regression coverage

**Files:**
- Modify: `e2e/program.spec.ts`

Start the Monday workout at a watch viewport and assert the first exercise identifies its paired pulldown; assert the rest state keeps the pairing cue visible.

### Task 4: Verify and hand off

Run `npm run lint`, `npm run test:e2e`, and `npm run build`. Review the diff and commit/push only after all checks pass.
