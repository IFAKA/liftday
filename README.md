# LiftDay

A minimal PWA for tracking Push/Pull/Legs workouts. No account, no cloud, no bullshit — just open it and lift.

**[liftday.vercel.app](https://liftday.vercel.app)**

## What it does

- 6-day PPL split (Push/Pull/Legs × 2, Sunday rest)
- Progressive overload: targets auto-increase when you max out sets
- Week 1–4: 2 sets · Week 5+: 3 sets
- Rest timer with background notification when you switch apps
- 5-minute mobility flow on rest days
- Training history + personal records
- Works offline, installs as a PWA

## App overview

LiftDay keeps workout planning and logging local to the device. It gives you the next session, exercise targets, rest timing, and recent progress without requiring an account or network connection.

The app includes:

- Routine selection and compact exercise drill-downs
- Automatic set targets based on the current training week
- Workout logging with reps, weight, and RIR
- Body measurement and training history views
- Rest-day mobility flow
- Offline PWA install support

## Stack

Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript · `@ducanh2912/next-pwa`

## Run locally

```bash
npm install
npm run dev
npm run test:e2e
```

`npm run build` is the production/PWA verification build and must stay on webpack so `@ducanh2912/next-pwa` can generate the service worker. `npm run build:turbo` is only a diagnostic speed check and does not verify PWA output.
# Deployment trigger Thu Mar  5 19:54:50 CET 2026
