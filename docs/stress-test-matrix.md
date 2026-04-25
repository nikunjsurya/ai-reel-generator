# Stress-Test Matrix, Known Variables + Edge Cases

Mental model of where this system can fail, what it does today, and what would break it tomorrow. Organized so you can walk a reviewer through it in the Loom or defend the design in Q&A.

## Part A, User-level UX edges (what happens if the user does X?)

### A1. "I don't like any of the 3 candidates"

**Today**: tap Reject on each card (or ignore them; they auto-clear after 24h via watchdog). No ElevenLabs or Remotion calls fire, so cost = $0.03 (the Claude calls already spent).

To get fresh candidates on the same topic:
- Send `/reel! <topic>`, the `!` bypasses the idempotency check that would otherwise say "I already pulled cards for X 5 min ago."
- OR wait an hour (idempotency window) and send `/reel <topic>` again.

**What's missing**: a "Regenerate" button on the cards themselves. Would cost one click instead of a command. ~10-min addition, new callback_data `regen:<jobId>`, routed to WF1's research path, bypasses filter-rank cache.

### A2. "The topic I searched has no stories"

**Today**: `Select Top 3` detects 0 matches and sends a friendly Telegram DM:
```
No stories matched "<topic>" in the last 7 days.
Feeds returning stories: openai (15), huggingface (15), ...
Feeds that failed: anthropic [404]
Try a broader topic: /reel recent AI updates | /reel openai | /reel anthropic
```
No ElevenLabs, no render. Cost = $0.02 (Haiku rank only; Sonnet not called).

### A3. "I sent `/reel` and then immediately `/cancel`"

**Today**: `/cancel` marks the most-recent pending job as `status: "cancelled"` on disk. If the user then taps Approve on a card, `Load Stored Job` detects the cancelled status and sends "job was cancelled, start fresh with /reel." No render.

**Known gap**: can't kill an already-running Remotion render. If the `/cancel` arrives mid-Flow-B, the render completes and the MP4 is sent.

### A4. "I tapped Approve twice in two seconds"

**Today**: first tap kicks off WF2 exec. Second tap gets `Bridge: Check MP4 Cache` → miss (first render still in-flight) → hits the same narration/captions/render path → producing duplicate work. Both finish and both deliver. Messy but not broken.

**Known gap**: no per-job lock. Would be a filesystem mutex at `/project/jobs/locks/<job_id>.lock`, ~15 min to add.

### A5. "I tapped Approve 10 times (spammed the button)"

Same as A4 but worse, 10 parallel Remotion renders. The host CPU gets slammed and everything slows. Not a hard break, but a bad experience.

**Known gap**: per-user concurrency lock (1 render at a time). ~15 min.

### A6. "Different user tried to use the bot"

**Today**: their `/reel` throws `Unauthorized user <id>` in Parse Command. Error Notifier DMs *me* (the owner), not them. They see nothing. Security + privacy.

### A7. "Telegram lost the webhook / I typed `/reel` and got no response"

**Today**: probably cloudflared tunnel rotated. The watchdog script (`reel-watchdog.sh`) runs every minute and reconciles the tunnel URL with n8n's `WEBHOOK_URL` env. Within 60s, service restores.

Without the watchdog: tunnel dies silently and bot stays dead until manual restart.

### A8. "I typed /rel, /rele, /eel, or just plain text"

**Today**: Parse Command has Levenshtein fuzzy-match (distance ≤ 2) for known commands. `/rel` → `/reel`. Plain text (no slash) is treated as a topic: `GPT 5 launch` → `/reel GPT 5 launch`.

### A9. "I sent a topic that has Markdown special chars (`_`, `*`, `[`)"

**Today**: topic is escaped via `mdEscape()` before interpolation into any DM. No more silent Telegram 400s.

## Part B, Topic coverage (what stories are findable?)

### B1. What's in today

| Source | Covered? | Notes |
|---|---|---|
| OpenAI | ✅ via `openai.com/news/rss.xml` |
| Anthropic | ✅ via **Google News RSS fallback** (official feed dead) |
| Google DeepMind | ✅ via `deepmind.google/api/blog/rss.xml` |
| Meta AI | ✅ via **Google News RSS fallback** (official feed dead) |
| Hugging Face | ✅ via `huggingface.co/blog/feed.xml` |
| Mistral AI | ✅ via `mistral.ai/rss.xml` |

### B2. What's NOT in today

