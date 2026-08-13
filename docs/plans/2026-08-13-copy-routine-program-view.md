# Copy Routine in Program View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a clear copy-routine action to the main Program view using the routine represented by `/Users/faka/Downloads/clothed_smv_workout_tracker.xlsx` as the source reference.

**Architecture:** Reuse the existing routine formatter and clipboard feedback hook already used by the routine detail screen. Keep the action in the Program screen’s shallow watch-style layout and add focused Playwright coverage for clipboard output and feedback.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Playwright.

---

### Task 1: Verify the source routine and current Program surface

**Files:**
- Read: `/Users/faka/Downloads/clothed_smv_workout_tracker.xlsx`
- Read: `app/program/page.tsx`
- Read: `lib/routine-format.ts`

**Step 1:** Inspect workbook sheets, headings, and exercise rows.

**Step 2:** Confirm the existing app routine and formatter expose the same routine content needed by the copy action.

### Task 2: Add the Program-view copy action

**Files:**
- Modify: `app/program/page.tsx`

**Step 1:** Load profile and set-count data alongside the existing Program state.

**Step 2:** Add a `Copy Routine` action using `useCopyFeedback` and `formatRoutineForCopy`.

**Step 3:** Place the action after the plan list with existing watch surface primitives and preserve the shallow navigation hierarchy.

### Task 3: Add regression coverage

**Files:**
- Modify: `e2e/program.spec.ts`

**Step 1:** Grant clipboard permissions and open `/program`.

**Step 2:** Click `Copy Routine` and assert the copied text contains the routine title and representative workout content.

**Step 3:** Assert the button exposes copied feedback.

### Task 4: Verify, commit, and push

**Files:**
- Stage only the implementation, test, and plan files.

**Step 1:** Run `npm run lint`.

**Step 2:** Run `npm run test:e2e`.

**Step 3:** Run `npm run build`.

**Step 4:** Commit the scoped changes with an imperative message and push to `origin main`.
