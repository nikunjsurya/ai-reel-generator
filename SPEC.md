# AI Reel Generator — Spec

CSC AI Solutions Engineer take-home, Option 3.

## What It Does

Turns a Telegram prompt like `/reel recent AI updates` into a finished 90-second 9:16 Instagram Reel, with a human approval step in the middle. Flow A researches recent posts from official AI-company RSS feeds, picks three candidates, presents them as Telegram cards with approve buttons. On approval, Flow B renders a reel via the existing Shorts Factory pipeline and delivers the MP4 URL back via Telegram DM. Multi-platform publishing to Instagram, Facebook, and TikTok is optional and gated behind a `publish=true` flag (Upload-Post aggregator). A third tiny workflow exposes a `/status` command for heartbeat monitoring.

## Architecture (Three Workflows)

1. **Workflow 1 — Research + Approval (Flow A).** Telegram trigger, RSS fetch, Claude rank, scene-plan per candidate, Telegram preview cards with inline buttons, state stored for Flow B.
2. **Workflow 2 — Render + Deliver (Flow B).** Telegram callback trigger, ElevenLabs TTS, og:image B-roll fetch, Remotion render, eval gate, deliver MP4 via Telegram, optional Upload-Post publish.
3. **Workflow 3 — Heartbeat.** `/status` command queries n8n executions API and replies with run counts, failure reasons, recovery stats.

Diagram: `docs/walkthrough.excalidraw` after Phase 4.

## External Dependencies

| Service | Purpose | Key needed by phase |
|---|---|---|
| n8n (localhost:5678) | Orchestrator | Phase 0 (confirmed live) |
| Telegram Bot API | Trigger + approval + delivery | Phase 1 |
| Anthropic API (Claude) | Filter/rank + scene planning | Phase 1 |
| ElevenLabs API | TTS with word-timestamps | Phase 2 |
| Shorts Factory (existing) | Remotion render | Phase 2 |
| Upload-Post API | Multi-platform publish | Phase 4+ (optional) |

## Explicit Assumptions (Packet Rule: "State And Proceed")

1. **Input.** Prompt arrives as a Telegram message to a registered bot (webhook-based under the hood). Natural-language topic domains like "recent AI updates" are supported. A web form and native webhook POST are straightforward variants of the same trigger and not rebuilt separately for v1.
2. **Visuals.** Primary visuals are procedural scenes rendered via Remotion (the existing Shorts Factory engine): typography, data visualization, brand-aware motion graphics. Article `og:image` hero + brand logo are composed in as B-roll where relevant. No AI-generated imagery in v1. Rationale: deterministic output, lower failure surface, lower cost, better platform retention than AI stock footage.
3. **Delivery.** Primary output is a downloadable MP4 URL delivered via Telegram DM. Publishing to Instagram, Facebook, and TikTok is optional, gated by a `publish=true` flag, and uses Upload-Post as aggregator. Native TikTok publishing requires a 5-10 business-day audit approval, outside the 2-3 day timebox.
4. **Cost and throughput.** Designed for low-volume demo use: target ~$0.30/reel all-in (Anthropic ~$0.03 + ElevenLabs ~$0.27), ~45-60s Flow A latency, ~45-90s Flow B render time. Per-run hard cost ceiling configurable via env var.

## Trigger Surface

- Primary: Telegram Bot Trigger (webhook-based; user sends `/reel <topic>` or a plain message)
- Secondary (optional, v2): cron trigger that DMs the user 3 story candidates at a fixed daily time
- Manual (dev/debug): n8n's built-in test execution with a sample payload

## Flow Breakdown

### Workflow 1: Research + Approval

| # | Node | Type | Origin |
|---|---|---|---|
| 1 | Telegram Trigger | `telegramTrigger` | Lift from Autopilot Approval Handler |
| 2 | Parse Command | `code` | New |
| 3 | Fetch All RSS Feeds | `code` (parallel `helpers.httpRequest`) | Lift from Autopilot Draft Generator |
| 4 | Normalize & Dedupe | `code` | Lift |
| 5 | Build Filter Prompt | `code` | Lift |
| 6 | Claude Rank | `httpRequest` to Anthropic | Lift pattern |
| 7 | Select Top 3 | `code` | Lift |
| 8 | Build Scene-Plan Prompt | `code` | New (maps to Shorts Factory schema) |
| 9 | Claude Scene Plan | `httpRequest` to Anthropic | New |
| 10 | Parse Scene Plans | `code` | New |
| 11 | Format Telegram Preview Cards | `code` | Lift |
| 12 | Send Drafts to Telegram | `httpRequest` | Lift |
| 13 | Store for Approval | Workflow Static Data write | Lift |

