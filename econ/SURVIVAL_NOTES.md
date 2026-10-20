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
