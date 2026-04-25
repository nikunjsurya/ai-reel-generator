# AI Reel Generator

CSC AI Solutions Engineer take-home, Option 3. One-paragraph summary, how to run it, architecture, and honest limits.

## How I think about automation (the 60 / 30 / 10 framework)

Every automation I build splits into three layers. This project is no exception.

- **60% deterministic code.** Parsing commands, reading RSS, writing files, encoding video, delivery. The parts a computer should never get wrong.
- **30% AI-assisted.** What only an LLM does well. Claude Haiku ranks 50 stories by topic. Claude Sonnet drafts reel scripts. ElevenLabs narrates.
- **10% human judgment.** The one decision I deliberately don't automate. You pick one of three drafts. AI is confident and wrong; humans choose which truth ships.

This reel generator is 60% code, 30% Claude plus ElevenLabs, 10% you. The lens colors every pipeline node in [docs/architecture.excalidraw](docs/architecture.excalidraw).

## What this is

You text a Telegram bot a topic like `/reel recent AI updates`. The bot reads 6 official AI-company news feeds, asks Claude Haiku to pick the 3 most relevant stories, then has Claude Sonnet draft a shot-by-shot scene plan for each. It posts 3 preview cards back to you with Approve/Reject buttons. Tap Approve on one. ElevenLabs turns the script into a narrated voice track with word-level timing so captions sync exactly. Remotion (React-based) renders a 9:16 1080x1920 animated reel on the host, picking scene templates based on the story's archetype (a launch looks different from a controversy). The finished MP4 lands in your Telegram DM about 90 seconds after approval.

Sample output: ~65-90s 1080x1920 H.264+AAC MP4, ~8 beats across 5-7 scene types, ~8-11 MB on disk.

Six rendered sample reels (one A/B/C triplet showing the human-approval gate, plus three single approvals across launch / controversy / research archetypes) live in [samples/](samples/) for quick review before you build anything yourself.

## Stack at a glance

| Layer | Tool | Version / choice |
|---|---|---|
| Orchestrator | n8n (self-hosted Docker) | 2.47.14 |
| Trigger + delivery | Telegram Bot API | n/a |
| Research LLM (filter + rank) | Claude Haiku | 4.5 (`claude-haiku-4-5`) |
| Planner LLM (scene plan) | Claude Sonnet | 4.6 (`claude-sonnet-4-6`) |
| TTS | ElevenLabs Turbo v2.5 | `/with-timestamps` for word-level sync |
| Video render | Remotion | 4.x, React compositions, 30fps |
| Render bridge | Node.js HTTP server on host | custom, 6 endpoints |
| Public tunnel | Cloudflared quick-tunnel | watchdog auto-reconciles URL rotation |
| Storage | Local filesystem + Docker bind mount | Project folder mounted into n8n as `/project` |

## Run it yourself

Prereqs: Docker, Node 20+, a Telegram bot token, Anthropic + ElevenLabs API keys.

```bash
# 1. Clone + env
git clone <this repo>
cd ai-reel-generator
cp .env.example .env.local   # fill in keys
npm install                  # render-bridge + Remotion deps

# 2. Start the render bridge on host (Remotion needs direct file system + Chromium)
npm run bridge   # equivalent to: node scripts/render-bridge.mjs

# 3. Start the public tunnel
cloudflared tunnel --url http://localhost:5678

# 4. Start n8n pointed at the tunnel. Replace <PROJECT_PATH> with the absolute
#    path to this repo on your machine, <tunnel-url> with the cloudflared
#    output, and <YOUR_BOT_TOKEN> with the BotFather token (the workflows
#    resolve it via `$env.TELEGRAM_BOT_TOKEN` inside Code nodes).
docker run -d --name n8n \
  -p 5678:5678 \
  -e WEBHOOK_URL=https://<tunnel-url>/ \
  -e TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN> \
  -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
  -e NODES_EXCLUDE='[]' \
  -e N8N_RESTRICT_FILE_ACCESS_TO=/project \
  -v n8n_data:/home/node/.n8n \
  -v <PROJECT_PATH>:/project \
  n8nio/n8n:latest

# 5. Import the three workflow JSONs into n8n UI at localhost:5678
#    (Workflows menu, "Import from File"):
#      workflows/wf1.json   Research + Approval (owns the Telegram webhook)
#      workflows/wf2.json   Render + Deliver (sub-workflow invoked by WF1)
#      workflows/wf3.json   Error Notifier (n8n Error Trigger)
# 6. Wire credentials: Telegram, Anthropic, ElevenLabs, n8n API
# 7. Activate workflows. WF1 first (it owns the bot webhook)
# 8. Message your bot: /reel recent AI updates
```

