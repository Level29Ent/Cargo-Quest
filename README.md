# Cargo Quest 2 — 3D Zombie Streets

A 100-stage side-scrolling platformer with lit, depth-tested Three.js geometry, selectable weapons, themed course mechanics, and a saved-coin store. Movement intentionally stays on a side-scrolling plane; this is a 3D-rendered platformer, not a free-roaming first-person game.

## Develop and deploy

Requires Node 24. Run `npm ci`, `npm test`, and `npm run build`. Serve `public/` with a static HTTP server. The Vercel configuration runs the build and serves `public/`. Three.js is bundled locally; no runtime CDN is required. Artwork and voice clips from the original game remain included.

The HUD is branded **CARGO QUEST** and its backing buffer tracks the actual display size to avoid upscaling the old fixed-resolution text layer. Both canvases declare `image-rendering: crisp-edges` then `pixelated` for browser upscaling. Canvas2D sprite smoothing is disabled after every resize. All 3D textures (road, brick, sky) use nearest-neighbor min/magnification filters with no mipmaps or anisotropic blending; WebGL MSAA is disabled to avoid blended silhouette edges. The orthographic camera renders directly at display resolution without a filtered render-target upscale. This preserves hard pixel edges but can produce visible jaggies or shimmer at fractional scales; it does not turn geometric 3D character models into sprite artwork.

The enhanced renderer uses smooth low-poly sphere/cylinder/cone characters, an animated three-point jester cap, articulated limbs, detailed weapon models, layered skyline silhouettes, balcony railings, street furniture, generated asphalt/brick textures, emissive tracers and contact-shadow grounding cues. A procedural gradient sky and warm/cool lighting are tone-mapped with ACES. No external art downloads, full-screen bloom pass, or real-time shadow maps are required.

The renderer uses shared instanced geometry/materials, view-window culling, and native-density output up to 2× with a three-million-pixel budget shared in policy by the 3D and HUD canvases. It defaults to 3D on WebGL2-capable browsers. The 3D/2D button switches rendering without restarting gameplay. If WebGL initialization or its context fails, gameplay falls back to the original 2D renderer. Real device performance still depends on GPU/browser support. 

## Visual readability

Collectibles are oval king cakes inspired by traditional Mardi Gras pastries: golden-brown rings with open centers, white icing drips, and alternating purple, green and gold sugar. Both 3D and 2D views, the HUD counter and supply-crate reward pops use the cake artwork. Pickup positions, magnet range, scoring, the 50-cake extra life and saved coin balances are unchanged. Storm-course lightning hazards are still hazards.

Background buildings, cars, trees and lamps use a muted blue-grey material pass; scenery does not receive the bright gameplay edge markings. Foreground solids use warm amber bodies with dark frames and cream top lips. Cyan edges identify landing surfaces; red end caps mark pit lips. Steam, lightning and thorn areas have permanent striped footprints and posts, with distinct idle/warning/active colors. The legend is visible above the game. These shape/pattern cues supplement color, and the 2D fallback keeps matching edge/stripe cues. Collider readability and hazard timing are unchanged; longer course layouts are described below. Saved coins remain intact.

## Safe-house Mardi Gras finale and longer courses

Every completed campaign stage now auto-walks the player to the safe-house doorway before a three-second Mardi Gras welcome: purple/green/gold confetti, cheering neighbors, warm porch lights and the existing clear fanfare. Both render modes show a Creole-style weatherboard house, cream trim, shuttered windows, ironwork balcony, bead garlands, bunting and steps. The camera follows the final walk so the celebration stays visible. Boss reward collection opens the arena's right wall into an extended exit street and uses the same celebration. The final stage celebrates before the win screen.

Normal courses grow from 150–259 tiles to 190–321 tiles (about 25% longer, depending on stage), with a protected 32-tile finish approach containing a two-step barricade, low pipe and brick hurdle. Random generation leaves a full segment buffer before that approach, avoiding cut-off pit platforms. Each added obstacle is tested at ordinary walking speed without powers. Timed street hazards and enemy spawns stay out of the added approach and final runway. Normal starting time rises from 300 to 380 game units; boss stages grow from 45 to 55 tiles with a post-fight exit street and a starting timer of 280 instead of 250. Boss fight geometry and signatures are unchanged.

Stage medals, delivery rewards and speed records still commit at the original flag/reward checkpoint; walking to the house and celebrating do not add active run time or duplicate rewards. Daily Dispatch also celebrates before showing its already-recorded result; it never advances into campaign. Survival remains a wave arena with no stage-exit celebration. Confetti is decorative and bounded by the existing 400-particle limit; reduced-motion preference suppresses it while keeping the static welcome. Opening Dispatch or the store freezes the celebration like the rest of the simulation.

## Controls

