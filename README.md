# Primordial

A shared tank of evolving life. https://primordialsoup.fun

Hundreds of microorganisms, each driven by a small neural network, eat, breed, mutate and split into species in one tank that every visitor sees identically. Watching is free. Interventions are paid on Solana and enter a public, ordered event log.

## How it works
- **Deterministic world.** State is a pure function of a seed and the ordered event log. The step loop uses only exact IEEE operations, so every browser renders the same tank. The server streams events over SSE, late joiners resume from a snapshot, and world hashes are compared every 500 ticks.
- **Brains.** 9 sensory inputs, 7 hidden neurons, 3 motor outputs. Children inherit a mutated copy. Selection is the only teacher.
- **Interventions.** Food bloom, meteor, cold front, toxic bloom, and releasing a named species. Each is a SOL transfer to the treasury with a memo, verified on chain by the server (amount, recipient, memo, single use).
- **Evolution tree.** Released lineages unlock traits through in-sim milestones. The releaser activates a trait by burning SOUP. Branches trade off against each other.
- **Survival pool.** 20 percent of release fees fund a pool paid each season to the top three surviving released lineages, scored from the log.
- **Burn.** All other fees buy back and burn SOUP. Burns and world-hash commits are posted on chain and linked on the site.

## Run locally
```
npm install
solana-test-validator --reset          # in another terminal
PUBLIC_URL=http://localhost:8765 npm start
```
Open http://localhost:8765. Configuration is in `.env.example`. Mainnet RPC URLs are refused by this build.

## Tests
`node e2e-player.js` runs payments, burns and rejection cases against the configured cluster. `node e2e-sync.js` opens two browsers, one late, and checks that their world hashes match the server.

## Status
Test network prototype. The buyback is a dry run: no swap is executed, and treasury test tokens are burned in its place. See DESIGN.md for the full design and open risks.

## License
MIT
