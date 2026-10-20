# Primordial economic simulation, round 3 (final: clear winners and losers)

**Goals:**
- average return about 1.1x to 1.2x, funded by outside money
- typical player below 1x
- 30% to 40% of players profitable
- big wins at the top
- skill clearly matters, and Recommended start narrows the gap without closing it
- the pool is never drained

**Final parameters:**

| Setting | Value |
|---|---|
| Pool inflows | 70% of creator fees, 40% of interventions |
| Burned | 60% of interventions, 100% of the release price |
| Payout rate | 50% of the pool per day, paid hourly |
| Yield / bonus split | 85% hourly yield, 15% daily top-3 bonus (50/30/20, minimum age 2 h) |
| Yield weight | (creature-seconds this hour) to the power 0.6 |
| Release price | updated daily, target 1.2x, floor $1, cap $25 |
| Free release | 1 per wallet per day, 1/4 weight, at most 10% of yield; wallet must be 7+ days old or hold $5 of SOUP |
| Wallet caps | at most 10% of daily yield; at most 10 paid releases per day |
| Protection | 10-minute newborn shield; cooldowns: meteor 5 min, cold and toxic 3 min |

**Lifespans measured in sim.js** (296 lineages per player type):

| Player type | Median life | Creature-seconds p50 | Creature-seconds mean |
|---|---|---|---|
| Casual | 40 s | 940 | 996 |
| Recommended start | 110 s | 1,650 | 3,643 |
| Skilled | 90 s | 1,390 | 34,226 (heavy tail) |

**Player mix:** 20% casual, 40% Recommended start, 30% skilled, 10% whale.

**Medium scenario** ($100k/day volume, 0.3% fee, 200 interventions, 50 paid releases):

| | value |
|---|---|
| average return | 1.20x |
| typical (median) | 0.71x |
| p10 | 0.34x |
| p90 | 1.57x |
| top 5% | 4.25x |
| releases profitable | 28% |
| players profitable | 33% |
| casual / Recommended start / skilled | 0.59x / 1.25x / 1.67x |
| price | $4.39 |
| pool inflow | $370/day |
| SOUP burned | $519/day |

**About the top 10%:** you asked for p90 at 3x or more. With the measured lifespans, that cannot coexist with a median of 0.6x to 0.8x. Big wins are concentrated in the top 5% (4.25x) and top 1% (13x or more). A linear weight would give p90 of about 2.8x, but the median would fall to 0.25x.

**Same shape in every scenario where paid releases per day ≤ pool inflow / $1.2.** Capacity ranges from 125/day (small) to 1,387/day (large).
- **Above capacity**, the $1 floor binds. Example: $20k volume, 300 releases/day gives an average of 0.51x.
- **Few releases**, the $25 cap binds and returns rise to 3x to 7x.
- **Pool:** never drained or insolvent in any of the 54 scenarios. The balance settles at about one day of inflow.

**Exploits:**
- 1000 sybil wallets take $32/day, and honest ROI stays at 1.20x. Without caps they take $268/day and honest ROI drops to 0.98x.
- A whale releasing 10 to 50 times as much gets 0.49x to 0.41x back.
- Griefing is handled by the shield and cooldowns.
- Sniping is blocked by the 2-hour minimum age and season-long ranking.

---
Earlier rounds below are superseded.

# Round 2 (superseded)

**Changes since round 1:** creator fee share to the pool raised to 70%; yield weight changed to the fourth root of creature-seconds (was square root); yield/bonus split 90/10; price cap $25; added a "Recommended start" player type, measured in the real sim.js.

**Recommended start, measured in sim.js:** 296 lineages over 8 worlds of 150k ticks each. Each one was released at the thermal vent with the most food, and only the first suggested trait (Efficient digestion) was bought.
- Recommended start: median life 110 s (p90 310 s), creature-seconds p50 1,650, mean 3,643.
- Casual (random spot): median 40 s, creature-seconds p50 940.
- Skilled (all traits): median 90 s, creature-seconds p50 1,390, mean 34,226.
- Recommended start beats casual on every percentile.

