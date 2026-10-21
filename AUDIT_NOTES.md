# Audit 2026-10-21 12:10 TPE
- Deploy: live 7495508 == origin/main, Render live, no error logs in last 100 lines.
- FIX: client snapshot was 48 MB (68k species, mostly dead, each with genome). Now W.toLite(): dead non-root wild species without genome, small ones as compact rows -> ~5 MB. Disk checkpoint still full. Hash identical over 3000 ticks from live state; e2e-sync 2 clients + server match.
- FIX: /api/submit replay race (same sig submitted twice concurrently could pass ledger.used check during the await). In-flight set.
- FIX copy: how.html $5 -> $4.40 / one in ten $6.30 (v5), README life v5, economy.js comments exponent 1.0.
- OPEN on devnet: paid release/interventions/food/trait burns via /api/submit (devnet SOL), payouts from pool. Claim open, FREE_RELEASE_OPEN off.
- Proposals: status exposes code by wallet (grief: post someone's code from bad X account clears their pending); payout double-pay if send throws after landing; no per-IP limit on code issuance.
