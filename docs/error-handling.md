# Error Handling Matrix

Walking log of every error path in the ai-reel-generator pipeline, what class
it is, where it's caught, and the design decision behind the response. Keep
this next to you during the Loom, it's the concrete backing for "Priority 2:
Error handling" on the evaluation rubric.

## Legend

- **Class**: kind of failure (auth, rate limit, validation, timeout, data, infra, UX)
- **Where**: node name (workflow:node) or file path
- **Decision**: what happens + why that choice (not just "we catch it")
- **User signal**: does the user see something, and what

## Matrix

### 1. Authentication

| Error | Where | Decision | User signal |
|---|---|---|---|
| Unauthorized Telegram user | WF1:`Parse Command + Authorize` + WF2:`Parse Callback + Authorize` | Hardcoded allowlist check on `msg.from.id`; throws on mismatch. Error is caught by the Error Notifier workflow which DMs the hardcoded owner chat ID only, the attacker receives nothing. Silent from the attacker's perspective; owner gets an audit trail of who tried what. Strict allowlist chosen over API-key-style auth because Telegram is the trigger, if bot token leaks, allowlist is the only remaining line of defense. | None to attacker; owner gets DM via Error Notifier |
| Invalid ElevenLabs key | render-bridge `/narration` | Returns `{ok:false, error:"ElevenLabs 401"}` with 502 status; caller surfaces via Error Notifier. Key lives in env var, not workflow JSON, so rotation is a process restart, not a workflow edit. | Telegram DM via Error Notifier |
| Invalid Anthropic key | WF1:`Claude Rank` / `Claude Scene Plan` (httpRequest with credential) | Credential resolved from n8n's encrypted store; 401 triggers `retryOnFail: true, maxTries: 3` (usually transient in practice) → Error Notifier. | Telegram DM via Error Notifier |
| Missing Telegram secret token | n8n native webhook check | Returns 403 before any node runs. Bot's secret_token is auto-set to `<workflowId>_<nodeId>` on webhook registration. | Nothing (Telegram retries) |

### 2. Rate limits

| Error | Where | Decision |
|---|---|---|
| Anthropic 429 | `Claude Rank` + `Claude Scene Plan` | `retryOnFail: true, maxTries: 3, waitBetweenTries: 2000ms` (exponential via n8n built-in). Haiku-first for ranking keeps spend low; Sonnet only on top 3 candidates. |
| Telegram 429 on setWebhook | WF1/WF2 activation | Python activate script retries up to 5 times with 3s sleep. Telegram rate-limits setWebhook per-bot-per-minute; two workflows activating in quick succession trigger this. |
| ElevenLabs quota | render-bridge `/narration` | Surfaces 402/429 as `{ok:false, error}`. No auto-retry here, quota is usually absolute, not transient. Error Notifier DMs the user. |

### 3. Upstream service failures

| Error | Where | Decision |
|---|---|---|
| RSS feed 404 (Anthropic, Meta) | WF1:`Fetch All RSS Feeds` | Per-source try/catch. One dead feed ≠ dead run. Since Anthropic + Meta killed their official feeds, those two explicitly route through Google News RSS search as a permanent fallback. |
| All RSS feeds fail | WF1:`Fetch All RSS Feeds` → `Normalize & Dedupe` | Normalize & Dedupe throws "No fresh stories after normalize", caught by Error Notifier. This is the "entire upstream is down" case; graceful degradation not possible beyond "tell user". |
| og:image fetch fails | render-bridge `/broll` | Returns `{ok:false}` with 200 status (expected failure mode, not an error). Downstream in `Build Final Content` leaves `brollSrc` null → `BrollClip` beat is not swapped in → reel still renders, just without the imagery moment. |
| Article page 403 | render-bridge `/broll` | Decoded browser-like header set (openai.com required this) solves it for 6/6 known sources. Unknown publishers fall through to `{ok:false}` → graceful skip. |

### 4. Data validation

| Error | Where | Decision |
|---|---|---|
| Claude returns non-JSON text | WF1:`Parse Scene Plans` / `Select Top 3` | Regex extracts first `{...}` / `[...]` block; JSON.parse in try/catch; throws explicit error with first 200 chars of Claude's actual response. Explicit error > silent failure. |
| Claude emits hex color instead of palette key | WF2:`Build Final Content` sanitizer | RGB-distance match to nearest palette key. `#10A37F` → `green`. Zod still accepts. |
| Claude invents SFX hint not in catalog | WF2:`Build Final Content` sanitizer | Whitelist check against 40-name SFX catalog. Invalid names dropped. If a beat ends up with 0 valid hints, scene-default hint kicks in (`VersionReveal` → `whoosh_long`, `CTAOutro` → `success_fanfare`, etc.) so every beat has at least one audible marker. |
| Invalid severity enum | same sanitizer | Coerces `"high"` or unknown strings to `"MED"` default. |
| Invalid comparison.winner | same sanitizer | If not `"left"` or `"right"`, deleted (scene renders neutral). |
| Job file reads malformed JSON | WF2:`Load Stored Job` | Parse in try/catch; throws with job_id context. Rarely fires, job files are written by our own code, so corruption would indicate disk issue. |

### 5. State / concurrency

