# SMV Efficient Frontier Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the SMV score reflect the current routine honestly, including real tiers, set counts, diminishing returns, and routine cost.

**Architecture:** Keep the scoring model in `lib/smv.ts`, keep routine aggregation in `lib/routine-score.ts`, and pass live profile settings from `app/program/page.tsx`. Routine edits should only happen after the scoring model exposes a real inefficiency.

**Tech Stack:** Next.js App Router, TypeScript, localStorage profile data, existing routine/tier model.

---

### Task 1: Replace Linear SMV With Benefit Minus Cost

**Files:**
- Modify: `lib/smv.ts`
- Modify: `lib/routine-score.ts`

Steps:
1. Add per-exercise muscle contribution weights.
2. Score each muscle with diminishing returns after target volume.
3. Keep existing lower-body floor penalties.
4. Add routine cost for total sets, long sessions, and equipment changes.
5. Return diagnostics so the UI can show whether the score is efficient or inflated.

### Task 2: Score The Current User Routine

**Files:**
- Modify: `app/program/page.tsx`

Steps:
1. Pass `profile.tiers` into `scoreRoutine`.
2. Pass actual `setsPerExercise`.
3. Keep the weekly SMV UI compatible with the new result shape.

### Task 3: Adjust Routine Only If Justified

**Files:**
- Modify: `lib/routines/gym.ts`

Steps:
1. Reorder gym push so free-weight compounds come first and cable work is grouped later.
2. Reduce excessive gym legs session length without dropping the lower-body floor below target.
3. Keep pull day mostly unchanged because it is already pulley-efficient.

### Task 4: Verify

Steps:
1. Run lint.
2. Run production build.
3. Report scoring/routine behavior and any remaining limitations.