**Player mix:** 20% casual, 40% Recommended start, 30% skilled, 10% whale. Free releases follow the Recommended start distribution.

**Medium scenario** ($100k/day volume, 0.3% fee, 200 interventions, 50 paid releases):

| | value |
|---|---|
| average return | 1.31x |
| typical (median) | 1.05x |
| unlucky 1 in 10 (p10) | 0.89x |
| lucky 1 in 10 (p90) | 1.34x |
| releases in profit | 65% |
| casual / Recommended start / skilled | 0.97x / 1.33x / 1.58x |
| release price | $5.18 |
| pool inflow | $370/day |
| SOUP burned | $499/day |

**Other scenarios:**
- Typical player return stays at 1.05x to 1.21x, and the average at 1.30x to 1.37x, whenever paid releases per day are at most about pool inflow / $1.2.
- **Where the model fails:** when releases far exceed that level, the $1 floor binds. In a small game ($20k volume, 50 interventions) with 50 releases a day, the average falls to 0.85x; with 300 releases it falls to 0.14x. This shows on the site as "yesterday avg return" below 1x, which should discourage further releases, but the model holds demand fixed.
- **Where the cap binds:** when the pool is large and releases are few, the $25 cap binds and returns go to 3x to 7x. That signal should attract more releases.
- **Pool:** never drained or insolvent in any of the 54 scenarios. It pays 50% of its balance per day, and the balance settles at about one day of inflow.

**Exploits, fourth-root weighting with caps:**
- 1000 sybil free wallets take $31/day, and honest ROI stays at 1.31x. Without caps they would take $297/day and honest ROI would drop to 0.77x.
- A whale releasing 50 times as much gets 0.52x back, so spamming loses money.
- Griefing is handled by a 10-minute newborn shield (implemented in sim.js) plus disaster cooldowns (meteor 5 min, cold and toxic 3 min).
- Bonus sniping is blocked by ranking on season-long creature-seconds with a 2-hour minimum age.

**Final parameters:**

| Setting | Value |
|---|---|
| Pool inflows | 70% of creator fees, 40% of interventions |
| Burned | 60% of interventions, 100% of release price |
| Payout rate | 50% of the pool per day, paid hourly |
| Yield / bonus split | 90% yield, 10% bonus (top 3, split 50/30/20, minimum age 2 h) |
| Yield weight | fourth root of creature-seconds per hour |
| Release price | updated daily, target 1.3x, floor $1, cap $25 |
| Free release | 1 per wallet per day, 1/4 weight, at most 10% of yield; wallet must be 7+ days old or hold $5 of SOUP |
| Wallet caps | at most 10% of daily yield (or 1/number of wallets if larger); at most 10 paid releases per day |
| Protection | 10-minute shield for new releases, disaster cooldowns |

Round 1 analysis follows.

# Round 1

Simulation only. Nothing deployed and the live site is unchanged. Files: `measure.js` (real sim.js runs), `lineages.json`, `econ.py` (model), `run.py` (scenarios, exploits, charts), `scenarios.json`, `exploits.json`, `roi_vs_releases.png`, `pool_balance_30d.png`, `SIMPLE.md`, `simple_infographic.png`.

## 1. Lifespans measured in the real sim.js
I ran 8 worlds for 150k ticks each (about 83 minutes of game time at 30 Hz), half with random disasters. Each world got 37 releases, alternating two player types. **Casual** players release at a random spot and buy no traits. **Skilled** players release at a thermal vent and buy every trait as soon as it unlocks. That gives 296 lineages in total.

