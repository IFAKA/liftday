# App Router-First Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure every user-visible top-level LiftDay screen is represented by an App Router URL and follows Vercel’s deep-linking guidance.

**Architecture:** Keep workout and mobility state in a shared client provider so navigation does not reset an active session, while rendering those flows from `/workout` and `/mobility` App Router pages. Store onboarding’s current step in the `step` query parameter. Keep transient form, timer, and animation state in memory/storage because they are interaction state rather than navigational screens.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `next/navigation`, existing workout and mobility hooks.

---

### Task 1: Add shared session state

**Files:** Create `components/AppStateProvider.tsx`; modify `app/layout.tsx`.

- Create a client context exposing the existing `useWorkout(new Date())` and `useMobility()` results.
- Wrap the root route tree with the provider so `/`, `/workout`, and `/mobility` share active session state.
- Do not change persisted workout draft semantics.

### Task 2: Move workout rendering to `/workout`

**Files:** Create `app/workout/page.tsx` and `components/WorkoutFlow.tsx`; modify `components/TodayScreen.tsx`.

- Extract the existing warm-up, exercise, rest, cooldown, and completion rendering into a reusable workout-flow component.
- Redirect active training sessions from `/` to `/workout` with App Router navigation.
- Start a new scheduled session from `/workout` and return to `/` after quitting or completing the flow.
- Keep the workout engine and local draft as the source of execution state.

### Task 3: Move mobility rendering to `/mobility`

**Files:** Create `app/mobility/page.tsx`; modify `components/TodayScreen.tsx` and `components/RestDayScreen.tsx` only as needed.

- Redirect active mobility sessions from `/` to `/mobility`.
- Start or restore mobility on the route, and return to `/` when the user quits or finishes.
- Preserve the rest-day hub and Today navigation links.

### Task 4: Make onboarding deep-linkable

**Files:** Modify `app/onboarding/page.tsx` and `components/Onboarding.tsx`.

- Read `step` with `useSearchParams()` behind Suspense.
- Use `router.replace()` for Next/Back/Skip/Complete so `/onboarding?step=0`, `/onboarding?step=1`, and `/onboarding?step=2` work with refresh and Back/Forward.
- Clamp invalid query values to the valid step range.

### Task 5: Verify routing and design behavior

**Files:** Modify/add focused coverage under `e2e/`.

- Assert `/workout`, `/mobility`, and onboarding step URLs are real routes and survive refresh/back navigation.
- Check link elements are used for navigation and controls remain keyboard/focus accessible.
- Run `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e`, and `npm run build`.
- Inspect the final diff and push the completed changes to `origin main`.
