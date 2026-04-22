# Handoff — AI Reel Generator

Pick up from a remote session without losing context.

Last updated: 2026-04-22 (after Phase 0-3 build).

## What Exists Right Now

### Git repo
- Local: `c:/Users/surya/Projects/ai-solutions-engineer-packet/ai-reel-generator/`
- Branch: `master`
- Last commit: `938115b  Phase 0: scaffold ai-reel-generator spec and env template`
- All secrets in `.env.local` (gitignored)

### n8n credentials (live on localhost:5678)
| Name | Type | ID |
|---|---|---|
| Telegram Bot (Reel Generator) | telegramApi | `ihE8kLHbSM2bjgkF` |
| Anthropic API (Reel Generator) | httpHeaderAuth (x-api-key) | `13AmSSsFFfMs4udQ` |
| n8n API (Reel Generator) | httpHeaderAuth (X-N8N-API-KEY) | `a1nRoL2zOqdJjEvJ` |
| ElevenLabs API (Reel Generator) | **NOT YET CREATED — see TODO below** | |

### n8n workflows (inactive, localhost:5678)
| Workflow | ID | Nodes | State |
|---|---|---|---|
| 01 Research + Approval | `mj5qMn2qpB6XK60b` | 13 | Inactive, needs activation |
| 02 Render + Deliver | `SdW3hhoLhOXFfoQQ` | 15 | Inactive, ElevenLabs cred TODO |
| 03 Heartbeat | `I9qWpf1FZxTJoe35` | 5 | Inactive, ready to activate |

## What's Stubbed / Needs You On Return

### 1. Create ElevenLabs credential in n8n (2 min)

