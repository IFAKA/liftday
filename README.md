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

## Why this routine is the fastest path to a V-taper

A V-taper is defined by one ratio: shoulder width ÷ waist width. Two muscle groups drive that ratio — **lats** (back width) and **lateral deltoids** (shoulder width). Everything else is secondary.

### The two bottlenecks

**1. Lats need vertical pulling, not just rows**

Rows build lat *thickness*. Pull-ups and straight-arm pulldowns build lat *width* by loading the lat at full overhead stretch. A 2025 systematic review found stretch-mediated hypertrophy — training a muscle at its longest length — may produce greater growth than shortened-position training ([ScienceDirect, 2025](https://www.sciencedirect.com/science/article/pii/S2666337625000332)). Pull-ups take the lat from full overhead stretch to full contraction. Rows do not. The previous routine had zero vertical pulls.

**2. Side delts need direct isolation**

Side delts are not meaningfully trained by any compound push movement. A 2025 RCT (n=trained subjects, 8 weeks) measured **3.3–4.6% lateral deltoid thickness increase** from isolated lateral raises alone ([PubMed PMID 40692697](https://pubmed.ncbi.nlm.nih.gov/40692697/) / [Frontiers in Physiology, 2025](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1611468/full)). Push-ups, dips, and overhead press do not replicate this. The previous routine had zero lateral raise work.

### What changed and why

| Day | Removed | Added | Reason |
|-----|---------|-------|--------|
| Pull | Inverted Row | **Pull-Up** | Vertical pull — full lat stretch overhead, highest lat activation |
| Pull | TRX Bicep Curl | **TRX Straight-Arm Pulldown** | Isolates lat at long length, no bicep involvement diluting the stimulus |
| Push | Regular Push-Up | **Band Lateral Raise** | Only exercise that directly loads the lateral deltoid through full range |
| Push | TRX Tricep Extension | **TRX Y Raise** | Builds upper back width and rear delts — completes the 3D shoulder look |

### Volume targets (from RP Strength dose-response model)

Research shows weekly volume — not frequency — is the primary driver of hypertrophy ([SportRxiv meta-regression, Dec 2025](https://www.researchgate.net/publication/384628335_The_Resistance_Training_Dose-Response_Meta-Regressions_Exploring_the_Effects_of_Weekly_Volume_and_Frequency_on_Muscle_Hypertrophy_and_Strength_Gain)):

| Muscle | MEV | MAV (target) | This routine |
|--------|-----|--------------|--------------|
| Lats | 8–10 sets/week | 14–20 sets/week | ~18 sets/week (2 pull days × 9 sets) |
| Side delts | 6–8 sets/week | 12–18 sets/week | ~12 sets/week (2 push days × 6 sets) |

The 2×/week PPL schedule already in the app hits MAV for both muscle groups without adding training days.

### Why PPL 2× is optimal here

A 2025 frequency study (12 weeks, resistance-trained subjects) found no significant hypertrophy difference between 1×, 2×, or 3× per week when total weekly volume was equated ([PubMed PMID 40580213](https://pubmed.ncbi.nlm.nih.gov/40580213/)). 2× wins in practice because it splits volume across sessions before per-session fatigue degrades set quality. 6 hard sets per session is near the within-session ceiling before returns diminish.

### EMG note on grip and exercise selection

A 2025 EMG study found grip width and orientation do not significantly change lat recruitment ([MDPI, 2025](https://www.mdpi.com/2411-5142/10/3/345)). The constraint is equipment: without a pull-up bar or lat pulldown machine, you cannot perform a true vertical pull. Pull-ups are the only bodyweight solution. If you cannot do a full pull-up yet, use a chair for assistance — the lat stretch and range of motion still apply.

## Stack

Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript · `@ducanh2912/next-pwa`

## Run locally

```bash
npm install
npm run dev
```
