# Optimizer-Owned Routine Slots Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the optimizer own the active exercise selection while preserving tiers as explicit progression/substitution metadata.

**Architecture:** Add optional selected/progression fields to `TierChain`, teach tier helpers to resolve optimized chains from `selectedExercise`, and have the frontier optimizer emit those fields. Update Program and Progress consumers to use the optimized routine so routine changes flow through one generated routine object.

**Tech Stack:** Next.js 16, React 19, TypeScript, localStorage-backed workout/profile data.

---

### Task 1: Slot Model

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/tiers.ts`

**Steps:**
1. Add optional `selectedExercise`, `progression`, and `alternatives` metadata to `TierChain`.
2. Add helpers that return the optimizer-selected key when present, otherwise preserve legacy tier behavior.
3. Make equipment fallback search explicit alternatives/progression instead of treating `exercises` as the hidden active routine.

### Task 2: Optimizer Output

**Files:**
- Modify: `lib/frontier-optimizer.ts`
- Modify: `lib/progression.ts`

**Steps:**
1. Pass `UserProfile` into routine construction.
2. Select the active exercise deterministically from the slot progression and current profile tier.
3. Emit `selectedExercise`, `progression`, and `alternatives` on optimized chains.
4. Score and describe optimized routines from selected exercises.
5. Evaluate future tier progress against the explicit progression path.

### Task 3: App Consumers

**Files:**
- Modify: `lib/routine-format.ts`
- Modify: `components/ProgramDetailScreen.tsx`
- Modify: `components/HistoryScreen.tsx`
- Modify: `components/ProgressDetailScreen.tsx`
- Modify: `app/program/page.tsx`

**Steps:**
1. Display/copy selected exercises and progression metadata.
2. Use optimized routines in Progress/History diagnostics.
3. Verify `npm run lint`, `npm run build`, and affected UI routes.