### Workflow 2: Render + Deliver

| # | Node | Type | Origin |
|---|---|---|---|
| 1 | Telegram Button Click | `telegramTrigger` (callback_query) | Lift from Autopilot Approval Handler |
| 2 | Parse Callback | `code` | Lift |
| 3 | Acknowledge Click | `httpRequest` (answerCallbackQuery) | Lift |
| 4 | Approved? | `if` | Lift |
| 5 | Load Stored Content.json | Workflow Static Data read | New |
| 6 | ElevenLabs TTS | `httpRequest` | New |
| 7 | Fetch og:image B-roll | `httpRequest` + `code` parse | New |
| 8 | Write Assets to Shorts Factory | `executeCommand` | New |
| 9 | Remotion Render | `executeCommand` (`npx remotion render`) | New |
| 10 | Eval Gate | `code` | New |
| 11 | Publish? | `if` | Lift pattern |
| 12 | Upload-Post Publish (gated) | `httpRequest` | New (stubbed until account) |
| 13 | Notify Telegram | `httpRequest` (sendMessage) | Lift |
| 14 | Error Handler (cross-cutting) | `code` + `httpRequest` | Lift + extend |

### Workflow 3: Heartbeat

| # | Node | Type |
|---|---|---|
| 1 | Telegram Trigger `/status` | `telegramTrigger` |
| 2 | Query n8n Executions API | `httpRequest` |
| 3 | Summarize | `code` |
| 4 | Reply to Telegram | `httpRequest` |

## Error Handling Strategy

Per-node retry with exponential backoff (n8n built-in: 3 retries, 2s base, 60s cap). Every HTTP Request node has an "On Error" path routing to a shared Error Handler that:

1. Classifies error by type (auth, rate-limit, timeout, validation, safety-filter, missing-asset, render-fail).
2. Looks up a smart message template keyed by error type.
3. Sends a Telegram DM with: which step failed, why (parsed, no stack traces), what to do next.
4. Logs to `run.json` with timestamp + error payload + retry count.
5. For auto-recoverable errors (429, transient 5xx, og:image miss), falls back to a safe default (cached feed, backoff retry, brand logo) and continues.
6. For blocking errors (auth fail, render crash, eval gate fail), halts and surfaces clearly.

Error message template examples:
- `ElevenLabs 401 unauthorized. Your API key is invalid or expired. Update in n8n Credentials > "ElevenLabs API" and retry.`
- `Anthropic rate-limited. Retrying in 90s automatically. If this fails, try again in 10 minutes.`
- `Remotion render failed: missing narration.mp3. The TTS step likely didn't write the file. Tap retry to re-run from TTS.`
- `og:image fetch failed for anthropic.com/news. Using brand logo as fallback. Reel will still render.`

## Scalability Definition

Five axes, each with a v1 target and a v2+ path:

1. **Throughput.** v1: 1 concurrent reel per n8n instance (default main mode). v2 path: n8n Queue Mode with Redis + N workers gives N parallel Flow B runs. Bottleneck then shifts to Remotion render CPU, not n8n itself.
2. **Cost.** v1: ~$0.30/reel. Hard per-run ceiling via `MAX_COST_PER_RUN_USD` env var. v2 path: cache prompt responses by content-hash, downshift to Haiku for filter-and-rank.
3. **Cross-brand.** v1: single `default` config; `brand_id` accepted as input and routed through Shorts Factory's existing `brand` schema field. v2 path: drop a YAML entry per brand, no code change.
4. **Catalog.** v1: RSS source list in a single Code node. Scene catalog already parameterized in Shorts Factory. Adding a source = one line; adding a scene = one Remotion React component.
5. **Observability.** v1: `run.json` per execution + `/status` Telegram command summarizing last 50 runs. v2 path: a local dashboard (marked out-of-scope for v1) reading n8n executions API + run.json.