| Error | Where | Decision |
|---|---|---|
| `$getWorkflowStaticData('global')` doesn't cross workflows in n8n 2.x | Discovered during first approve test; root cause of initial render failures | Replaced with filesystem state at `/project/jobs/<jobId>.json`. WF1 writes, WF2 reads. Also inspectable from shell, huge debugging win over opaque DB state. |
| Cross-workflow data loss (telegramTrigger output replaces input) | Hit after adding `Send Acknowledgement` node | Downstream nodes now reference `$('Parse Command + Authorize').first().json` by name instead of `$input.first().json`, so the original context survives any node that rewrites its output. |
| Telegram bot allows only one webhook URL | Discovered when three workflows tried to register independently | Unified: WF1 owns the webhook for both `message` and `callback_query` updates; callback_query events are routed via an Execute Workflow call into WF2. WF2's telegramTrigger is `disabled`. |

### 6. Timing / infrastructure

| Error | Where | Decision |
|---|---|---|
| Remotion render > 10 min | render-bridge `/render` | `execFile` timeout of 600_000ms. Beyond that, Remotion is hung, we surface the timeout via stderr_tail. |
| `n8n-nodes-base.executeCommand` disabled | n8n v2 default: in `NODES_EXCLUDE` for security | Explicitly set `NODES_EXCLUDE=[]` when recreating the n8n container. Risk is contained because the exec command is replaced by an HTTP call to render-bridge, n8n doesn't actually run shell commands. |
| `/project` mount not writable by readWriteFile | n8n v2 default: `N8N_RESTRICT_FILE_ACCESS_TO='~/.n8n-files'` | Set `N8N_RESTRICT_FILE_ACCESS_TO=/project` to whitelist the bind mount. Discovered Git Bash's `MSYS_NO_PATHCONV` munges the value silently, docs now say to set `MSYS_NO_PATHCONV=1` before docker run. |
| Cloudflared quick-tunnel URL rotation | `cloudflared` container restart | `scripts/reel-watchdog.sh` polls both `/health` endpoints every minute (optional Task Scheduler entry). If tunnel URL drifted, recreates n8n container with fresh `WEBHOOK_URL`. |
| render-bridge process dies | external process, no auto-restart built-in | Watchdog also relaunches it. This is a documented known-fragile, production would use PM2 / systemd / Windows Service instead. |

### 7. UX edges

| Edge case | Where | Decision | User signal |
|---|---|---|---|
| Stale callback_id (user taps Approve > 30s after cards arrive) | WF2:`Acknowledge Click` | `continueOnFail: true` + n8n's `onError: continueRegularOutput`. Telegram returns 400 for stale IDs; we log and keep going. The render + delivery still completes. | None (by design; silent handling) |
| Zero topic-match stories | WF1:`Select Top 3` | Does NOT throw. Sends a friendly DM with per-source counts ("huggingface: 15, openai: 15, ... anthropic: failed [404]") and suggested broader topics. Returns `[]`, ending the flow cleanly, no error notifier. | Friendly Telegram DM |
| User taps old/already-rendered card | WF2:`Read Job File` | If job file exists, re-renders with same content, idempotent. Uses the same narration/captions/video path (re-overwrites). | Fresh MP4 delivered |
| MP4 file not produced by Remotion | render-bridge `/render` | Post-execution check: `existsSync(mp4Path)`. If missing, returns 500 with stdout_tail + stderr_tail. Error Notifier surfaces. | Telegram DM via Error Notifier |

## Honest gaps (we haven't handled these yet)

These are the things you need to name in the Loom as "what I'd do differently with more time", not pretend are covered.

1. **No per-user concurrency lock.** If you `/reel A` then `/reel B` within 10s, both run in parallel and can clobber each other's narration MP3 on disk (same voice but different content, not catastrophic, but messy). Fix: filesystem mutex at `/project/jobs/locks/<user_id>.lock`. ~15 min to add.

2. **No idempotency check on repeat `/reel <same-topic>`.** User can spam the same topic and get fresh Claude calls each time, burning tokens. Fix: scan recent `/project/jobs/*.json` for same topic within last hour; if found, confirm before regenerating. (Implementing below per your ask.)

3. **No mid-flight cancel.** Once `/reel` is sent, the RSS → Claude → send-cards chain runs to completion; user can't abort. n8n doesn't expose execution cancellation from a node. Partial mitigation: `/cancel` can mark a pending job as cancelled so WF2 refuses to render on approval. (Implementing below.)

4. **Claude prompt injection.** User topic is passed into Claude via a text prompt. Right now the user is trusted (allowlist), so injection into their OWN reel is their own problem. For a public-bot future, need delimiter-wrapping + a pre-check via Haiku that the topic isn't trying to reprogram the scene planner.

5. **No cost ceiling.** SPEC says `MAX_COST_PER_RUN_USD` exists as env var but it isn't read anywhere. Fix: track input/output tokens on each Anthropic call + ElevenLabs char count; sum against a per-run cap; halt + DM if exceeded. ~20 min.

6. **No run.json for observability.** Every execution's timing / cost / outcome should be written to disk so we can audit the last 50 runs. `/status` command would query this. Currently we only have n8n's execution log.

7. **SSRF protection on og:image.** render-bridge follows redirects and fetches arbitrary URLs. Malicious RSS feed could point og:image at `http://169.254.169.254/` (AWS metadata). Fix: reject private IP ranges + redirects to non-public hosts. ~15 min.

8. **Typo on `/reel`.** User types `/rel` or `/ree`, currently silently dropped because `Parse Command + Authorize` only matches `/reel` exactly. (Fixing below.)
