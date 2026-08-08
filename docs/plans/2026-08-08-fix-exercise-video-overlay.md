# Exercise Video Overlay and Mapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the mobility tutorial controls above the workout controls and ensure assigned exercise demos are only linked to videos that match the exercise.

**Architecture:** Raise the tutorial sheet above the base workout layer so its back control owns the top-left touch target. Audit the shared exercise catalog and mobility catalog, correcting verified IDs and removing stale or mismatched IDs rather than showing an unrelated demo. Add regression coverage for the overlay stack and mapping invariants.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Playwright.

---

### Task 1: Reproduce and cover the overlay stacking bug

**Files:**
- Modify: `components/MobilityFlow.tsx`
- Modify: `e2e/program.spec.ts`

**Steps:**

1. Add a Playwright check that starts mobility, opens the exercise tutorial, and verifies the tutorial layer is above the workout layer.
2. Raise the tutorial layer above the base `TopBar` stacking context while preserving its full-screen interaction surface.
3. Run the focused Playwright test and confirm the tutorial back control is the active top-left control.

### Task 2: Correct exercise-to-video assignments

**Files:**
- Modify: `lib/constants.ts`

**Steps:**

1. Replace the Cat-Cow mobility ID with the verified Cat-Cow demo and keep the existing verified hip-flexor demo for Hip Flexor Stretch.
2. Replace the Deep Squat Hold ID with the verified deep-squat mobility demo.
3. Remove video IDs that are unavailable or demonstrably show another exercise, including the incorrect mobility demos and unrelated strength demos.
4. Add a catalog test assertion for the corrected mobility IDs and for the absence of the known mismatches.

### Task 3: Verify the change

**Files:**
- Test: `e2e/program.spec.ts`

**Steps:**

1. Run `npm run lint`.
2. Run `npm run test:e2e`.
3. Run `npm run build`.
