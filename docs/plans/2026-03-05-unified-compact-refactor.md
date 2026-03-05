# Unified Compact (Smartwatch-Ready) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the UI/UX to be "Compact-First," ensuring it works perfectly on both smartphones and smartwatches (including circular displays) by using a centered, vertically stacked, circular-safe layout.

**Architecture:**
- **Global:** Define safe-area CSS variables and update viewport for "cover" fit.
- **Centric-Stack:** Refactor `ExerciseScreen` and `TodayScreen` to keep interaction in the inner 80% safe zone.
- **Responsive Logic:** Use Tailwind's container and spacing utilities to scale from 150px (watch) to 500px+ (phone).
- **Interactive:** Ensure `NumberWheel` and buttons are large enough for tiny touch targets.

**Tech Stack:** Next.js, React, Tailwind CSS v4.

---

### Task 1: Global Safe-Area & Viewport Update

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Step 1: Update viewport for circular display support.**

```tsx
// app/layout.tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
  interactiveWidget: 'resizes-visual',
  viewportFit: 'cover', // Add this
};
```

**Step 2: Add safe-area variables to globals.css.**

```css
/* app/globals.css */
:root {
  --safe-top: env(safe-area-inset-top, 16px);
  --safe-bottom: env(safe-area-inset-bottom, 16px);
  --safe-left: env(safe-area-inset-left, 16px);
  --safe-right: env(safe-area-inset-right, 16px);
}

@layer base {
  body {
    /* Use padding to enforce safe area across all screens */
    padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }
}
```

**Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "style: add safe-area support and viewport-fit=cover for smartwatch compatibility"
```

---

### Task 2: Refactor ExerciseScreen to "Centric-Stack"

**Files:**
- Modify: `components/ExerciseScreen.tsx`

**Step 1: Refactor layout to a single centered column with safe-area considerations.**
- Move progress bar to a tiny absolute strip at the top.
- Center the exercise name, wheel, and log button vertically.
- Ensure the "Exit" and "Info" buttons are in the safe corners.

```tsx
// components/ExerciseScreen.tsx
// Refactor the main return to use a flex-col with justify-center
return (
  <div className="flex flex-col items-center justify-between h-full w-full max-w-sm mx-auto gap-2">
    {/* Tiny Progress Strip */}
    <div className="w-full flex gap-1 h-1 px-4">
      {/* ... progress segments ... */}
    </div>

    {/* Header Section */}
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="text-lg font-bold uppercase tracking-tight">{exercise.name}</h1>
      <button onClick={() => setShowInstruction(true)} className="text-[10px] opacity-60 uppercase tracking-widest">How to</button>
    </div>

    {/* Center Piece: Wheel */}
    <div className="flex-1 flex items-center justify-center w-full">
       <NumberWheel ... />
    </div>

    {/* Footer Section */}
    <div className="w-full pb-2">
       <Button onClick={() => onLogSet(val)} className="w-full rounded-full py-6 text-lg">LOG SET</Button>
    </div>
  </div>
)
```

**Step 2: Commit**

```bash
git add components/ExerciseScreen.tsx
git commit -m "feat: refactor ExerciseScreen to centered compact layout"
```

---

### Task 3: Refactor TodayScreen for Single-Column Focus

**Files:**
- Modify: `components/TodayScreen.tsx`

**Step 1: Simplify the idle screen.**
- Center the workout title ("PUSH/PULL/LEGS").
- Make the "Play" button the prominent center element.
- Move history/streak stats to a unified row.

**Step 2: Commit**

```bash
git add components/TodayScreen.tsx
git commit -m "feat: refactor TodayScreen for compact smartwatch-first view"
```

---

### Task 4: Responsive Component Tweaks

**Files:**
- Modify: `components/RestTimer.tsx`
- Modify: `components/SessionComplete.tsx`

**Step 1: Ensure RestTimer buttons (Skip/Undo) are centered and large.**
**Step 2: Ensure SessionComplete summary is a centered vertical list.**

**Step 3: Commit**

```bash
git add components/RestTimer.tsx components/SessionComplete.tsx
git commit -m "feat: optimize RestTimer and SessionComplete for compact screens"
```

---

### Task 5: Final Verification

**Step 1: Run build & lint.**
Run: `npm run lint && npm run build`

**Step 2: Push to origin.**
Run: `git push origin main`
