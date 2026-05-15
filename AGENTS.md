# Repository Guidelines

## Project Structure & Module Organization

LiftDay is a Next.js 16 PWA using React 19, TypeScript, Tailwind CSS v4, and `@ducanh2912/next-pwa`. Route entry points live in `app/` (`app/program/page.tsx`, `app/history/page.tsx`). Shared UI lives in `components/`, with primitives in `components/ui/`. Reusable state and workflow logic belongs in `hooks/`. Domain logic, storage, routine definitions, and workout calculations live in `lib/`; keep pure helpers there when possible. Static PWA assets and generated service worker files are under `public/`. Planning notes are in `docs/plans/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local Next dev server, usually at `http://localhost:3000`.
- `npm run lint`: run ESLint with Next core-web-vitals, TypeScript, and architectural boundary rules.
- `npm run test:e2e`: run Playwright end-to-end tests from `e2e/`; the Playwright config starts the Next dev server automatically.
- `npm run test:e2e:ui`: open Playwright's interactive UI runner for local debugging.
- `npm run build`: create a production build with webpack and run TypeScript checks.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing two-space indentation and single-quote style. Components use `PascalCase` filenames, hooks use `useX.ts`, and lib modules use names such as `routine-score.ts` and `workout-utils.ts`. Preserve the dependency layering enforced in `eslint.config.mjs`: `lib` must not import app, component, or hook code; `hooks` may import `lib`; `components` may import `lib`, `hooks`, and other components; `app` may import all layers.

## Muscle Map Maintenance

The `/muscles` page is dynamic and reads active routine, scheduled workout, and logged history data through the shared volume engines. If you add, rename, or remove a `MuscleGroup` in `lib/types.ts` or update exercise muscle contributions in `lib/smv.ts`, also update the muscle map layer in `lib/muscle-map.ts`: region mappings, display labels/targets through `MUSCLE_PRIORITY_PROFILES`, selected-muscle behavior, and the `/muscles` Playwright coverage if the visible output changes. Do not leave a new `MuscleGroup` unmapped, because the body heatmap and copied muscle report depend on that mapping.

## Apple Watch UX/UI Requirements

LiftDay must be Apple Watch first across the entire app, with Today as the primary hub and secondary areas reached through short list rows and shallow drill-downs. Before changing navigation, Program, Progress, workout, or settings screens, review the current Apple Human Interface Guidelines for watchOS and apply the relevant patterns for glanceable, wrist-sized interactions. Treat clutter as a bug: reduce dense copy, nested panels, oversized charts, repeated labels, and competing controls before adding more UI.

When Apple platform guidance conflicts, watchOS guidance is authoritative for this app. Do not add an iOS-style bottom tab bar or reintroduce visible tab bar labels because iOS recommends them; keep navigation accessible with semantic names while optimizing the visible interface for watchOS-style glanceability.

Design for quick workouts in motion. Keep primary actions large, thumb-friendly, and visually dominant. Prefer compact lists, clear hierarchy, progressive disclosure, and single-purpose sections over dashboard-style layouts. Use short labels, direct workout language, generous spacing, and high contrast. Avoid marketing-style hero areas, decorative cards, heavy gradients, tiny controls, and multi-column desktop layouts on mobile.

Program and Progress content must be organized around the next useful decision for the athlete: what to do now, what changed, and what needs attention. If a screen starts to feel messy, split content into smaller states, summaries, or drill-down views rather than compressing everything into one tab.

## Testing Guidelines

Playwright e2e tests live in `e2e/` and use `playwright.config.ts`. Prefer normal project usage: add or update specs under `e2e/`, run them with `npm run test:e2e`, and use `npm run test:e2e:ui` for local debugging. Do not add one-off Playwright scripts or custom server wrappers for routine e2e coverage.

For changes today, run `npm run lint`, `npm run test:e2e`, and `npm run build`. For meaningful visual UI updates, manually verify the affected route in the local dev server and include screenshots when useful.

## Commit & Pull Request Guidelines

Recent history uses short imperative commits, often Conventional Commit prefixes such as `feat:` and `fix:` (`feat: add SMV efficient frontier scoring`, `fix: preserve weight/reps on machine-occupied swap`). Keep commits scoped. After completing any change, verify it works, commit it, and push to `origin main` as the final step. Only push when the change is complete and `npm run lint`, `npm run test:e2e`, plus `npm run build` pass. Avoid committing generated `public/sw.js` changes unless the production build intentionally regenerated PWA output for the app change. Pull requests should include a concise description, verification commands run, linked issue or context, and screenshots for visible UI updates.

## Security & Configuration Tips

Workout data and profile settings are stored locally in browser storage; avoid introducing cloud sync, secrets, or account flows without an explicit design. Do not commit environment files, private keys, or machine-specific artifacts.
