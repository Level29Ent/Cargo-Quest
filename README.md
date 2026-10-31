# Cargo Quest 2

A static, canvas-based platformer. This repository restores the game and its artwork/audio from the existing uploaded deployment, with repaired pit crossings and a coin store.

## Play

Serve this directory with any static HTTP server, or deploy it to Vercel. No install or build step is needed.

- Move: A/D or arrow keys. Jump: Space/W/Up (hold for a higher jump).
- Fire: F/J/Z/K. Sprint: Shift/X. Mobile: onscreen movement, FIRE and JUMP buttons.
- Start/resume: Enter or tap the game. Pause: P. Restart stage: R.
- Store: top-left STORE button or B. Escape closes it. Shopping pauses gameplay and power-up timers.

Pit platforms now start three tiles above the street, rather than randomly reaching six tiles high. They can be crossed with the normal held jump, without sprinting, double jump, or a purchase. Platform spacing and the seeded level layouts are preserved.

## Coins and eight new power-ups

Each collected bolt earns 1 spendable coin in addition to its original score/life bonus. Each defeated zombie earns 3. Coins are separate from score and the 50-bolt extra-life counter.

| Power | Coins | Effect |
| --- | ---: | --- |
| Shield | 20 | Ignore enemy damage for 30 seconds; does not prevent falls or timeout. |
| Coin Magnet | 15 | Collect bolts within five tiles for 30 seconds. |
| Spring Boots | 20 | Higher ground jumps for 30 seconds. |
| Freeze Wave | 25 | Freeze zombies, bosses, and hostile projectiles for 30 seconds. |
| Damage Boost | 20 | Double bullet damage for 30 seconds. |
| Double Coins | 15 | Double earned coins for 30 seconds. |
| Medkit | 10 | Restore all hearts immediately; unavailable at full health. |
| Time Refill | 10 | Add 60 to the stage timer immediately. |

Start a run before buying. Repeat timed purchases extend their duration. Active powers and remaining seconds appear in the game HUD. Powers carry across stages/deaths but reset on a new run. Existing boss-reward upgrades remain unchanged.

Coins persist in this browser's local storage on the same site, across restarts and new runs. They do not sync between devices, preview URLs, or accounts, and clearing site data removes them. If browser storage is blocked, coins work for the current session only. There are no real-money purchases or server-side economy claims.

## Checks

Run `node tests/game.cjs` (Node 24, no dependencies). This executes the real inline game logic with stubbed browser/audio interfaces. It reproduces the old unreachable entry, simulates the fixed held jump without upgrades/sprint, checks generated pit platforms across all 100 stages, and checks earning, purchases, effects, wallet persistence, and shop pause behavior. Visual/mobile checks still require a deployed preview in a browser.