- Move: A/D or arrows. Jump: Space/W/Up (hold for height; tap for a short platform hop).
- Fire: F/J/Z/K or mouse. Sprint: Shift/X. Mobile: onscreen movement, FIRE, JUMP.
- Weapon: Q (next), E (previous), keys 1–9, the top-left weapon button, or the free loadout in the store.
- Start/resume: Enter or tap. Pause: P. Restart stage: R. Title arrows select any starting stage.
- Campaign: CAMPAIGN button or C. Escape closes it.
- Store: STORE button or B. Escape closes it. Shopping pauses gameplay and effect timers.

## Responsive game feel

Ground contact remains stable under subpixel gravity. Normal ground acceleration reaches the unchanged walking top speed in eight simulation ticks; firmer braking and faster reversals help avoid accidental pit drift. Ice retains its slippery handling. Air acceleration is now 0.30 (0.38 when reversing), up from 0.22, for quicker midair correction without raising top speed or changing jump height. Coyote grace is eight ticks (~133 ms) and the jump buffer is nine ticks (~150 ms) at 60 Hz; hold for height, release for short hops.

Touch buttons use captured Pointer Events with per-button pointer ownership, so releasing FIRE cannot cancel movement or another finger. The onscreen pause/resume button works alongside P. Losing window focus or hiding the page clears held controls and pauses active gameplay; resume explicitly. Pause and shopping freeze simulation/hazard timers. New stages clear stale held inputs.

Damaged zombies show remaining-health bars in both render modes; new enemy silhouettes and warning markers show their roles. Q/E cycle weapons forward/back and 1–9 select directly. Switching preserves cooldown and heat, so it cannot be used to bypass weapon recovery. Overheat shows an approximate cooling countdown. Active powers wrap into columns instead of extending down the entire playfield.

Successful shots display a short hit-confirmation marker in both render modes, damage shows a brief border flash, and solid landings emit dust. 3D weapons now use the existing recoil value. Existing weapon damage is unchanged; the new grenade blast adds a small impact shake. Existing saved coins remain intact; course extensions are described above.

## Cargo contracts, campaign and medals

Open **CAMPAIGN [C]** (or press C) for Cargo Dispatch. It pauses simulation just like the store, supports Escape, traps keyboard focus, and includes a 100-stage world map grouped by regional routes. Every stage remains freely selectable. **Continue** restarts the saved stage with three lives and the existing stage-appropriate boss upgrades; it is a stage checkpoint, not a mid-frame save. Starting another stage updates that checkpoint.

Every stage has an optional gold cargo crate on open street. Collect it and reach the flag, or claim the defeated boss's reward, to deliver it. Cargo does not slow movement or change combat stats. A thief's contact can drop it onto visible open street for recovery after a one-second lockout. Death/restart resets that attempt's cargo and stopwatch. Completing without cargo still advances the campaign.

Each stage has three independent medals: **CLEAR**, **SPEED**, and **CARGO**, earnable across separate attempts (300 total). Speed uses active simulation time: normal-stage targets are `ceil(stageWidth * 32 / 150) + 12` seconds; boss stages allow 100 seconds. Pausing, shopping and dispatch do not count; buying timer refills cannot improve a speed result. A fast delivery earns GOLD, otherwise SILVER. The best delivery grade and fastest clear are retained. The first delivery per stage pays 25 base coins (Double Coins applies); replaying or repeated completion callbacks cannot repeat that bonus.

Stage checkpoint, medals, best times, delivery grades, high score and equipped cosmetics save under `cargoQuest2.campaign.v1`. The existing coin key is untouched. These are local, non-authoritative browser saves: no account, backend, leaderboard or cloud sync. Different origins/devices do not share saves. Missing/corrupt saves fall back safely, and blocked storage leaves session-only progress. No existing coin balance is migrated or reset.

### Tactical enemies and regional boss signatures

Variants progressively join the existing generated enemy roster without modifying platform geometry:

- **Shield zombies** (stage 3 onward): blue frontal shield blocks one hit, then staggers for 45 ticks. Follow up, attack from behind, or stomp.
- **Cargo thieves** (stage 5 onward): faster gold-marked enemies knock carried cargo loose on contact, then flee briefly.
- **Leapers** (stage 9 onward): orange leg markings and a half-second jump warning before takeoff.
- **Plated zombies** (stage 13 onward): silver body armor halves ordinary bullet damage. Piercing rounds and stomps bypass plating.
- **Medic zombies** (stage 17 onward): white cross packs; every three seconds, heal nearby other zombies by one up to their normal maximum, never through terrain or themselves. They do not heal bosses.
- **Rooftop throwers** (stage 7 onward): occupy existing raised block perches and periodically lob ballistic projectiles. Freezing pauses their attacks.