The ElevenLabs key is in `.env.local` but was not automated into an n8n credential (it has a different auth shape than n8n's built-in handling expects for audio/mpeg binary responses).

Steps:
1. Open n8n at http://localhost:5678
2. Go to Credentials → New → **Header Auth**
3. Name: `ElevenLabs API (Reel Generator)`
4. Header name: `xi-api-key`
5. Header value: your ElevenLabs key (already in `.env.local` on disk)
6. Save

Then open Workflow 2 → **ElevenLabs TTS** node → replace the placeholder value in the `xi-api-key` header with a credential reference (click the slider for `Generic Credential Type` and pick `Header Auth`, select the credential you just made).

### 2. Verify the Remotion Render node shell command (5 min)

The `Remotion Render` Execute Command node in Workflow 2 uses a PowerShell one-liner:

```powershell
cd 'C:/Users/surya/Projects/shorts-factory'; $json = @'
{{ final_content_json_str }}
'@; Set-Content -Path "content/{{ job_id }}.json" -Value $json -Encoding utf8; node scripts/batch-render.mjs "content/{{ job_id }}.json"
```

n8n on Windows defaults Execute Command to `cmd`, not PowerShell. Two fixes possible:
- **Option A (simpler):** change the node to run `cmd /c "powershell -Command <above>"`.
- **Option B (more robust):** split into two nodes: a "Write content.json" **Read/Write File** node before it (binary from a Code node that sets `$binary.data = Buffer.from(json_str)`), then an Execute Command node that only runs `node scripts/batch-render.mjs content/{jobId}.json`.

Recommended: Option B. Let me know and I'll make the edit via MCP.

### 3. Activate the workflows

n8n does not auto-activate newly-created workflows. In the UI:
- Open each of the 3 workflows
- Toggle **Active** switch top-right

**Activation order matters:** activate Workflow 1 first (it registers the Telegram webhook for `message` updates). Then Workflow 2 (registers webhook for `callback_query`). Then Workflow 3.

If n8n is **not** exposed publicly (localhost only), the Telegram webhook registration will fail silently. Check by: message the bot → no reaction = webhook not registered.

Workaround: run `n8n start --tunnel` instead of plain `n8n start`. This gives you a free public tunnel URL that Telegram can reach. Existing LinkedIn Autopilot workflows also use this mechanism successfully, so the pattern is already proven.

## Happy Path Test (~5 min after return)

1. All 3 workflows activated, ElevenLabs credential wired in Workflow 2
2. Open Telegram, message your bot: `/reel recent AI updates`
3. Within ~60s: expect 3 preview cards posted back to you with inline Approve/Reject buttons
4. Tap **Approve A** (or B, or C)
5. Within ~90s: expect a reply saying `Reel rendered. Path: C:/Users/surya/Projects/shorts-factory/out/<jobId>.mp4`
6. Open that MP4 in a player to verify it's a 9:16 90-second reel

If any step fails, open n8n at http://localhost:5678, click **Executions**, find the failing one, click it to see which node errored and why.

## If Things Break

### Symptom: bot doesn't respond at all
- Workflows inactive → activate them
- Telegram webhook not registered → restart n8n with `n8n start --tunnel`
- Bot token wrong → check credential `ihE8kLHbSM2bjgkF`

### Symptom: cards come back but wrong content
- Claude API key invalid → check credential `13AmSSsFFfMs4udQ`, bump tier if rate-limited
- RSS feeds all down → the Fetch All RSS Feeds Code node has per-source try/catch, but if all 6 fail, Normalize & Dedupe throws "No fresh stories"

### Symptom: approval tap works but render fails
- Remotion render shell command broken on Windows → see "Option B" above
- ElevenLabs credential missing → see "TODO #1" above
- Shorts Factory broken at its own level → run `cd shorts-factory && node scripts/batch-render.mjs content/opus-4-7.json` manually to verify baseline

### Symptom: MP4 produced but Telegram reply broken
- Chat ID missing → the Load Stored Job node carries `chat_id` from the original callback; verify execution data in n8n

## Coming Back To This From A Remote Session

Reconnect flow:
1. Pull latest: this repo has SPEC.md + HANDOFF.md + `.env.example`. Secrets are in `.env.local` which is NOT in the repo (gitignored). You will need to copy `.env.local` manually from the origin machine, OR regenerate tokens on the remote machine (Telegram Bot token is reusable anywhere, Anthropic key is reusable anywhere, n8n API key is per-instance).
2. Open this HANDOFF.md for the current state.
3. In a new Claude Code session, say: "Pick up AI Reel Generator handoff. n8n-mcp is enabled. Check health." I will run the health check and list workflows, confirm the 3 workflow IDs match this doc, then tell you what to do next.
4. Most likely next actions on resume: wire ElevenLabs credential, fix the Remotion Render node (Option B), activate workflows, run the happy path test.

## Remaining Phases After Happy Path

- **Phase 5B (edge cases):** once happy path is green, run the 14-scenario test grid in SPEC.md Section "Testing Strategy / Phase B"
- **Phase 5C (cost + latency):** run 5 reels end-to-end, record per-run cost + time, target $0.30 and 2-3 min
- **Phase 4 (README + Excalidraw):** synthesize from SPEC.md + HANDOFF.md into a single README matching the AMZ Prep diagram style
- **Phase 6 (Loom + AI Questionnaire):** 10-15 min recording, 9 questionnaire questions answered based on what actually shipped

## Architecture Recap

- **Workflow 1** listens on Telegram, parses `/reel <topic>`, pulls from 6 official AI-company RSS feeds, ranks with Claude Haiku, generates Shorts-Factory-compatible scene plans with Claude Sonnet, posts 3 preview cards back to Telegram, and stores candidates in Workflow Static Data under `{job_id}` for up to 24h.
- **Workflow 2** listens on Telegram callback_query, retrieves the approved candidate from Workflow 1's stored state, calls ElevenLabs for narration MP3, fetches the article's og:image for B-roll, writes content.json + narration.mp3 into Shorts Factory's directory structure, invokes `node scripts/batch-render.mjs` to render the 9:16 reel via Remotion, and DMs the MP4 path back to Telegram.
- **Workflow 3** listens for `/status`, queries the n8n Executions API for the last 50 runs of workflows 1 and 2, and replies with a plain-text heartbeat (total / success / failed / running / recent failures).

State flow between Workflow 1 and 2 uses `$getWorkflowStaticData('global').jobs[jobId]` which is shared globally across workflows on the same n8n instance. Jobs older than 24h are pruned on each Workflow 1 run.

## Security Notes (Live State)

- `.env.local` gitignored and untracked
- All 4 API keys live in n8n Credentials (encrypted at rest)
- Telegram user allowlist enforced: only user_id `6272541552` accepted (in both workflows' Parse Callback/Command nodes)
- No tokens in any committed file; the Phase 0 SPEC stated this and it holds