## Architecture

![architecture](docs/architecture.png)

Three live components:

1. **Workflow 1: Research + Approval** (17 nodes, `mj5qMn2qpB6XK60b`). Sole Telegram webhook owner. Routes between two entry paths via `Is Callback Query?`: new `/reel` commands go to research + card generation; Approve/Reject taps are handed off to Workflow 2 via Execute Workflow.

2. **Workflow 2: Render + Deliver** (20 nodes, `SdW3hhoLhOXFfoQQ`). Sub-workflow invoked by WF1 on approval callback. Checks MP4 cache for idempotent replays (approving the same candidate twice = ~15s replay, not ~90s re-render). On cache miss, calls render-bridge for narration, captions, content write, Remotion render, and MP4 read, then posts the video back via Telegram.

3. **Error Notifier** (3 nodes, `5VGOZFBUQoW271kU`). n8n Error Trigger workflow. Both WF1 and WF2 route errors here; it classifies and DMs the user a human-readable explanation.

Render-bridge runs as a separate Node.js HTTP server on the host (port 5555) with endpoints `/health`, `/narration`, `/captions`, `/content`, `/render`, `/mp4/:id`, `/broll`. Lives outside n8n because Remotion needs direct host file-system + Chromium access, and HTTP is a cleaner escape hatch than `executeCommand` with PowerShell/cmd escaping.

Deep architecture board (9 bands, color-coded 60/30/10, reviewer-facing): [docs/architecture.excalidraw](docs/architecture.excalidraw).

## Design decisions (the 5 that matter)

1. **Two workflows, human in the middle.** Research is cheap and reversible; render is expensive and irreversible. Split them at the approval boundary so bad picks never burn render time. Feels like a feature, started as a constraint (Telegram allows only one webhook per bot).

2. **Render bridge HTTP server on host, not `executeCommand` inside n8n.** Original design called `npx remotion render` from an n8n Execute Command node on Windows. Broke in three places: cmd vs PowerShell escaping, `NODES_EXCLUDE` disabling executeCommand in n8n v2, and Windows path translation through Git Bash. HTTP to a host process sidesteps all three, is debuggable in the browser, and lets us watch renders in real time.

3. **Haiku for rank, Sonnet only for the chosen 3.** The ranking step consumes ~60 candidate stories of input. Haiku handles this cheaply (~$0.001). Sonnet is reserved for the 3 scene plans the user actually sees. If I used Sonnet everywhere, cost would be 10x and the slower Sonnet TTFT would stretch Flow A latency past a minute.

4. **Archetype classifier, not freeform prompting.** Claude with an open brief writes the same structural spine every time (VersionReveal, MockTweet, CommandPills, Terminal, CTA). Fix isn't "give Claude more freedom". Fix is to detect the topic's archetype via keyword matching first, then hand Claude a topic-appropriate scene kit with an explicit "avoid" list. Controversy reels now look different from launch reels. Implementation: [docs/template-variety.md](docs/template-variety.md).

5. **Watchdog instead of Kubernetes.** Cloudflared quick-tunnel rotates URL on restart. Render-bridge has no auto-restart. Instead of setting up cloudflared named tunnels + PM2 for a 3-day assessment, one shell script (`reel-watchdog.sh`, scheduled every minute) polls both health endpoints and auto-reconciles drift. Right tradeoff for a demo; wrong tradeoff for production.

## Error handling

