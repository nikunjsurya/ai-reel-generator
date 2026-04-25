# 5-Run Cost + Latency Measurement

Measured on 2026-04-23 against the live pipeline after all audit fixes and the variety-diversification fix were applied (see "Scene variety" section below). Five consecutive end-to-end reels driven by a measurement harness script that fires the real Telegram webhook with an approve tap and times each stage.

## Per-run breakdown (final run, variety fix applied)

| # | Topic | Flow A (s) | Flow B (s) | Total (s) | Haiku in/out | Sonnet in/out | EL chars | $ Haiku | $ Sonnet | $ EL | **$ Total** |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | recent OpenAI updates | 33.6 | 66.7 | 100.3 | 15494/17 | 5497/5097 | 1045 | $0.0156 | $0.0929 | $0.261 | **$0.370** |
| 2 | google deepmind latest | 27.6 | 75.8 | 103.4 | 15058/14 | 3731/3371 | 1261 | $0.0151 | $0.0618 | $0.315 | **$0.392** |
| 3 | anthropic claude announcements | 36.8 | 109.0 | 145.8 | 15058/17 | 6699/5263 | 1548 | $0.0151 | $0.0990 | $0.387 | **$0.501** |
| 4 | meta llama release | 30.6 | 78.9 | 109.5 | 15493/14 | 4456/3367 | 1249 | $0.0155 | $0.0638 | $0.312 | **$0.392** |
| 5 | hugging face open models | 30.7 | 84.9 | 115.6 | 15214/17 | 5467/5152 | 1317 | $0.0153 | $0.0937 | $0.329 | **$0.438** |

## Averages across 5 runs

| Metric | Measured | SPEC target | Verdict |
|---|---:|---|---|
| Flow A latency (research + cards) | **31.9s** | 45-60s | **Under** |
| Flow B latency (render + deliver) | **83.1s** | 45-90s | In range |
| Total latency (`/reel` → MP4) | **114.9s** (~1m 55s) | 2-3 min | **Under** |
| Cost per reel | **$0.419** | ~$0.30 | ~40% over |

Range across 5 runs: **100-146 seconds** / **$0.37-0.50**.

## Where the cost goes (average per reel)

| Component | Avg cost | Share |
|---|---:|---:|
| Claude Haiku (story ranking) | $0.015 | 4% |
| Claude Sonnet (3 scene plans) | $0.082 | 20% |
| ElevenLabs narration | $0.321 | 77% |
| **Total** | **$0.419** | 100% |

**ElevenLabs is 77% of the bill.** Two realistic cost-reduction levers:

1. **Cap narration length.** Reels post-variety-fix average ~1284 characters (longer than the ~1100 pre-fix) because the more diverse scene kit invites richer per-beat copy. Clamping the prompt to a strict ~1000-char budget would drop ElevenLabs ~22% → $0.07/reel saved.
2. **Self-hosted TTS at scale.** At 1000+ reels/day, Piper / StyleTTS2 / Cartesia at $0.05-0.10 per 1K chars would move total under $0.15/reel.

## Where the latency goes (average per reel)

| Stage | Avg (s) | Notes |
|---|---:|---|
| Flow A total | 31.9 | Research + 3 parallel Claude Sonnet scene plans |
| &nbsp;&nbsp;Claude Sonnet (scene plans ×3 parallel) | ~25 | Dominant, 3 parallel calls |
| &nbsp;&nbsp;Claude Haiku (ranking) | ~1 | Cheap + fast |
| &nbsp;&nbsp;RSS fetch + normalize | ~1 | 6 feeds in parallel |
| Flow B total | 83.1 | Render + narrate + deliver |
| &nbsp;&nbsp;Remotion render | ~72 | Dominant, CPU render, scales linearly with reel length |
| &nbsp;&nbsp;ElevenLabs narration | ~2.5 | `/with-timestamps` |
| &nbsp;&nbsp;Build Final Content (sanitize) | ~0.5 | |
| &nbsp;&nbsp;Telegram MP4 upload | ~3-4 | 9-12 MB binary |

## Cache-replay performance (from audit)

Re-approving an already-rendered candidate hits the fast path: **3.1 seconds total**, no re-render. 25-35× speedup.

## Scene variety (the late-discovery fix that changed these numbers)

