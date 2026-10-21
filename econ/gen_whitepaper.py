# Builds ../whitepaper.html from simulation outputs only (round4.json, zones.json, lineage stats, econ.run headline).
import json,html,numpy as np,econ,os
r4=json.load(open('round4.json'));z=json.load(open('zones.json'))
LONG=os.path.exists('lineages_long.json')
if LONG:
    L=json.load(open('lineages_long.json'));W=econ.WEIGHT
    econ.CAS=[W(x) for x in L['casual']];econ.STR=[W(x) for x in L['starter']];econ.SKL=[W(x) for x in L['skilled']]
    life=L['life_stats']
h,pr,pl,b=econ.run(100e3,0.003,200,2.0,50);s=econ.summarize(pr,pl)
r=np.array([x[3]/x[2] for x in pr if x[1] and x[4]>=3]);p99=float(np.percentile(r,99))
f=lambda v,d=2:f'{v:.{d}f}'
usd=lambda m:'$'+f(5*m)
cs=r4['cold_start'];beh=r4['behaviour'];fee=r4['fee_sensitivity']
def tr(*c):return '<tr>'+''.join(f'<td>{x}</td>' for x in c)+'</tr>'
fee_rows=''.join(tr(f(x['fee']*100,2)+'%','$'+format(int(x['vol']),','),'$'+format(int(x['inflow']),','),x['capacity'],f(x['avg_roi'])+'x',f(x['p50'])+'x','$'+f(x['price_end'])) for x in fee)
beh_rows=''.join(tr('$'+format(int(x['vol']),','),x['n_int'],x['start'],int(round(x['eq_releases'])),f(x['eq_return'])+'x','$'+f(x['eq_price'])) for x in beh)
cs_rows=''.join(tr(x['name'],f(x['day0_avg'])+'x',f(x['week1_avg'])+'x',f(x['week1_median'])+'x') for x in cs)
life_rows=''.join(tr(k,f"{v['n']}",f"{v['median_s']} s",f"{v['p90_s']} s",f"{v['still_alive']}") for k,v in life.items()) if LONG else ''
P=econ.PARAMS
page=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Whitepaper | Primordial</title><link rel="canonical" href="https://primordialsoup.fun/whitepaper">
<meta name="description" content="How Primordial works: the shared tank, the survival payouts, the money flow, the anti-exploit rules, the simulation results and the risks.">
<link rel="icon" href="/icons/favicon.ico" sizes="any"><link rel="stylesheet" href="/style.css">
<style>
.page{{max-width:980px;margin:0 auto;padding:34px 48px 60px}}
.page h1{{font-weight:400;font-style:italic;font-size:44px;margin:0 0 6px}}
.page h2{{font-weight:400;font-size:13px;font-family:var(--mono);letter-spacing:.16em;text-transform:uppercase;border-bottom:1px solid var(--ink);padding-bottom:6px;margin:38px 0 14px}}
.page h3{{font-weight:400;font-style:italic;font-size:21px;margin:22px 0 6px}}
.page p,.page li{{font-size:17px;color:var(--ink2);max-width:760px}}
.page table{{border-collapse:collapse;font-family:var(--mono);font-size:13px;margin:10px 0 6px}}
.page td,.page th{{border-bottom:1px solid var(--rule,#cbbfa6);padding:5px 12px 5px 0;text-align:left;vertical-align:top}}
.page th{{font-weight:400;letter-spacing:.08em;text-transform:uppercase;font-size:11px}}
.formula{{font-family:var(--mono);font-size:14px;background:var(--paper2);padding:12px 14px;border-left:2px solid var(--ink);max-width:760px;white-space:pre-wrap}}
.note{{border-left:2px solid var(--rust);padding:8px 12px;background:var(--paper2)}}
.lede{{font-size:20px!important;color:var(--ink)!important}}
svg text{{font-family:"Iowan Old Style",Palatino,Georgia,serif}}
.toc a{{margin-right:14px}}
</style></head>
<body>
<header class="masthead"><div class="mark"><img class="seal" src="/icons/icon-512.png" alt="" width="56" height="56"><div><span class="title">Primordial</span><span class="sub">Whitepaper, version 0.4, October 2026</span></div></div><span><a href="/how">How it works</a>&nbsp;&nbsp;&nbsp;<a href="/">Back to the dish</a></span></header>
<main class="page">
<h1>Primordial whitepaper</h1>
<p class="toc mono"><a href="#summary">Summary</a><a href="#mechanics">Mechanics</a><a href="#money">Money flow</a><a href="#payout">Payout formula</a><a href="#rules">Fair limits</a><a href="#verify">Verifiability</a><a href="#sim">Simulation</a><a href="#token">Token</a><a href="#risks">Risks</a></p>

<h2 id="summary">In plain English</h2>
<p class="lede">Primordial is one shared dish of tiny creatures with real neural-network brains. Everyone who opens the site sees the same dish. You can release a creature with your name on it, and every hour it stays alive, its lineage earns a share of a prize pool paid in SOL.</p>
<p>The prize pool is filled by money from outside the game: part of the trading fees of the SOUP token and part of what people pay for disasters and food drops. The money you pay to release a creature is burned, not paid to other players.</p>
<p>This is a game with clear winners and losers. In our simulation of a medium-sized game, the average paid release got back {f(s['avg_roi'])} times what it cost, but the typical player got back less than they paid: about {usd(s['p50'])} for every $5. About {int(round(s['players_profit']))} in 100 players came out ahead, and the top 1 in 20 got back {f(s['p95'],1)} times or more. Players who release next to a warm vent and unlock traits do much better than players who release at random. Many players lose money.</p>

<h2 id="mechanics">Mechanics</h2>
<ul>
<li><b>The dish.</b> Hundreds of creatures eat algae, split, mutate and form species. Each creature has 9 sensory inputs, 7 hidden neurons and 3 motor outputs. Nobody programmed their behaviour; selection is the only teacher.</li>
<li><b>Releasing.</b> A release puts 40 siblings with a brain copied from the most successful living species, slightly mutated, into the dish under your chosen name. Paid releases cost today's release price in SOUP (or the same value in SOL, which is used to buy back and burn SOUP). New releases are protected from disasters for 10 minutes.</li>
<li><b>Recommended start.</b> One button marks the warm vent with the most food and suggests the first trait, Efficient digestion.</li>
<li><b>Free microbe.</b> Opens at launch for the first 500 Solana wallets: share our launch post on X with a personal code (quote or reply) from an account at least 30 days old with at least 25 followers. One per wallet and per X account. A free lineage earns a quarter of a paid one.</li>
<li><b>Interventions.</b> Anyone can buy a food bloom, meteor, cold front or toxic bloom. Each enters the public event log and plays out identically in every browser.</li>
<li><b>Evolution tree.</b> When a released lineage reaches a milestone, its releaser can burn SOUP to unlock a trait such as armor, longer flagella, wider eyes or cold resistance. Some branches lock each other out.</li>
<li><b>Territory.</b> The dish has named zones. The lineage with the most living biomass in a zone holds it. Holding zones adds a small bonus to hourly yield (see below).</li>
</ul>

<h2 id="money">Money flow</h2>
<svg viewBox="0 0 900 330" width="100%" role="img" aria-label="Money flow diagram">
 <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#111314"/></marker><marker id="r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c9531a"/></marker></defs>
 <g fill="none" stroke="#111314" stroke-width="1.2"><rect x="20" y="20" width="230" height="80"/><rect x="20" y="125" width="230" height="80"/><rect x="20" y="230" width="230" height="80"/>
 <rect x="620" y="60" width="260" height="90" stroke="#c9531a"/><rect x="620" y="200" width="260" height="90"/>
 <path d="M250 60 C430 60 450 100 618 100" stroke="#c9531a" marker-end="url(#r)"/><path d="M250 165 C430 165 450 120 618 115" stroke="#c9531a" marker-end="url(#r)"/>
 <path d="M250 175 C430 175 450 235 618 240" marker-end="url(#a)"/><path d="M250 270 C430 270 450 255 618 255" marker-end="url(#a)"/></g>
 <g font-size="18" fill="#111314"><text x="36" y="55" font-style="italic">SOUP trading fees</text><text x="36" y="160" font-style="italic">Disasters and food</text><text x="36" y="265" font-style="italic">Releases and traits</text>
 <text x="636" y="95" font-style="italic" fill="#c9531a">Prize pool, SOL</text><text x="636" y="235" font-style="italic">Bought back and burned</text></g>
 <g font-size="13" fill="#55524a"><text x="36" y="80">creator fee, {int(P['creator_to_pool']*100)}% to the pool</text><text x="36" y="185">{int(P['interv_to_pool']*100)}% pool, {100-int(P['interv_to_pool']*100)}% burn</text><text x="36" y="290">100% burned</text>
 <text x="636" y="120">half paid out per day, hourly</text><text x="636" y="260">permanently removed from supply</text></g>
</svg>

<h2 id="payout">Payout formula</h2>
<p>Every second, each released lineage is credited with its number of living creatures (creature-seconds). At the end of each hour:</p>
<div class="formula">hour budget      B = pool balance x {P['payout_rate']} / 24
yield            Y = {P['yield_share']} x B        bonus pot += {round(1-P['yield_share'],2)} x B
lineage weight   w = (creature-seconds this hour) ^ 1.0 (0.6 before the v5 rule) x (1 + 0.05 x zones held, at most 3)
                     x 0.25 if the release was free (all free releases together at most {int(P['free_cap']*100)}% of Y)
lineage payout     = Y x w / sum of all w            (no wallet above {int(P['wallet_cap']*100)}% of a day's yield)</div>
<p>Once a day the bonus pot is paid 50, 30 and 20 percent to the three lineages with the most creature-seconds that day. A lineage must be at least 2 hours old to qualify, and territory does not count for the bonus. Then tomorrow's release price is set:</p>
<div class="formula">price = (yesterday's payouts to paid releases / yesterday's paid releases) / {P['target_roi']}, kept between ${P['p_min']:.0f} and ${P['p_max']:.0f}</div>
<p>The site shows it as "Today's release price $X, yesterday avg return Yx". Payouts under 0.001 SOL accumulate until they reach that size.</p>

<h2 id="rules">Fair limits</h2>
<ul>
<li>One free microbe per wallet and per X account, for the first 500 wallets, verified through a public post that contains a code tied to the wallet. The server batches all pending codes into one X search per minute and has a daily API spend cap.</li>
<li>At most 10 paid releases per wallet per day. No wallet earns more than 10 percent of a day's yield.</li>
<li>New releases ignore disasters for 10 minutes and burn energy at half rate while the lineage has fewer than 100 creatures, back to normal over 6 hours. Meteors have a 5 minute cooldown; cold fronts and toxic blooms 3 minutes.</li>
<li>The daily bonus uses the whole day's creature-seconds and a 2 hour minimum age, so a last-minute release cannot snipe it.</li>
<li>In simulation, even 1000 free lineages a day took about $32 a day under the 10 percent free cap and left honest returns unchanged; without the cap they took $268 a day. The X share requirement makes that many free claims impractical. A whale releasing 50 times more than everyone else got back about 0.4x.</li>
</ul>

<h2 id="verify">Fairness and verifiability</h2>
<ul>
<li>The dish is a pure function of a public seed and the ordered log of paid actions. The simulation uses only exact arithmetic, so every browser computes the same world and checks its hash against the server every 500 ticks.</li>
<li>World hashes are committed on chain as memo transactions. Every payment, burn and payout is a public Solana transaction linked from the site.</li>
<li>Weather forecasts with a commit-reveal seed plus a future slot hash are designed but not live yet. Until they ship, disasters only happen when a player pays for one.</li>
</ul>

<h2 id="sim">Simulation results</h2>
<p class="note">Everything in this section comes from our own simulations, not from live play. Assumptions are labelled. Real results depend on how many people play and what they do.</p>
<h3>How long creatures live</h3>
<p>We ran the real game simulation for {'8 worlds of 8 hours of game time each' if LONG else 'shorter worlds'}, releasing three kinds of player in rotation: casual (random spot, no traits), Recommended start (best vent, first trait) and skilled (best vent, every trait as soon as it opens), with random disasters and food drops.</p>
<table><tr><th>Player</th><th>Releases</th><th>Median life</th><th>Longest 10%</th><th>Alive at end</th></tr>{life_rows}</table>
<h3>Returns, medium game</h3>
<p>Assumptions: $100,000 of SOUP trading per day, creator fee 0.3%, 200 interventions per day at an average $2, 50 paid releases per day, players 20% casual, 40% Recommended start, 30% skilled, 10% whale.</p>
<table><tr><th>Measure</th><th>Result</th></tr>
{tr('Average return per $1 burned',f(s['avg_roi'])+'x')}{tr('Typical player (median)',f(s['p50'])+'x')}{tr('Unluckiest 1 in 10 at or below',f(s['p10'])+'x')}{tr('Luckiest 1 in 10 at or above',f(s['p90'])+'x')}{tr('Top 1 in 20 at or above',f(s['p95'])+'x')}{tr('Top 1 in 100 at or above',f(p99,1)+'x')}
{tr('Players who came out ahead',str(int(round(s['players_profit'])))+'%')}{tr('Casual, Recommended start, skilled',f"{f(s['casual'])}x, {f(s['starter'])}x, {f(s['skilled'])}x")}</table>
<h3>Survival update (v4 rule)</h3>
<p>Released lineages used to die out within about 20 minutes, while the pool pays hourly. From a fixed tick recorded in the ledger, a newly released lineage starts at half the normal energy cost, rising evenly back to normal over 6 hours. Measured on a copy of the live dish with a release every 11 minutes: median lineage life about 1.2 to 1.5 hours, the unluckiest 1 in 10 gone within 8 to 35 minutes, the luckiest 1 in 10 past 1.7 to 3.4 hours. Rerunning the medium game with these lineages: average 1.21x, median 0.99x, luckiest 1 in 10 at 2.00x or above, about 50% of players ahead. The other half still lose. Sample: 14 measured lineages, so treat these as early numbers.</p>
<h3>Balance update (v5 rule)</h3>
<p>From a second fixed tick recorded in the ledger: the half-cost head start only applies while a released lineage has fewer than 100 creatures, so one release can no longer take over the dish (in tests a single early release had grown to about 97% of the dish in 5 minutes; with the cap it holds near 100). The hourly weight becomes creature-seconds to the power 1.0 instead of 0.6, and the daily release price targets an average return of 1.0x instead of 1.2x. Measured on 227 lineages from 16 runs on a copy of the live dish: median lineage life about 2 h 20 min, the unluckiest 1 in 10 gone within about 5 minutes, the luckiest 1 in 10 past about 3 h 15 min. Medium game: average 1.0x, median 0.88x, luckiest 1 in 10 at 1.26x or above, about 32% of players ahead. Most players lose a little; a third come out ahead.</p>
<h3>Creator fee sensitivity</h3>
<p>pump.fun's fee page (last updated 17 October 2026) lists a 0.300% creator fee on the bonding curve, 0.950% just after graduation, falling in steps to 0.050% at the largest market caps. Capacity is the number of paid releases per day the pool supports at the $1 floor. Interventions use the price mix below.</p>
<table><tr><th>Creator fee</th><th>Volume per day</th><th>Pool inflow per day</th><th>Capacity</th><th>Avg return</th><th>Median</th><th>Price</th></tr>{fee_rows}</table>
<p>Intervention mix assumption: 60% food at $1.50, 10% meteors at $7.50, 15% cold fronts and 15% toxic blooms at $4.50 (SOL at $150), averaging $3.00, capped by the cooldowns.</p>
<h3>When players react to yesterday's return</h3>
<p>Assumption: each day, releases change by yesterday's average return to the power 1.5, by at most 30% a day.</p>
<table><tr><th>Volume</th><th>Interventions</th><th>Start releases</th><th>Settles at releases</th><th>Avg return</th><th>Price</th></tr>{beh_rows}</table>
<p>When players pile in, the price falls to the $1 floor and the average return drifts toward 1.0x. The game then burns more SOUP, but the edge for players disappears. Where demand stays below capacity, the average stays near the 1.2x target.</p>
<h3>Launch weeks</h3>
<p>Assumption: the pool starts empty and volume ramps from $5,000 to $100,000 a day over 14 days, with 20 releases and 50 interventions a day.</p>
<table><tr><th>Bootstrap</th><th>Day 1 avg return</th><th>Week 1 avg</th><th>Week 1 median</th></tr>{cs_rows}</table>
<p>Without help, the first day's players get back very little because the pool is empty. The proposed bootstrap, not yet decided, is to seed the pool with $300 from the team before launch and send 100% of creator fees to the pool for the first 7 days.</p>
<h3>Territory</h3>
<p>Measured with territory active, a released lineage held on average {f(z['mean_zones'])} zones over its life (the longest-lived held up to {f(z['max_zones'],1)}). A 5% bonus per zone therefore changes returns very little: the median moved from {f(z['effect']['0.0']['p50'])}x to {f(z['effect']['0.05']['p50'])}x. It rewards lineages that dominate the dish without letting them take over the pool.</p>

<h2 id="token">Token</h2>
<ul>
<li>Ticker: $SOUP, on Solana. Contract address: to be announced. Any address posted before the official announcement is not ours.</li>
<li>Holders do nothing. Release prices, trait unlocks and 60% of intervention fees buy back and burn SOUP.</li>
<li>The game currently runs on a test network with test tokens. The buyback is a dry run.</li>
</ul>

<h2 id="risks">Risks and disclaimers</h2>
<ul>
<li>This is not financial advice and not an investment. Payouts depend on other players and on outside money, and they are not guaranteed.</li>
<li>Most players should expect to lose some of what they spend. Simulated results are not a promise of future results.</li>
<li>Tokens can lose all their value. Smart contracts, servers and wallets can fail.</li>
<li>Paid games with prizes may be regulated or prohibited where you live. A free daily release is available, and the rules may change after legal review.</li>
<li>Parameters may be changed to keep the pool solvent and the game fair. Changes will be announced and shown on this page.</li>
</ul>
</main>
<footer class="colophon"><p class="mono"><a href="/">The dish</a>&nbsp;&nbsp;&nbsp;<a href="/how">How it works</a>&nbsp;&nbsp;&nbsp;<a href="https://github.com/primordialsoupfun/primordial">Source code</a></p></footer>
</body></html>'''
open('../whitepaper.html','w').write(page);print('ok',f(s['avg_roi']),f(s['p50']),f(p99,1))
