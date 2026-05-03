# Deterministic SMV Optimizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a deterministic optimizer that derives the active gym routine from profile, logged progress, SMV value, recoverability, time, and proportion constraints.

**Architecture:** Add a pure optimizer in `lib/frontier-optimizer.ts` that returns an optimized `RoutineConfig` plus explanation. Keep routine constants as exercise/candidate inputs, then route Program, Program Detail, workout execution, and copy text through the optimized routine so values are not duplicated.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing localStorage workout/profile data, existing SMV scorer.

---

### Task 1: Pure Optimizer

**Files:**
- Create: `lib/frontier-optimizer.ts`

Steps:
1. Add deterministic candidate slots for the gym routine.
2. Add progress multipliers from logged exercise trends.
3. Greedily add the highest marginal SMV-per-cost set while respecting session set/time caps.
4. Enforce lower-body/neck proportion floors.
5. Return the optimized routine, score, and reasons.

### Task 2: Integrate Optimized Routine

**Files:**
- Modify: `hooks/useWorkout.ts`
- Modify: `app/program/page.tsx`
- Modify: `components/ProgramDetailScreen.tsx`

Steps:
1. Load workout data/profile.
2. Replace the active gym routine with the optimizer output before scoring/execution.
3. Keep non-gym routines unchanged.
4. Show optimizer rationale in Program Detail.

### Task 3: Verify

Steps:
1. Run `npm run lint`.
2. Run `npm run build`.
3. Use Playwright screenshots for Program Detail and Settings Routine.
4. Commit and push `main`.