Every regional boss retains its original attacks and gains a signature after a full one-second warning: New Orleans summons a bounded reinforcement group; Los Angeles locks a dash direction; Houston releases ground waves; Camp Lejeune lobs a projectile fan; Parris Island strikes three marked street positions. Jumping avoids ground strikes. Below 40% health, signature cadence increases from six to four seconds and attack counts/durations intensify. Boss warning timers freeze with pause, shopping, dispatch and Freeze Wave. Both renderers show warning markers and tactical enemy cues.

### Medal-earned cosmetics

All rewards are cosmetic only and cost no coins. Equip independently in Dispatch:

| Slot | Rewards and required total medals |
| --- | --- |
| Outfit | Classic Jester (0), Coastal Courier (3), Sunset Jester (15), Royal Dispatch (45) |
| Weapon finish | Steel (0), Mint (6), Gold (24) |
| Companion | None (0), Scout (12), Bumble (36) |

Outfits and weapon colors appear in both render modes. Companions are animated HUD-layer drones in either mode, separate from the paid, functional Rescue Drone power. No reward changes damage, movement, heat, health or difficulty.

## Daily Dispatch, Survival Arena and field guide

Open **CAMPAIGN [C]** → **Extra Modes**. The expandable **Field Guide** explains all nine enemy types, five boss signatures and both mode rule sets, without unlock gates. It is readable while gameplay is frozen by Dispatch.

### Daily Dispatch

The device's current UTC date selects one existing non-boss route and one of the nine weapons. The date is captured at the start of an attempt; midnight does not relabel it, and Retry repeats that original day's contract. You start with three hearts and one life, no boss upgrades, no store, no free power caches and a locked weapon. Deliver the stage's cargo. You can clear without it, but that is not a successful delivery record. There are unlimited retries, and the result screen reports delivery/failure and active play time. R restarts the contract; Enter or tap retries the result. Dispatch always offers today's new contract.

Successful delivery times retain the fastest result for each day. Cargo success and highest cleared-run score are also retained; a slower or missed-cargo clear never erases a better delivery. Only the newest 30 daily record dates are stored. This rotates existing routes rather than generating a new campaign or providing a server-controlled competition. The client clock and browser saves are not cheat-proof; there are no online rankings or currency rewards.

### Survival Arena

A separate closed, pit-free arena allows movement in both directions, with no scrolling, exit, stage timer, cargo or coin pickups. All nine weapons are free to switch. You get three hearts, one life, no boss upgrades and no store. A two-second opening warning precedes the first wave. Waves start with five enemies, increasing by two per wave to a maximum of 18. Runners join at wave 2 and brutes at wave 4; their movement multiplier rises by 3.5% per wave to a maximum of 1.8×. Enemies spawn on the side away from you.

Clearing a wave heals one heart and begins a two-second break. Hostile projectiles are removed and brief invulnerability protects the break. Every third completed wave grants ten seconds of Infinite Coolant. Cleared-wave and score records save locally at each wave clear and on defeat; this is not a resumable arena run. R restarts from wave 1. Results can be retried with Enter or tap. Pause, store restrictions and Dispatch freeze simulation as appropriate.

Both modes are isolated from campaign checkpoints, campaign high scores, medals and the coin economy. No kill, king cake or completion in either mode changes the coin balance or grants extra lives. Returning to any campaign stage restores normal store and weapon behavior. Extra-mode records use the separate `cargoQuest2.modes.v1` key with validated loading and session-only fallback if storage is unavailable.

## Nine free weapons

All weapons are immediately available; there is no paid weapon gate or ammunition grind. Heat and cooldowns provide different trade-offs. Existing boss-reward weapon upgrades apply to the equipped weapon.

| Weapon | Behavior |
| --- | --- |
| M240 | Balanced automatic fire |
| Shotgun | Five pellets, short range, slower shots |
| Railgun | High-damage, fast piercing rounds, long cooldown |
| Plasma | Slower, hard-hitting projectiles |
| Flamer | Rapid three-projectile, close-range cone |
| Cryo Blaster | Slows hit enemies and bosses |
| Nail Repeater | Rapid precision nails, low damage per hit |
| Bayou Crossbow | Narrow three-bolt fan; pierces enemies and ignores plating |
| Grenade Launcher | Arcing explosive shell; impact or fuse detonation, 78px blast blocked by terrain |

## 100 distinct stages, ten course families

Each stage has a deterministic layout, course-specific scenery/palette, element placement/timing, enemies, and a free power cache near the start. Families rotate across regions/rounds, including boss stages; bosses have varying platform arrangements. This is 100 stage configurations using ten mechanic families, not 100 entirely separate hand-authored environments.

| Course | Distinct element |
| --- | --- |
| Neon Market | Hit teal + boxes from below for powers; gold ? boxes award king cakes |
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

