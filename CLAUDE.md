# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Next.js 16 PWA fitness tracker. Stack: Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion. No backend — all data in `localStorage`.

## Commands
```bash
npm run dev      # dev server
npm run test:e2e # Playwright e2e tests
npm run build    # production build (uses --webpack flag)
npm run lint     # eslint
```
Playwright e2e specs live in `e2e/` and use `playwright.config.ts` to start the Next dev server automatically. Use normal project commands (`npm run test:e2e`, or `npm run test:e2e:ui` for debugging) instead of one-off browser scripts.

## Workflow
- After completing any change, commit and push (`git push origin main`) as the final step.
- Only push when 100% confident changes are correct and `npm run lint`, `npm run test:e2e`, and `npm run build` pass.

## Architecture

### Routing (App Router)
- `/` — `TodayScreen`: today's workout state machine (idle → exercising → resting → transitioning → complete). Workout stays here because it's tightly coupled to `useWorkout`.
- `/history`, `/history/[date]`, `/history/personal-bests` — past sessions
- `/routine`, `/split`, `/profile`, `/program` — config screens
- `/onboarding` — first-visit redirect from TodayScreen
- `/exercises/[key]` — exercise detail (YouTube embed + instructions)

### State & Data Flow
- `hooks/useWorkout.ts` — central workout state machine; drives `ExerciseScreen`, `RestTimer`, `SessionComplete`
- `lib/storage.ts` — all localStorage reads/writes; `WorkoutData` keyed by `YYYY-MM-DD`
- `lib/types.ts` — canonical types: `Exercise`, `WorkoutSession`, `SetEntry`, `UserProfile`, `TierChain`
- `lib/constants.ts` — `EXERCISES` map, `REST_DURATION`, storage keys
- `lib/tiers.ts` — tier chain resolution; `resolveExerciseKey()` / `resolveExerciseKeyWithEquipment()`
- `lib/routines/` — each routine is a file (`calisthenics.ts`, `gym.ts`); `index.ts` exports `ROUTINES[]`
- `lib/progression.ts` — `evaluateTierProgress()`, `getTargets()`, `getWeightTarget()`
- `lib/schedule.ts` — maps today's date to `WorkoutType` (push/pull/legs/rest)
- `lib/smv.ts` — SMV muscle ROI scores for equipment-aware exercise swapping
- `lib/equipment.ts` — `EquipmentKey` type + `getRequiredEquipment()`
- `lib/nav-context.tsx` — `NavContext` hides `BottomNav` during active workout states

### Key Types
- `SetEntry = number | { reps: number; weight: number }` — backwards-compatible union; gym exercises use weighted form
- `WorkoutSession` — indexed by `ExerciseKey`, plus `logged_at`, `started_at?`, `week_number`, `workout_type`
- `TierChain` — defines a progression slot: `slotId`, `workoutType`, `exercises[]` (tier 0→1→2), `priority`, `fixed`
- `UserProfile` — `activeRoutine`, `tiers: TierMap`, `tierProgress` — all persisted in localStorage

### Adding a Routine
1. Create `lib/routines/{id}.ts` with a `RoutineConfig`
2. Import and add to `ROUTINES[]` in `lib/routines/index.ts`

## Key Files
- `components/ExerciseScreen.tsx` — main workout UI
- `components/RestTimer.tsx` — circular rest timer with 3-2-1 countdown pulse
- `app/globals.css` — custom keyframes and global styles
- `lib/constants.ts` — shared constants (`REST_DURATION`, storage keys, `EXERCISES`)
