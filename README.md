# Primordial

A shared tank of evolving life. https://primordialsoup.fun

Hundreds of microorganisms, each driven by a small neural network, eat, breed, mutate and split into species in one tank that every visitor sees identically. Watching is free. Interventions are paid on Solana and enter a public, ordered event log.

## How it works
- **Deterministic world.** State is a pure function of a seed and the ordered event log. The step loop uses only exact IEEE operations, so every browser renders the same tank. The server streams events over SSE, late joiners resume from a snapshot, and world hashes are compared every 500 ticks.
- **Brains.** 9 sensory inputs, 7 hidden neurons, 3 motor outputs. Children inherit a mutated copy. Selection is the only teacher.
- **Interventions.** Food bloom, meteor, cold front, toxic bloom, and releasing a named species. Each is a SOL transfer to the payments wallet with a memo, verified on chain by the server (amount, recipient, memo, single use).
- **Evolution tree.** Released lineages unlock traits through in-sim milestones. The releaser activates a trait by burning SOUP. Branches trade off against each other.
- **Head start.** A newly released lineage burns energy at half rate while it has fewer than 100 creatures (v5 cap), back to normal over 6 hours (v4 rule, switched on at a fixed tick). Since v5 the head start only applies while a lineage has fewer than 100 creatures. Measured median lineage life is about 2 hours 20 minutes, with some gone in minutes and some lasting more than 3 hours.
- **Survival economy** (`economy.js`). The prize pool is funded from outside the game: 70% of SOUP creator fees and 40% of intervention fees. The other 30% of creator fees goes to the Treasury. Each day half the pool is paid out hourly. 85% of each hour goes to living released lineages, weighted by creature-seconds (power 1.0 since v5, was 0.6), with +5% per territory zone held (up to 3 zones) and free releases at 1/4 weight. 15% goes to a daily top-3 bonus with a 2 hour minimum age.
- **Release price.** Set once a day so that the average paid release got back about 1.0x yesterday (1.2x before v5), with a floor of $1 and a cap of $25. Paying is a SOUP burn, or SOL that is used for buyback and burn.
- **Limits.** One free microbe per wallet and per X account, lifetime, for the first 500 wallets, claimed by quoting or replying to the campaign post with a wallet-bound code (`claims.js`, X account at least 30 days old with at least 5 followers, batched X search, daily spend cap). Closed until launch: `CLAIM_OPEN=1` and `CAMPAIGN_TWEET_ID` enable it. At most 10 paid releases per wallet per day. No wallet earns more than 10% of a day's yield. 10 minute newborn shield. Disaster cooldowns.
- **Treasury.** The official mainnet Treasury is `rr7VrmLv6akBeQTEDrMbL8n6G2zSdsvkvjT1iD8zKnJ` ([Solscan](https://solscan.io/account/rr7VrmLv6akBeQTEDrMbL8n6G2zSdsvkvjT1iD8zKnJ)). It receives the SOUP creator fees: 70% goes on to the prize pool, 30% stays in the Treasury.
- **Burn.** Release prices, trait unlocks and 60% of intervention fees buy back and burn SOUP. Burns and world-hash commits are posted on chain and linked on the site.
- **Docs.** Plain-English rules: `/how`. Full rules, formula, simulation results and risks: `/whitepaper`. Simulation code and report: `econ/` (`REPORT.md`, `SIMPLE.md`).

## Run locally
```
npm install
solana-test-validator --reset          # in another terminal
PUBLIC_URL=http://localhost:8765 npm start
```
Open http://localhost:8765. Configuration is in `.env.example`. Mainnet RPC URLs are refused by this build.

## Tests
`node e2e-player.js` runs payments, burns, release pricing, the free microbe claim (start the server with `CLAIM_OPEN=1 CAMPAIGN_TWEET_ID=1 X_MOCK_FILE=/tmp/xmock.json CLAIM_POLL_S=2 CLAIM_MAX=1` and pass the same `X_MOCK_FILE`; `CLAIM_ONLY=1` runs just that part, no X API call), cooldowns and an hourly yield payout against the configured cluster (use `HOUR_TICKS=600 PAYOUT_INTERVAL_S=10` for a fast run). `node e2e-sync.js` opens two browsers, one late, and checks that their world hashes match the server.

## Status
Test network prototype. The buyback is a dry run: no swap is executed, and payments wallet test tokens are burned in its place. See DESIGN.md for the full design and open risks.

## License
MIT