- **Microsoft / Copilot**: not in the source list
- **xAI / Grok**: not in the source list
- **Cohere, Perplexity, Stability, ElevenLabs, Runway**: not in the source list
- **Apple AI / Apple Intelligence**: not in the source list
- **Academic research (arXiv, papers)**: not a source
- **Twitter/X news**: not a source
- **AI tooling (Cursor, Windsurf, Continue)**: only if an OpenAI/Anthropic/etc. blog mentions them
- **Funding rounds + M&A**: only if covered by one of the 6 feeds

### B3. The 7-day freshness window

`Normalize & Dedupe` drops any story with `pubDate` older than 7 days. Good for timely reels, bad for stories that you heard about yesterday but the RSS surfaced 8 days ago.

### B4. LLM-only ranking

Topic matching is Claude Haiku, not keyword search. That means:
- Good: fuzzy semantic match ("AI agents" matches "autonomous tool-use")
- Good: brand aliasing ("gemini" matches DeepMind stories about Gemini)
- Bad: no operators (no NOT, AND, quoted phrases)
- Bad: no sort (Haiku picks "most relevant," not "most recent")

### B5. Expansion paths (roadmap for topic coverage)

Easiest → hardest:

1. **Add 6 more RSS sources** (xAI, Cohere, Perplexity, Microsoft, Stability, Cursor blog). One-line-each edit in `Fetch All RSS Feeds`. ~10 min.
2. **Universal Google News fallback**: if a topic matches 0 stories in the 6 sources, auto-query Google News RSS for the topic. ~30 min.
3. **User-pinned URL**: `/reel url: https://example.com/article`, skip research entirely, build the reel from a specified URL. ~45 min (need an article extractor).
4. **arXiv hook** for research-first reels. ~1 hr (arXiv has a clean RSS/Atom API).
5. **Extend freshness to 14 or 30 days with recency weighting**, Haiku sees older stories but weights recent ones higher. ~20 min.

## Part C, Infrastructure + platform edges

### C1. Cloudflared tunnel rotation

Quick-tunnels re-roll URLs on restart. n8n's `WEBHOOK_URL` is baked at container start. If URLs drift, Telegram webhooks 403.

**Today**: `reel-watchdog.sh` polls both `/health` endpoints every minute, recreates the n8n container with the fresh URL on drift. Workflows auto-reactivate.

**Known gap**: 60s of downtime per rotation. Fix: cloudflared named tunnel (non-rotating), requires CF account setup.

### C2. Render-bridge process dies

**Today**: same watchdog relaunches it.
**Known gap**: no PM2 / Windows Service wrapper, one script, one failure mode.

### C3. Telegram bot token leaks

**Today**: Telegram allowlist on `msg.from.id` (hardcoded to owner) means an attacker with the token gets nothing.
**Gap**: could rotate the token on any suspected leak. 2-min ops task.

### C4. Anthropic API down / budget cap hit / model deprecated

- **Down**: 3-retry + 2s backoff on both Claude Rank and Claude Scene Plan. If all retries fail → Error Notifier. The system is fail-loud, not fail-silent.
- **Budget cap**: returns HTTP 400 with explicit "API usage limit" message. Same retry path; same Error Notifier. (I hit this today, the 5th measurement run fell to this exact case.)
- **Model deprecated**: model IDs are env vars (`ANTHROPIC_MODEL_RANK`, `ANTHROPIC_MODEL_SCENE_PLAN`). Swap and restart container. No workflow edits.

### C5. ElevenLabs quota exhausted

**Today**: `Bridge: Narration` returns 402/429 surfaced as `{ok: false}`. n8n node has `retryOnFail: true, maxTries: 2`. On exhaust → Error Notifier.
**Gap**: no automatic fallback TTS (say, Azure Speech or OpenAI TTS). At scale I'd add one.

### C6. Remotion render crashes / infinite loops

**Today**: `execFile` timeout of 600_000ms (10 min). Anything longer returns stderr tail to `Bridge: Remotion Render` → Error Notifier.
**Gap**: no mid-render cancel. Once shelled out, you wait for timeout.

### C7. MP4 too big for Telegram

Telegram's `sendVideo` upload cap is ~50 MB. Our reels are 8-12 MB, so well inside. But a longer reel (3-5 min long-form variant) at current bitrate would hit the cap around 3:30.

**Today**: no pre-upload size check. Telegram returns the error, Error Notifier catches.
**Fix**: post-render `ffprobe size` check + automatic re-encode at lower bitrate if over 45 MB.

### C8. Cost explosion (infinite loop cost bleed)

**Today**: the `MAX_COST_PER_RUN_USD` env var is named in `.env.example` but not enforced anywhere. A runaway loop could burn $$.
**Fix**: track Anthropic `usage.input_tokens + output_tokens` and ElevenLabs `char_count` per run. Halt + DM if over cap. ~20 min.

