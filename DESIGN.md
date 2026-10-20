# Primordial: design

Brand: Primordial. Domain: primordialsoup.fun. Token ticker is configurable (`TICKER` env, default SOUP). Tagline: "A shared tank of evolving life."
Visual identity: linocut version B. Deep ink black (#111314) and warm rust orange (#c9531a) on cream paper (#f3eddb). The layout is a museum plate with a serif and mono pairing and fine rules. Organisms are drawn as Haeckel-style procedural microorganisms. Icons and the OG fallback image are derived from brand/avatar-b.png and brand/banner-b.png (the brand files themselves are left untouched).

## Product
- One shared, persistent tank of artificial life.
- Every organism carries a small neural network (9 inputs, 7 hidden, 3 outputs). It inherits the network from its parent with mutation, and natural selection is the only teacher.
- Watching is free. Paid interventions are public and replayed identically in every browser.
- Holders do nothing. Fees buy back and burn the token.

## Deterministic shared world
- The world state is a pure function of the seed and the ordered event log.
  - The sim loop uses only + - * / sqrt and softsign.
  - The RNG is mulberry32 with a serialisable state.
  - Trig and all drawing are visual only and never touch sim state.
- The server runs the canonical sim at 30 ticks per second. It assigns every verified event `at = tick + 45` (about 1.5 s of lead) and streams it over SSE.
- **Late join:** the client loads the latest snapshot (taken every 300 ticks, with full state and RNG), replays the pending events and catches up to the server tick.
- **Hash checks:** every 500 ticks the server broadcasts a world hash. The client compares its own hash and resyncs from a snapshot on mismatch.
- **Tested:** two separate headless Chrome clients, one joining late, plus the server produced identical hashes at ticks 8000, 8500 and 9000 (data/e2e-sync.json).
- **Restart:** the server rebuilds the canonical world from data/ledger.json (seed plus event log).

## Food system
1. **Natural algae** regrows continuously everywhere. There is extra regrowth at three thermal vents (their positions are seeded). Cold weather cuts both.
2. **Paid feeding:** a food bloom at the player's mark, paid with 0.01 SOL or by burning 50 tokens. Any species can compete for it.
3. **Predation** (skill tree) creates a food chain. Predators eat smaller organisms of other lineages, but digest algae at 75 percent.
- Energy: swimming, base metabolism and reproduction (fission halves energy) cost energy, and an organism dies of starvation at 0. Efficient digestion lowers base cost by 20 percent.
- Algae is drawn as small illustrated colonies, filaments and cysts.

## Paid events (placeholder prices)
| Event | Effect | Price |
| --- | --- | --- |
| Food bloom | 260 pellets at the mark | 0.01 SOL or burn 50 |
| Meteor | Radius 110 kill zone. Armor gives a 30 or 55 percent survival chance. | 0.05 SOL |
| Cold front | 700 ticks of higher metabolism, less algae | 0.03 SOL |
| Toxic bloom | Draining zone for 1200 ticks | 0.03 SOL |
| Release species | 40 organisms, random genome, plain-text name (not an NFT) | 0.10 SOL |

Verification (`/api/submit`):
- The tx must be confirmed with no error.
- The memo must start with `primordial:v1:` followed by JSON.
- There must be a system transfer from the fee payer to the treasury of at least the price, or an SPL burn of the configured mint by the fee payer.
- A signature can only be used once.
- Coordinates are clamped. Names are filtered to letters, digits and . ' - and capped at 24 characters.
- **Tested:** a replayed signature, an underpaid meteor and a trait burn by a non-owner were all rejected.

## Evolution tree, unlocked by burning
Every released lineage has a tree. Nodes become eligible through in-sim milestones (max generation, living population, disasters survived). The releaser activates a node by burning tokens: 100 for tier I, 300 for tier II. The tx is an SPL burn plus a memo `{t:'trait',sp,trait}`. The server verifies the burner is the species owner and that the node is eligible, then inserts a deterministic `trait` event. The sim re-checks eligibility at apply time, so every client converges.

| Branch | I | II | Trade-off |
| --- | --- | --- | --- |
| Armor | Thick membrane: meteor survival 30 percent, speed x0.85 | Silica plates: 55 percent, resists predation, higher base cost | Closes Locomotion |
| Locomotion | Long flagella: speed x1.2, move cost x1.1 | Twin flagella: speed x1.15 more | Closes Armor |
| Senses | Wide eyespot: sensor radius 19 | Antennae: radius 24, longer reach | |
| Metabolism | Efficient digestion: base cost x0.8 | Fat vacuoles: reproduce later, move cost x0.9 | |
| Resistance | Cold capsule: cold cost x0.4 | Toxin filter: toxin cost x0.35 | |
| Diet | Predation: eats other lineages, algae x0.75 | Symbiosis: energy from nearby kin | Mutually exclusive |

- Each trait changes the drawing: double membrane, plate lattice, longer or twin flagella, eyespot, antennae, vacuoles, dotted capsule, fringe, mouthparts, green symbionts.
- **Balance:** every bonus has a cost, and the neural network still decides behaviour. A trait improves the odds but does not guarantee survival. A disaster or a better-adapted wild lineage can still wipe out a fully evolved species.

## Survival Prize Pool
- 20 percent of release fees (`PRIZE_SHARE`) goes to the pool. Everything else goes to buyback and burn.
- A season lasts `EPOCH_TICKS`. At season close the sim scores each released root lineage as descendants alive x 10 + floor(ticks survived / 100). The top three releasers are paid 50, 30 and 20 percent of the pool, automatically, by a SystemProgram transfer with memo `primordial:prize:<season>:<place>:<species>`.
- Scoring is computed inside the deterministic sim, so anyone can reproduce it from the seed and the log.
- The site shows the "Hall of Survivors" with current standings, past seasons, payout tx links and Share on X.

## Gambling and fairness notes (get legal review before mainnet)
- Paying to enter with a chance of winning a prize can count as gambling or a lottery in many US states.
  - Mitigations: outcomes depend on measurable, player-influenced strategy (placement, timing, trait choices, feeding) rather than pure chance. Keep the share small (20 percent of release fees only). Consider a free entry route (a free weekly release slot) and geo-restrictions.
  - Even so, the sim contains seeded randomness, so the skill-versus-chance question remains a real legal risk.
- Burning for traits gives no direct monetary return. Prizes come only from the pool, never from token holders.
- The token should be burn-only. Do not route revenue to holders and do not market it as an investment.
- **Fairness:**
  - Event ordering is public: by tick and then by log index, assigned at verification time.
  - The server could reorder events or censor transactions. Mitigations: hourly commits of the hash and log length, and a later move of ordering to slot plus tx index.
  - The seed is fixed per world. For a new season the seed should be committed in advance and revealed afterwards.
- **Griefing:** add a disaster cooldown and price escalation per window before mainnet.

## Solana pieces
- **Payments:** wallet connect (Phantom or Solflare). The tx is a transfer plus a memo, or an SPL burn plus a memo. The server verifies it from the RPC.
- **Commits:** every `COMMIT_TICKS` the treasury sends a memo `primordial:commit:<tick>:<hash>:<logLength>`.
- **Daily buyback and burn:** fees queue up. The job quotes a swap (a DRY RUN on test networks, with no Jupiter call) and burns the equivalent test-mint tokens from the treasury account. The tx is linked on the site, with a burn counter in the masthead.
- **Kill switch:** stop the server, or set the prices to zero. A mainnet program with a pause flag is still pending.

## Sharing (no bot account)
- No auto-posting. Players share only through X web intents (Share on X after their own event, on each log entry, on specimen cards and in the Hall of Survivors).
- Share URLs: `https://primordialsoup.fun/s/<species>`, `/e/<event>` and `/h/<season>`. They carry og and twitter:card meta, and their image is a server-rendered specimen card `/og/<kind>/<id>.png` (1200x630).
- The client can also download the same card as a PNG.

## Cost (monthly, all to-check)
- One small VPS for the sync server: price to-check.
- RPC: free tier to start, limits to-check.
- Fees:
  - Commits: about 720 per month at a 5,000 lamport base fee, about 0.0036 SOL.
  - Buyback and burn: about 60 txs per month.
  - Prize payouts: about 3 per season.
- Domain: being bought by the user.
- Everything can be paused instantly.

## Remaining for mainnet (needs explicit approval)
- **On-chain program:** an Anchor event program with a pause flag and price table, a treasury PDA and a pool PDA.
- **Buyback:** a real Jupiter swap with a slippage cap.
- **Token and launch:** token creation, an RPC provider, a security review, legal review of the prize pool, a cross-browser determinism matrix, rate limits and cooldowns, name moderation, hosting, and pointing the domain.
