# GEMINI.md - Liftday Mandates

This file contains foundational mandates for the Liftday project that take absolute precedence over general workflows and tool defaults.

## Project Overview
Liftday is a Next.js PWA fitness tracker built with:
- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, `tw-animate-css`
- **UI Components:** shadcn/ui (Radix UI)
- **PWA:** `@ducanh2912/next-pwa`

## Core Mandates
- **Workflow:** After completing any change, always commit and push (`git push origin main`) as the final step. Only push when 100% confident the changes are correct.
- **Styling:** Adhere to Tailwind CSS v4 patterns. Avoid legacy Tailwind v3 syntax if it conflicts with v4 features.
- **UI:** Use existing shadcn/ui components in `components/ui/` and ensure new components follow the same patterns (CVA, tailwind-merge).

## Technical Standards
- **Validation:** Always run `npm run lint` and `npm run build` to verify changes before pushing.
- **PWA:** Ensure PWA-specific configurations in `next.config.ts` and `app/manifest.ts` are preserved.
- **Wakelock:** The `WakeLockProvider` is critical for workout continuity; ensure it is properly wrapped around the application.

## Key Files & Directories
- `app/globals.css`: Custom keyframes and global styles for Tailwind v4.
- `lib/constants.ts`: Shared constants like REST_DURATION.
- `components/RestTimer.tsx`: Circular rest timer with countdown pulse.
- `components/ExerciseScreen.tsx`: Main workout screen logic.
- `hooks/`: Custom hooks for workout and mobility logic (`useWorkout.ts`, `useMobility.ts`).
- `lib/storage.ts`: Persistence layer for workout history and settings.

## Scripts
- `npm run dev`: Start development server.
- `npm run lint`: Run ESLint.
- `npm run build`: Verify production build (includes webpack flag: `next build --webpack`).