### C9. Disk fills up

32 MP4s currently in `./out/`. At 10 MB each that's 320 MB. Even 100 reels = 1 GB, barely a dent.
**Fix needed at scale**: rotate `/out/` monthly; move to S3 with TTL.

## Part D, AI / output-quality edges

### D1. Claude picks a scene that needs data it doesn't have

Example: `CodeInline` needs a `code` string, `MockTerminal` needs `logLines`. If Claude invents or misses these, the Zod validation at Remotion would explode.

**Today**: `Build Final Content`'s sanitizer has a rescue per scene type. Malformed → coerce or swap to a safe fallback.

### D2. All 3 candidate scene plans break

Claude Sonnet drifts on a topic, 3/3 candidates violate schema.
**Today**: Parse Scene Plans throws per-candidate. If all 3 throw, Telegram gets nothing, Error Notifier fires.
**Gap**: no auto-retry with a stricter system prompt on first parse failure. Would be nice.

### D3. Audio / video desync

ElevenLabs `/with-timestamps` is word-accurate in my tests (15+ reels measured). Drift has not appeared.
**Potential future edge**: very long narrations (> 3 min) may accumulate ±50ms drift per minute. Not a problem for 65-110s reels.

### D4. Caption blindness

If captions aren't on-screen for a beat (e.g., a glitch in beat→caption alignment), the viewer still hears the narration but sees no text. This is actually the bug that produced black frames in the initial version (before the gap-closing fix).

**Today**: each beat's Sequence extends to the next beat's startSec. No silent gaps.

### D5. Tone/sentiment mismatch

Claude writes celebratory copy for a controversy topic, or stern copy for a launch. Archetype classifier is the guard, it picks a "vibe" phrase the prompt emphasizes. Imperfect but noticeably better than freeform prompting.

### D6. Factual claim in narration that isn't in the source

Biggest open issue. Claude could say "Opus 4.7 scored 85% on SWE-bench" when the source doesn't mention SWE-bench at all. Solution is a post-generation verifier call; not implemented yet (listed as an "honest gap").

## Part E, Scale-up stress points

### E1. 1000 reels/day

- Cost: $375-420/day, $12-13k/month. ElevenLabs is the biggest line item.
- Concurrency: needs n8n Queue Mode with Redis + multiple workers. ~2 hrs setup.
- Render-bridge: needs BullMQ queue or round-robin across multiple bridge instances.
- TTS: economically justifies self-hosted Piper / StyleTTS2 / Cartesia. Cost drops to < $0.15/reel.

### E2. 10 parallel users

- Per-user concurrency lock prevents self-collisions.
- Cross-user: n8n Queue Mode handles up to N parallel executions. Single n8n instance can do ~3-5 parallel renders on the current 16-core host before CPU saturates.

### E3. 100 simultaneous approve taps

- Dogpiles the render-bridge. Needs a queue at the bridge layer.
- Telegram webhooks burst fine; n8n ingests them serially by default; the workflow itself handles the backlog.

## Part F, Reviewer-style "gotcha" questions to expect

These are the ones I'd lead with if I were interviewing.

1. **"How do you know the 5-run cost number will hold at 100 reels/day?"**, Answer: I don't. I've measured 5 runs; I'd measure 100 more before claiming it. What I DO know is: ElevenLabs charges per character (linear with narration length), Claude charges per token (linear with prompt length), Remotion renders at ~1× realtime on this host (linear with duration). None of the cost axes have non-linear surprises at 20×.
2. **"What happens if Claude makes up a URL that 404s?"**, Claude only writes a URL when it's embedding the source `link` in the scene plan; the link is injected directly from the RSS item, not invented. Outside of that, no URL scenes exist. Would matter if I added a BrowserReveal that invented a URL.
3. **"How do you know this is secure?"**, Three layers: Telegram secret-token on the webhook (Telegram signs every request); user allowlist on both WF1 and WF2; Error Notifier reports attempts to owner-only. Tokens in encrypted n8n credential store. That said: bot-token is the weakest link; if it leaks, allowlist is the last line of defense.
4. **"What's the one thing you'd fix first if this was a product?"**, The cost ceiling enforcement (`MAX_COST_PER_RUN_USD`). A runaway can burn hundreds before anyone notices. 20 minutes to add.
5. **"If Anthropic doubled prices tomorrow?"**, Bill doubles on the Claude component. Still viable at < $0.50/reel. ElevenLabs is still 77% of cost, so the total budget doesn't 2×.
6. **"What if the 6 AI companies stop publishing blog posts?"**, Fall back to Google News RSS. Already used for Anthropic + Meta today. Not a hard break.