| | median life | p90 life | creature-seconds p50 / p90 / mean | traits at p90 |
|---|---|---|---|---|
| Casual (152) | 40 s | 80 s | 940 / 1,300 / 996 | 0 |
| Skilled (144) | 90 s | 270 s | 1,390 / 4,030 / 34,226 (7% of runs grow huge) | 4 |

Weather made little difference to the average. Most lineages die within minutes, so "survival" in practice means rewards based on how long your creatures stay alive. An end-of-hour snapshot would effectively be a lottery.

## 2. Model
- Pool inflow per day = 50% × volume × creator fee rate + 40% × interventions × $2 (the $1 to $3 range averaged). The other 60% of interventions goes to buyback and burn.
- Each day the pool pays out 50% of its balance, spread hourly: 80% as survival yield, 20% as the top-3 bonus (50/30/20), ranked by creature-seconds over the whole season.
- Release price is set daily: P = yesterday's paid-release payout per release / 1.3, kept between $1 and $50. The whole amount is burned as SOUP.
- Recommended yield weight: **square root of creature-seconds**. With a linear weight, the median release got back only 0.24x. Square root gives 0.83x, log gives 0.96x. Square root keeps skill rewarding but less like a lottery.
- Free entry: one per wallet per day (modelled as 0.5 × paid releases), at 0.25 weight, with all free releases together capped at 10% of yield.
- Each wallet can earn at most 10% of daily yield. Release mix: 60% casual, 30% skilled, 10% whale.

## 3. Results (days 4 to 30, interventions $2 avg; full grid of 54 runs in scenarios.json)
Fee rates are assumptions: 0.05% (low) and 0.3% (pump.fun-style high). They are not confirmed pump.fun numbers.

| Vol/day | fee | interv/day | rel/day | avg ROI | p10 / p50 / p90 | % releases profitable | casual / skilled | price | pool in/day | max releases at ≥1.2x and $1 floor | SOUP burned/day |
|---|---|---|---|---|---|---|---|---|---|---|---|
| $20k | 0.05% | 50 | 10 | 1.30 | 0.71 / 1.01 / 2.48 | 52% | 1.07 / 1.76 | $3.2 | $45 | 33 | $92 |
| $20k | 0.05% | 50 | 50 | 0.82 | 0.33 / 0.52 / 0.80 | 6% | 0.53 / 1.47 | $1 floor | $45 | 33 | $110 |
| $20k | 0.05% | 200 | 300 | 0.51 | 0.23 / 0.29 / 0.40 | 2% | 0.28 / 1.06 | $1 floor | $165 | 123 | $540 |
| $100k | 0.3% | 200 | 10 | 1.30 | 0.71 / 1.01 / 2.48 | 52% | 1.07 / 1.76 | $22 | $310 | 232 | $461 |
| $100k | 0.3% | 200 | 50 | 1.30 | 0.51 / 0.83 / 1.37 | 30% | 0.84 / 2.33 | $4.5 | $310 | 232 | $458 |
| $100k | 0.3% | 200 | 300 | 0.96 | 0.42 / 0.54 / 0.74 | 4% | 0.53 / 1.99 | $1 floor | $310 | 232 | $540 |
| $100k | 0.3% | 1000 | 300 | 1.31 | 0.58 / 0.74 / 1.01 | 10% | 0.71 / 2.70 | $2.3 | $950 | 712 | $1,884 |
| $500k | 0.3% | 200 | 50 | 1.30 | 0.51 / 0.83 / 1.37 | 30% | 0.84 / 2.33 | $13 | $910 | 682 | $881 |
| $500k | 0.3% | 1000 | 10 | 2.86 | 1.66 / 2.28 / 5.66 | 95% | 2.37 / 3.80 | $50 cap | $1,550 | 1,162 | $1,700 |