Full matrix: [docs/error-handling.md](docs/error-handling.md). Seven classes: auth, rate limit, upstream service, data validation, state/concurrency, timing/infrastructure, UX edges. Every class has a catch + decision + user signal table.

Highlights worth knowing:

- **Shape-rescue sanitizer.** Claude sometimes emits `#10A37F` where the scene expects the palette key `green`, or writes `"severity": "high"` where it expects `"MED"`. The sanitizer in `Build Final Content` catches these and coerces; on unrescuable malformed shapes, it swaps the beat to a safe `VersionReveal` so the render never crashes.
- **Per-source try/catch on RSS fetch.** Anthropic and Meta have killed their official feeds; we fall through to Google News RSS for those two specifically. One dead feed isn't a dead run.
- **Allowlist over token auth.** Telegram user IDs are checked against a hardcoded allowlist in `Parse Command + Authorize` (WF1) and `Parse Callback + Authorize` (WF2). If the bot token leaks, the allowlist is the only remaining defense.
- **Composite-ID idempotency.** Every artifact is keyed `<baseJobId>_<candidateLabel>`. Approving the same candidate twice = cache hit + replay. Approving a different candidate doesn't clobber the first.

## Scalability

Full matrix: [docs/efficiency-notes.md](docs/efficiency-notes.md) + **[docs/cost-latency-measurement.md](docs/cost-latency-measurement.md)** (5 real runs) + [docs/stress-test-matrix.md](docs/stress-test-matrix.md). Summary:

- **Today (v1)**: 1 concurrent reel per n8n instance. Measured cost $0.419/reel all-in, latency 114.9s end-to-end (both averaged across 5 runs; ranges $0.37-0.50 and 100-146s). Single `default` brand. Single narrator voice.
- **Where the cost goes**: ElevenLabs 77% ($0.32), Claude Sonnet 20% ($0.08), Claude Haiku 4% ($0.02). ElevenLabs is the cost-reduction lever at scale.
- **Scale-out path**: n8n Queue Mode + Redis + N workers for throughput (no code change), content-hash Claude prompt-cache (~60% cut on Haiku since the system prompt is ~15K tokens and repeats), cost ceiling for spend, brand YAML for cross-brand, BullMQ on render-bridge for render stacking, S3 signed URLs for delivery.
- **Hard floor**: Remotion CPU on a ~65-80s reel is 45-70s on the current host. Unavoidable without GPU render or pre-rendered templates. GPU render via `@remotion/gpu` is a one-env-var change but needs a GPU host.

## What I'd do differently (honest gaps)

Nothing below is pretending to be handled. All are under an hour of work each; I scoped them out to stay within the 2-3 day brief.

1. **Eval gate after render.** A broken MP4 (wrong aspect, truncated audio) still ships. Would add a `ffprobe` check before delivery.
2. **Per-user concurrency lock.** Two `/reel` in parallel from same user = narration MP3 collision on disk. Filesystem mutex per user.
3. **Cost ceiling enforcement.** `MAX_COST_PER_RUN_USD` is named in `.env.example`, not read anywhere. Would track token counts + EL char count per run, halt + DM on cap breach.
4. **run.json observability.** Currently n8n's execution log is the only history. Would append a JSON-line per execution with timing, cost, outcome for the last 50 runs + a `/status` command to query it.
5. **SSRF protection on og:image fetch.** render-bridge follows redirects; a malicious RSS could point og:image at `http://169.254.169.254/` (AWS metadata). Would reject private IP ranges + non-public redirects.
6. **Claude prompt injection defense.** Topic is trusted today because the user is allowlisted. A public-bot future needs delimiter-wrapped topic + Haiku pre-check that the topic isn't trying to reprogram the scene planner.
7. **Mid-flight cancel.** Once `/reel` fires, the RSS + Claude chain runs to completion. `/cancel` today marks a pending job as cancelled, but can't kill an in-flight n8n execution.
8. **Topic-repeat idempotency.** User can spam `/reel <same-topic>` and get fresh Claude calls each time. Would scan recent jobs for same topic within last hour and confirm before regenerating.

## Repository layout