## Coins and eighteen power-ups

King cakes award 1 coin and defeated zombies award 3, separate from score and the 50-cake extra-life counter. Free stage caches cycle through the power-up catalog. Teal **+ power boxes** now appear throughout each campaign route: one is placed on safe, open street in each eligible 28-tile stretch before the protected finish, and half the existing mystery boxes also become power boxes. Hit them from below to instantly receive one of the eighteen powers with a reward pop and its name. Each box works once per attempt; its reward is deterministic and costs no coins. Medkit boxes, remaining king-cake boxes and boss upgrades stay unchanged. Daily Dispatch replaces power boxes with ordinary king-cake boxes to retain its no-free-powers rule; Survival has no boxes.

| Power | Coins | Effect |
| --- | ---: | --- |
| Shield | 20 | Ignore enemy/element damage for 30s, not falls/timeout |
| Coin Magnet | 15 | Collect king cakes within five tiles for 30s |
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
| Air Step | 20 | One midair jump per landing for 30s; does not stack with boss double jump |
| Lasting Ward | 12 | Absorb one damaging hit within 30s; falls/timeout still kill |
| Gunslinger Focus | 20 | Half shot heat and tighter pellet spread for 30s |
| Frost Pulse | 25 | Every 2s, slow visible enemies within 145px for 30s |

Timed purchases extend duration. Powers carry between stages/deaths and reset on a new run. All eighteen powers remain available; the new powers supplement rather than replace the earlier catalog. Lasting Ward purchases extend its time window, not the number of hits it blocks.

The existing `cargoQuest2.coins` browser-storage key is preserved. Coins remain saved across new runs/reloads on the same origin/device. They do not sync between devices, accounts, or preview URLs; clearing site data removes them. With storage blocked, coins are session-only. No real-money purchases or server-authoritative economy are provided.

## Verification

`npm test` checks renderer instance transforms across all 100 stages (with a stubbed GPU), all four geometry types, procedural material/sky creation, batch counts, the rendering toggle, and WebGL failure/context-loss fallback. It also executes the real game logic with stubbed browser/audio interfaces. It checks nine firing patterns; eighteen purchases, effects, costs, expiry and persistence; all ten course mechanics; 100 distinct stage configurations; hazard placement; and the earlier 528 generated pit-platform crossings. `npm run build` bundles the renderer and static assets. Browser checks are separate: a passing simulation does not prove real iPhone/Safari multitouch, GPU performance, or a full playthrough of every course.

Campaign regression tests additionally cover independent medals and best results, reward idempotency, save validation/reload/storage failure, cargo pickup/theft/recovery, all cosmetic thresholds, dispatch pause, tactical enemy behavior, and all five boss signatures with warning and enrage behavior. Full device playthroughs and real GPU performance remain separate manual checks.

Extra-mode tests cover UTC-date route/loadout selection, daily retry/death/flag/result flows, isolation of campaign and coin saves, pause behavior, 40 wave progressions, spawn caps, healing/coolant, arena rendering, record reloading/retention and malformed/blocked storage.

### Correctness regression coverage

Fatal hazards, enemies and projectiles now stop the active update before healing caches, boss rewards or exit medals can overwrite death. Cargo is collected after movement, including on the final step into a flag. Survival clears and their records are committed on the killing-shot tick rather than the next tick. Stage starts reset hazard phases so the same restart does not inherit a previous attempt's timing.

Player bullets check the path from the player to the muzzle on their first tick, substep travel to prevent tunneling, and test frontmost enemies before farther ones. Point-blank targets, walls, leftward shots, piercing boss damage and final-lifetime hits have regression tests; weapon damage and fire rates are unchanged. Native button Enter/Space activation no longer also triggers game start/resume/jump, held Enter does not repeatedly retry, pointer-operated HUD buttons restore canvas focus, and the field-guide summary participates in the Dispatch focus loop.

The audit suite exercises these edge cases, plus full 2D draw/HUD calls across all 100 stages and both extra modes using a stubbed canvas. These checks do not establish real-browser appearance, hardware performance or that no undiscovered issues remain.

Expansion regressions cover grenade impact/fuse/idempotency and terrain occlusion, plating and piercing, ward consumption, Air Step limits, Focus heat/spread, Frost Pulse occlusion/pause, leaper warning/freeze, medic healing caps/self-exclusion/occlusion, later-wave rosters and all new 3D geometry paths. Real-browser appearance and device performance still need a deployable preview.

Safe-house regressions additionally simulate all 100 campaign finishes (including boss wall opening and final victory), celebration-once timing, frozen speed time/rewards, particle bounds, reduced motion, overlay pause, Daily result return, all 240 new normal-course obstacle crossings, and safe-house/confetti geometry across every region. These are simulated checks, not real GPU or device verification.