Findings:
1. The auto-price holds the average at **1.30x** whenever paid releases per day stay below about **pool inflow / $1.2**. Above that, the $1 floor binds and ROI falls below 1. In the other direction, the $50 cap binds when releases are few and the pool is big, and ROI rises above 1.5.
2. **The average is 1.3x, but the typical player is below 1x.** Skilled players take most of the surplus, and casual players get back 0.84x. About 30% of releases are profitable. Players can only come out ahead overall because outside money (fees and interventions) flows in.
3. **The pool cannot become insolvent.** Payouts are always a fraction of the balance. The balance settles at about 1× daily inflow (chart) and never drains in any scenario. The trade-off is that payouts shrink if inflows stop.
4. SOUP burned per day ranges from about $90 to $2,300, made up of release burns plus 60% of interventions.

## 4. Exploits (base case: $100k, 0.3%, 200 interventions, 50 releases)
| Attack | Without caps | With recommended caps |
|---|---|---|
| Sybil free releases (1000 wallets) | Takes $239/day, honest ROI 1.30 to 0.96 | Takes $25/day, honest ROI stays 1.30 |
| Whale spams 50× releases | Whale ROI 0.67 | Whale ROI 0.47. Spamming loses money because the 10% wallet cap and the square-root weight remove the advantage |
| Griefing rivals with disasters | Meteor radius 110 kills nearly all unarmored creatures | Not modelled numerically. Proposed: 10-minute shield for new releases, a global cooldown per disaster type (meteor 5 min), no targeting within 150 px of a lineage under 10 min old. Since 40% of a griefing payment goes to the pool, griefing partly funds victims. |
| Season-end bonus sniping | A snapshot ranking could be sniped | Rank by season-long creature-seconds plus a minimum age of 2 h. A late release cannot accumulate enough. |

Other caps: at most 10 paid releases per wallet per day, and free releases only for wallets at least 7 days old or holding at least $5 of SOUP.

## 5. Recommended parameters
- creator_to_pool 50%, interventions_to_pool 40% (60% burn)
- daily payout 50% of pool balance, paid hourly
- yield 90% / top-3 bonus 10% (cut from 20% because it is the most lottery-like part and the hardest to explain)
- yield weight = sqrt(creature-seconds of your lineage during the hour)
- price recomputed once a day, target 1.3x, floor $1, cap $25
- free release 1/day/wallet, 0.25 weight, total ≤10% of yield, wallet must be 7 days old or hold SOUP
- wallet cap 10% of daily yield; 10 paid releases per wallet per day
- 10-minute newborn shield, disaster cooldowns, bonus minimum age 2 h
- Add a "Recommended start" (auto vent placement and first trait suggestion) to narrow the casual vs skilled gap

## 6. Limits
- Lifespans come from 83-minute windows. 10 skilled lineages were still alive at the end, so their totals are undercounts.
- The releases in the measurement runs were denser than in the scenarios.
- Release demand is held fixed in each scenario rather than responding to price; the equilibrium figure is computed analytically.
- Intervention prices are averaged at $2.
- Legal: a paid prize pool still carries US gambling-classification risk. The free route reduces the risk but does not remove it, so this needs legal review.

## 7. Check with recommended parameters (90/10 split, price cap $25)
| Scenario | avg | p10 / p50 / p90 | % releases profitable | casual / skilled |
|---|---|---|---|---|
| $100k, 0.3%, 200 interventions, 50 releases | 1.30 | 0.59 / 0.95 / 1.61 | 44% | 0.95 / 2.10 |
| $20k, 0.05%, 50 interventions, 10 releases | 1.30 | 0.78 / 1.15 / 2.13 | 71% | 1.15 / 1.61 |
| $500k, 0.3%, 1000 interventions, 10 releases | 5.65 (cap binds) | 3.72 / 5.16 / 9.0 | 99% | 5.07 / 6.85 |

Cutting the bonus to 10% raises the typical player from 0.83x to 0.95x. When releases are few and the price is capped, returns well above 1.5x are a temporary signal that should attract more releases. SIMPLE.md uses this recommended configuration.
