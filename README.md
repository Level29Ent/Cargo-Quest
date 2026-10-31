# Cargo Quest 2 — 3D Zombie Streets

A 100-stage side-scrolling platformer with lit, depth-tested Three.js geometry, selectable weapons, themed course mechanics, and a saved-coin store. Movement intentionally stays on a side-scrolling plane; this is a 3D-rendered platformer, not a free-roaming first-person game.

## Develop and deploy

Requires Node 24. Run `npm ci`, `npm test`, and `npm run build`. Serve `public/` with a static HTTP server. The Vercel configuration runs the build and serves `public/`. Three.js is bundled locally; no runtime CDN is required. Artwork and voice clips from the original game remain included.

The renderer uses shared instanced geometry/materials, view-window culling, and a device pixel ratio capped at 1.5. It defaults to 3D on WebGL2-capable browsers. The 3D/2D button switches rendering without restarting gameplay. If WebGL initialization or its context fails, gameplay falls back to the original 2D renderer. Real device performance still depends on GPU/browser support.

## Controls

- Move: A/D or arrows. Jump: Space/W/Up (hold for height; tap for a short platform hop).
- Fire: F/J/Z/K or mouse. Sprint: Shift/X. Mobile: onscreen movement, FIRE, JUMP.
- Weapon: Q, keys 1–6, the top-left weapon button, or the free loadout in the store.
- Start/resume: Enter or tap. Pause: P. Restart stage: R. Title arrows select any starting stage.
- Store: STORE button or B. Escape closes it. Shopping pauses gameplay and effect timers.

## Six free weapons

All weapons are immediately available; there is no paid weapon gate or ammunition grind. Heat and cooldowns provide different trade-offs. Existing boss-reward weapon upgrades apply to the equipped weapon.

| Weapon | Behavior |
| --- | --- |
| M240 | Balanced automatic fire |
| Shotgun | Five pellets, short range, slower shots |
| Railgun | High-damage, fast piercing rounds, long cooldown |
| Plasma | Slower, hard-hitting projectiles |
| Flamer | Rapid three-projectile, close-range cone |
| Cryo Blaster | Slows hit enemies and bosses |

## 100 distinct stages, ten course families

Each stage has a deterministic layout, course-specific scenery/palette, element placement/timing, enemies, and a free power cache near the start. Families rotate across regions/rounds, including boss stages; bosses have varying platform arrangements. This is 100 stage configurations using ten mechanic families, not 100 entirely separate hand-authored environments.

| Course | Distinct element |
| --- | --- |
| Neon Market | Overhead supply crates award coins when hit from below |
| Canal Bridges | Green spring pads launch the player |
| Iron Foundry | Steam vents warn before dealing damage |
| Skyline Rooftops | Updrafts extend held jumps |
| Frozen Highway | Slippery braking on ice strips |
| Cargo Conveyor | Conveyor strips carry the player forward |
| Orbital Reactor | Lower gravity for longer jumps |
| Overgrown Ruins | Thorn patches to jump over |
| Flooded Docks | Shallow water slows ground movement |
| Thunder Pass | Beacons warn before lightning strikes |

Element strips are placed only on intact open street, never across a pit. Timed damage has a warning period. The original repaired pit-platform height/spacing remains: no store purchase, sprint, or double jump is required for those crossings.

## Coins and fourteen power-ups

Bolts award 1 coin and defeated zombies award 3, separate from score and the 50-bolt extra-life counter. Free stage caches cycle through the power-up catalog. Existing boss upgrades are unchanged.

| Power | Coins | Effect |
| --- | ---: | --- |
| Shield | 20 | Ignore enemy/element damage for 30s, not falls/timeout |
| Coin Magnet | 15 | Collect bolts within five tiles for 30s |
| Spring Boots | 20 | Higher ground jumps for 30s |
| Freeze Wave | 25 | Freeze zombies, bosses and hostile projectiles for 30s |
| Damage Boost | 20 | Double bullet damage for 30s |
| Double Coins | 15 | Double earned coins for 30s |
| Medkit | 10 | Restore all hearts immediately; unavailable at full health |
| Time Refill | 10 | Add 60 stage-timer units immediately |
| Overdrive | 20 | Faster movement for 30s |
| Vampire Rounds | 25 | Every third defeated enemy heals one heart for 30s |
| Cryo Ammo | 20 | Any weapon's shots slow enemies for 30s |
| Regeneration | 25 | Heal one heart every 5s for 30s |
| Infinite Coolant | 20 | No weapon heat for 30s |
| Rescue Drone | 30 | One return to the last safe street position after a fall within 30s |

Timed purchases extend duration. Powers carry between stages/deaths and reset on a new run. The six new powers add to the previous eight, rather than replacing them.

The existing `cargoQuest2.coins` browser-storage key is preserved. Coins remain saved across new runs/reloads on the same origin/device. They do not sync between devices, accounts, or preview URLs; clearing site data removes them. With storage blocked, coins are session-only. No real-money purchases or server-authoritative economy are provided.

## Verification

`npm test` executes the real game logic with stubbed browser/audio interfaces. It checks six firing patterns; fourteen purchases, effects, costs, expiry and persistence; all ten course mechanics; 100 distinct stage configurations; hazard placement; and the earlier 528 generated pit-platform crossings. `npm run build` bundles the renderer and static assets. Browser checks are separate: a passing simulation does not prove real iPhone/Safari multitouch, GPU performance, or a full playthrough of every course.
