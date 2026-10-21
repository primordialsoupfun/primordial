# Survival study notes (v4 rule)
Problem: released lineages die in ~20 min; payouts hourly. Target median 1-3 h with variance.
Harness: econ/measure_survival.js on live snapshot tick 422400 (2026-10-21 06:35 Asia/Taipei). 40 releases at random points over first 66 min of sim, 300k ticks (2.8 h) total, random disasters ~1/6000 ticks.
Options (sim.js, gated by cfg.v4From): sib = 100 siblings instead of 40; shield = half metabolic drain for first 30 min; bloom = 260-pellet bloom at release point plus small vent there for 30 min.
## Round 1 (running)
- First attempt timed out (10 parallel runs, box load avg ~60-80). Partial at ~36k ticks (20 min sim), life in MINUTES: base median 3.2 min (p90 7.5), sib 7.2, shield 7.5, bloom 8.5. Bloom/shield world pop rose to ~900-980 (cap 1100) - watch for crowding.
- Switched to resumable chunked runs (econ/measure_survival.js + state file, 20k ticks per process, <=590 s each). 4 modes, seed 1, 330k ticks (~3 h sim).
## Round 1 partial (seed 1, life in minutes)
base med 4.2 p90 47 | sib med 11.8 p90 28.5 | shield(30m half drain) med 31 p90 34 - lineages die right when the shield ends (cliff) | bloom med 4.3 p90 74.
Conclusion: fixed-length shield only moves the cliff. Trying 'fade': drain multiplier ramps 0.5 -> 1.0 linearly over 2 h, so deaths spread out by brain quality.
## Round 2 (seed 1, 200k ticks)
fade 2h: med 33 p10 21 p90 50 min; sib+fade: med 33 (siblings add nothing). Lineages die once drain multiplier passes ~0.62-0.65.
Round 1 final: base med 4.2 p90 47 | sib 11.8/28.5 | shield 31/34 | bloom 4.3/74.
## Round 3 (running): fade over 6 h (seeds 1,2), fade 5 h, base seed 2; 500k ticks (4.6 h sim).
## Round 3 result (200k ticks): fade 6h med 28-32 min, fade 5h med 38. Not drain-limited: with a release every 100 s, new lineages crowd each other (world pop 830-900). Dense cadence is unrealistic.
## Round 4: release every 20k ticks (11 min, as in econ round 4) and 'clone' (siblings mutate 0.02 not 0.1). Modes: base, clone, fade6, clone+fade6.
Round 4 mid (160-240k): base med 5 min, clone med 2 min (no help, dropped). fade6 and clone+fade6: 4/4 lineages alive at 89 min; world pop ~925 (cap 1100) - watch.
## Round 4 result (release every 11 min, life in min)
base med 5 p90 7 | clone med 2 | fade 3h med 68 p10 58 p90 83 (tight) | fade 6h seed1 med 89 p10 35 p90 206; seed2 med 72 p10 8 p90 102.
## Decision: fade 6h. A released lineage starts at half metabolic cost, rising linearly to normal over 6 h. Single knob, median 1.2-1.5 h with real losers (p10 8-35 min) and winners (3 h+). Siblings, bloom, clone, fixed shield dropped (no gain or cliff). Caveat: world pop rises to ~930 of 1100 cap.
## Shipped rule checks
- econ/replay_v4.js: checkpoint restore mid-run across v4 switch, 10/10 hashes match.
- econ_v4.py medium game (100k vol, 200 interventions/day): before avg 1.17x med 0.63x p90 3.02x profitable 31%; v4 avg 1.21x med 0.99x p90 2.00x profitable 50%. Sample 14 lineages (small).
- Deployed 48cd3ae to Render; live v4From=549300. Live e2e-sync (two clients + server) at ticks 551000/551500: all hashes match.
## Round 5 (large sample, started 07:55 Asia/Taipei): v4 as shipped, 8 seeds (11-18), release every 11 min for 3.7 h, 620k ticks each (5.7 h), ~20 lineages/seed. Also tracks max world pop and ticks at the 1100 cap.
## Runaway check (econ/runaway_v4.js, one release into the live dish, lineage size every 30 s for 5 min)
- Old rule: 40 -> 10-40. Shipped v4: 40 -> ~940 of ~960 creatures in 5 min, in both a normal and a thinned dish. One early release takes over the whole dish. Live risk.
- Size cap (discount only while lineage < cap): cap 60 -> 92, cap 120 -> 124-150, start 0.65 + cap 100 -> ~115. start 0.75 no cap -> 489 and still rising.
- sim.js test hook globalThis.__V4T {start,fade,cap} (undefined in production = shipped behaviour; replay check still 10/10).
## Round 5 mid (160-200k ticks): shipped v4, maxPop 990-1069, never hit 1100. Medians so far 17-51 min (many still alive).
## Round 6 (running): candidate start 0.5, fade 6 h, cap 100; 6 seeds (21-26), release every 15k ticks to 400k.
- econ_v4b.py: auto release price makes avg return equal target_roi; raising target raises profitable share, so retune grid uses target 0.9-1.2 and yield exponent 0.6/0.8/1.0. Partial shipped-v4 (47 lineages): 0.6/1.2 -> 45% profitable, med 0.76x.
- 08:39 Asia/Taipei: box load 50-65 from other work; big at 340-400k, cap100 at 260-300k of 620k. Mid medians: shipped v4 50-65 min, cap100 21-63 min (most still alive, censored).
- 08:45: paused cap100 runs (state files kept) to cut load; big (8 seeds) continue. Chunks now <=470 s via loop2.sh.
- 08:58: big seeds 11-18 done (101 lineages; random-point rejection skips ~1/3 of releases). Medians per seed 66-87 min, p90 92-172 min. Added big seeds 19,20,30,31; resumed cap100.
- 09:11: cap100 at 480-560k, big 19-31 at 200-240k.
- 09:25: cap100 seeds 21-26 done: 101 lineages, per-seed median 132-157 min, p90 174-265 min, maxPop 831-991, never at 1100 cap. Shipped-v4 maxPop up to 1087 (never 1100). Added cap100 seeds 27-30.
- 09:35: rebased onto c216ddf (WIP re-applied from patch, no stash). big 19-31 at 460-520k, cap100 27-30 at 220-240k.
- 09:48: big 12 seeds done.
## Round 5 result, shipped v4 (150 lineages, 12 seeds): life median 71 min, p10 4.9 min, p90 139 min. maxPop up to 1087, never at 1100.
Economy (medium game): current params (exp 0.6, target 1.2) -> 49% profitable, median 0.99x, p90 2.17x. Grid: exp 0.6/target 0.9 -> 33%; exp 0.8/target 1.0 -> 35% (med 0.71x, p90 2.0x); exp 1.0/target 1.0 -> 32%; exp 1.0/target 1.2 -> 39%. Saved econ_v4b_shipped.json.
## v5 implementation (10:05 Asia/Taipei): sim cap 100 under cfg.v5From, economy exponent 1.0 and target 1.0 from same tick. Replay 10/10. Runaway (V5): single release holds ~100-112 for 5 min (was ~940). Final-code check running: 6 seeds (41-46), snap at tick 422400.
## v5 final-code check (6 seeds, 58 lineages, 400k ticks, releases to 240k): life median 142 min, p10 99, p90 185; maxPop 808-881. Economy exp 1.0/target 1.0: 27% profitable, median 0.84x, p90 1.13x. Shorter runs censor long lineages (most still alive at end), so spread is understated; round 6 (same rule, 169 lineages, 620k ticks) gave 37%.
- Combined v5 sample (227 lineages): median life 140 min, p10 5.5, p90 197; exp 1.0/target 1.0 -> 32% profitable, median 0.88x, p90 1.26x.
- 10:25: an earlier claim-flow deploy (c0703db) shipped my server.js v5From line before the sim code, recording inert v5From=758700 (already past). Switched rule key to cfg.v5bFrom so history stays valid. Replay on live snap tick 769800: 10/10. Runaway with v5 on that snap: release does not take over (died out in this dish).