**Problem first-measured in the initial 5 runs:** every reel opened with `VersionReveal`, every reel closed with `CTAOutro`, 5 of 23 catalog scenes appeared in *every* reel, pairwise set-overlap between reels was 0.70 on a 0-1 scale.

### Root causes

1. **Deterministic archetype prefer-list.** Each archetype handed Claude the same fixed scene list every call. Claude picked the obvious composition every time.
2. **No opener rotation.** The catalog described `VersionReveal` as "opening big reveal, safest hook". Claude interpreted "safest" as "always use".
3. **Sanitizer defaulted to VersionReveal.** When `Build Final Content` couldn't fetch an og:image for a `BrollClip` beat, it swapped the beat to `VersionReveal`, even when `VersionReveal` was already in the reel. Silent duplicates.

### Fixes applied

| Fix | Where | What changed |
|---|---|---|
| Per-archetype opener pool | `Build Scene Plan Prompt` (WF1) | Each archetype has 3-4 viable openers. One is picked per reel via entropy-mixed PRNG, rotating across `VersionReveal / DoubleStatHero / QuoteCallout / HeroQuestion / BrollClip`. |
| Stochastic kit sampling | `Build Scene Plan Prompt` (WF1) | Middle 5 beats sampled from the archetype prefer list. Different reels get different middle pools. |
| Wildcard injection | `Build Scene Plan Prompt` (WF1) | One "wildcard" scene from the long tail forced per reel, respecting the archetype's avoid list. |
| No-duplicate constraint | `Build Scene Plan Prompt` + `Parse Scene Plans` (WF1) | Prompt forbids repeats; Parse Scene Plans rescues offenders via fallback rotation. |
| Unused-fallback sanitizer | `Build Final Content` (WF2) | All 3 fallback sites now call `pickUnusedFallback(usedScenes)` rotating through `BadgeOverlay / QuoteCallout / StatBlock / CommandPills / IconGrid / DoubleStatHero`, skipping any scene already in the reel. |
| Entropy-mixed seed | `Build Scene Plan Prompt` (WF1) | Mulberry32 seed = FNV1a(job_id + index) XOR Date.now() XOR Math.random(), with 8-cycle warmup, so close-in-time candidates don't land on the same opener. |

### Measured delta

| Variety metric | Before | After | Change |
|---|---:|---:|---:|
| Unique scene types across 5 reels | 12 | 15 | **+25%** |
| Scene types appearing in every reel | 5 | 2 | **-60%** |
| Avg pairwise set-overlap | 0.70 | 0.42 | **-0.28** |
| Unique openers across 5 reels | **1** | **4** | **+300%** |
| Duplicate scene types within a reel | Silent (sanitizer hid them) | 0 | eliminated |

### Sample lineups (same 5 topics, after fix)

| Topic | Scene lineup |
|---|---|
| OpenAI | VersionReveal → BadgeOverlay → CommandPills → MapMoment → BrollClip → MockTweetCard → SkillLabel → CTAOutro |
| DeepMind | HeroQuestion → BadgeOverlay → MapMoment → StatBlock → MockTweetCard → DoubleStatHero → VersionReveal → CTAOutro |
| Anthropic | DoubleStatHero → ProgressBars → BrowserReveal → CommandPills → PricingReveal → BadgeOverlay → MockTweetCard → IconGrid → CTAOutro |
| Meta Llama | DoubleStatHero → VersionReveal → BrowserReveal → IconGrid → SkillLabel → PricingReveal → BadgeOverlay → CTAOutro |
| HuggingFace | BrollClip → CommandPills → DoubleStatHero → PricingReveal → SkillLabel → MockTweetCard → BadgeOverlay → CTAOutro |

Each reel has a distinct visual flow. The fix added ~$0.04/reel (longer narrations, richer beat copy) but the quality improvement is the whole point.

## Pricing assumptions

- Claude Haiku 4.5: $1.00/M input, $5.00/M output
- Claude Sonnet 4.6: $3.00/M input, $15.00/M output
- ElevenLabs Turbo v2.5: $0.250 per 1,000 characters (mid-tier estimate)

## Projected monthly cost at scale

| Reels / day | Cost / day | Cost / month |
|---:|---:|---:|
| 1 | $0.42 | $12.60 |
| 10 | $4.19 | $125.70 |
| 100 | $41.90 | $1,257 |
| 1,000 | $419 | $12,570 |