```
ai-reel-generator/
├── README.md              # this file, reviewer entrypoint
├── package.json           # Remotion + helpers; npm install brings the render layer up
├── tsconfig.json
├── .env.example           # env var template (real keys in .env.local, gitignored)
├── .gitignore             # excludes secrets, node_modules, runtime data (out/ jobs/ content/)
├── workflows/             # n8n workflow JSONs, importable from any n8n 2.47+ install
│   ├── wf1.json           # Research + Approval (17 nodes, owns the Telegram webhook)
│   ├── wf2.json           # Render + Deliver (20 nodes, fires on Approve)
│   └── wf3.json           # Error Notifier (3 nodes, n8n Error Trigger)
├── scripts/
│   ├── render-bridge.mjs  # host HTTP server (port 5555) bridging n8n to Remotion + ElevenLabs
│   ├── batch-render.mjs   # invoked by render-bridge to spawn `npx remotion render`
│   └── reel-watchdog.sh   # self-heal: bridge alive, tunnel URL in sync with n8n
├── src/
│   ├── index.ts           # Remotion registerRoot
│   ├── Root.tsx           # registers the AdaptiveReelDynamic composition only
│   └── adaptive/          # the entire reel render layer
│       ├── AdaptiveShort.tsx
│       ├── brand.ts       # per-brand palette + watermark config
│       ├── components/    # 13 chrome / caption / SFX components
│       ├── scenes/        # 33 scene templates the archetype router can reach
│       └── types.ts       # zod schema for adaptiveShortSchema
├── public/
│   └── sfx/               # SFX library: typing, ui, states, transitions, data, cold-open stinger
├── samples/               # 6 rendered MP4s (curated reference outputs, see samples/README.md)
└── docs/
    ├── architecture.png             # rendered architecture board (open this for the visual)
    ├── architecture.excalidraw      # editable source for the architecture board (excalidraw.com)
    ├── audit-report.md              # end-to-end verification + 14 edge cases + destructive test + fixes
    ├── cost-latency-measurement.md  # 5 real runs + cost breakdown + scaling projection
    ├── efficiency-notes.md          # where the time + cost goes, tradeoffs
    ├── error-handling.md            # 7-class error matrix + honest gaps
    ├── hallucination-defense.md     # 8-pattern framework + applied examples
    ├── stress-test-matrix.md        # 30+ known edge cases + reviewer gotcha Q&A
    └── template-variety.md          # archetype classifier design rationale
```

## Submission artifacts

- **Component A** (working build): this repo, including the exported workflow JSONs in [workflows/](workflows/) and six rendered reference reels in [samples/](samples/). Verified by the 5-run measurement in [docs/cost-latency-measurement.md](docs/cost-latency-measurement.md) and the end-to-end audit in [docs/audit-report.md](docs/audit-report.md).
- **Component B** (Loom 10-15 min): narrated video walkthrough covering what was built, setup walk by workflow, the design decisions, and the honest gaps. Framed around the 60 / 30 / 10 framework above.
- **Component C** (AI Questionnaire): attached separately to the submission email, not included in this repo.

## Full docs index

- [docs/architecture.png](docs/architecture.png): rendered architecture board, 9 bands, color-coded by 60/30/10
- [docs/architecture.excalidraw](docs/architecture.excalidraw): editable source for the architecture board, opens in excalidraw.com
- [docs/audit-report.md](docs/audit-report.md): end-to-end verification + 14 edge cases + bridge-down destructive test + shipped fixes
- [docs/cost-latency-measurement.md](docs/cost-latency-measurement.md): 5-run harness results and scaling projection
- [docs/efficiency-notes.md](docs/efficiency-notes.md): where time + cost goes, tradeoffs
- [docs/error-handling.md](docs/error-handling.md): 7-class error matrix + honest gaps
- [docs/hallucination-defense.md](docs/hallucination-defense.md): 8-pattern framework
- [docs/stress-test-matrix.md](docs/stress-test-matrix.md): 30+ known edge cases + reviewer gotcha questions
- [docs/template-variety.md](docs/template-variety.md): archetype classifier design rationale