## Security Checklist

1. **Secrets.** All API keys live in n8n Credentials (encrypted at rest) or `.env` (gitignored). No keys in Code node source. Telegram error replies strip any credential-like strings before sending.
2. **Input validation.** Telegram `message.from.id` is checked against an allowlist of user IDs before any downstream processing. Prevents abuse if the bot token leaks.
3. **Prompt injection defense.** User-supplied text passed to Claude is wrapped in a delimiter block, and the system prompt explicitly instructs the model to ignore injection attempts. Outputs validated for schema conformance before use.
4. **External-URL safety.** RSS fetch is allowlist-only (hardcoded to the 8 official AI-company domains). og:image fetch has a 10s timeout, 5MB size cap, and rejects redirects to private IP ranges (SSRF protection).
5. **Output hygiene.** MP4 URLs signed with short-TTL (24h). `run.json` logs omit raw request bodies containing API keys.
6. **Telegram bot hardening.** Bot token scoped minimally; no admin commands; webhook uses Telegram's secret-token header (`X-Telegram-Bot-Api-Secret-Token`) for inbound verification.

## Testing Strategy

Three phases, run in order. Do not proceed to the next until previous passes.

### Phase A — Happy Path (baseline)

1. Send `/reel recent AI updates` to Telegram bot
2. Receive 3 preview cards within 60s
3. Tap Approve on card B
4. Receive MP4 URL within 90s
5. Verify MP4: 9:16 aspect, ~90s duration, audio synced to captions, renders without visible artifacts

### Phase B — Edge Cases + Error Handling (after happy path green)

| Scenario | Expected behavior |
|---|---|
| Anthropic API down / 429 | Retry with backoff; if exhausted, Telegram error with next-steps |
| ElevenLabs auth fail | Telegram error: "update ElevenLabs credential and retry" |
| RSS feed 404 for one source | Skip that source, continue with others; note in `run.json` |
| All RSS fetches fail | Fall back to last-known-good cached feed set |
| Scene-plan JSON malformed | Retry with stricter structured-output prompt; fail loudly after 2 retries |
| `og:image` fetch fails | Fall back to brand logo; reel still renders |
| `og:image` oversized (>5MB) | Reject, fall back to brand logo |
| Remotion render crashes | Telegram error with last-50 lines of stderr |
| Eval gate fails (aspect wrong) | Halt, Telegram error, do not "deliver" a broken reel |
| Rejected story (user taps Cancel) | Clean exit, "rejected" DM, no downstream calls |
| Duplicate Telegram callback | Idempotency check on `job_id`; skip duplicate |
| Unknown Telegram user messages bot | Silent drop (user_id allowlist) |
| User spams bot | Per-user rate limit (1 concurrent reel) |
| Safety-filter refusal on Claude | Sanitize + retry once; if still blocked, Telegram error "rephrase prompt" |

### Phase C — Cost + Latency Measurement

Run 5 real prompts end-to-end. Record per-run cost (Anthropic + ElevenLabs) and latency (Flow A + Flow B). Must land within ~$0.30/run and ~2-3 min total targets.

## Out Of Scope (v2+)

- Brand-config implementation (hook exists, only `default` shipped)
- AI-generated imagery (Veo/Kling/Higgsfield per-scene)
- Deep article scrape (charts, product screenshots)
- Live dashboard UI
- Daily cron secondary trigger
- TikTok native publishing (5-10 day audit)
- Multi-voice A/B
- Instagram auto-publish beyond aggregator

## Success Criteria (Submission)

1. Working end-to-end demo: Telegram → MP4 delivered, from a single fresh prompt, on camera
2. At least 3 edge-case recoveries demonstrated on Loom
3. README with the four explicit assumptions stated
4. Excalidraw diagram of architecture in AMZ Prep style
5. 10-15 min Loom covering what / setup / decisions / what I'd do differently
6. AI Questionnaire (9 questions) answered honestly based on what actually shipped
7. All code + workflows in git, no secrets committed
