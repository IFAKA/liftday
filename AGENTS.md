# Repository Guidelines

## Project Structure & Module Organization

LiftDay is a Next.js 16 PWA using React 19, TypeScript, Tailwind CSS v4, and `@ducanh2912/next-pwa`. Route entry points live in `app/` (`app/program/page.tsx`, `app/history/page.tsx`). Shared UI lives in `components/`, with primitives in `components/ui/`. Reusable state and workflow logic belongs in `hooks/`. Domain logic, storage, routine definitions, and workout calculations live in `lib/`; keep pure helpers there when possible. Static PWA assets and generated service worker files are under `public/`. Planning notes are in `docs/plans/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local Next dev server, usually at `http://localhost:3000`.
- `npm run lint`: run ESLint with Next core-web-vitals, TypeScript, and architectural boundary rules.
- `npm run build`: create a production build with webpack and run TypeScript checks.

There is no `npm test` script currently; use lint and build as the verification gate.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing two-space indentation and single-quote style. Components use `PascalCase` filenames, hooks use `useX.ts`, and lib modules use names such as `routine-score.ts` and `workout-utils.ts`. Preserve the dependency layering enforced in `eslint.config.mjs`: `lib` must not import app, component, or hook code; `hooks` may import `lib`; `components` may import `lib`, `hooks`, and other components; `app` may import all layers.

## Testing Guidelines

No test framework is configured. For changes today, run `npm run lint` and `npm run build`. For UI changes, manually verify the affected route in the local dev server and include screenshots for meaningful visual updates. If tests are added later, colocate focused tests near the feature or place broader integration coverage in a clearly named test directory.

## Commit & Pull Request Guidelines

Recent history uses short imperative commits, often Conventional Commit prefixes such as `feat:` and `fix:` (`feat: add SMV efficient frontier scoring`, `fix: preserve weight/reps on machine-occupied swap`). Keep commits scoped and avoid committing generated `public/sw.js` changes unless the PWA output intentionally changed. Pull requests should include a concise description, verification commands run, linked issue or context, and screenshots for visible UI updates.

## Security & Configuration Tips

Workout data and profile settings are stored locally in browser storage; avoid introducing cloud sync, secrets, or account flows without an explicit design. Do not commit environment files, private keys, or machine-specific artifacts.
