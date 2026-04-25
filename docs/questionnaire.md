# AI Questionnaire, Candidate Responses

Answered honestly from actual projects shipped in the last 12 months. Anchored in the AI Reel Generator (this submission) plus adjacent n8n automations running on the same instance.

---

## Section 1: AI Usage Baseline

### 1. How much time do you spend using AI tools for work-related tasks per week?

**10+ hrs.** Practically lives in Claude Code for build work, with Claude / ChatGPT / Gemini / Perplexity in browser tabs for research, ElevenLabs + Remotion for content production, and an n8n instance at localhost:5678 hosting active workflows that themselves call Claude Haiku/Sonnet on every trigger. Rough split: ~6 hrs/week orchestration + build, ~2 hrs/week content production (voice, captions, rendering), ~2+ hrs/week reading release notes, running prompt-optimization experiments, and updating my own skill + template library.

### 2. What AI tools and platforms do you actively use in your work today?

For each: **what it is**, **where it sits**, **level of involvement** (configure/build vs use as-is).

| Tool | What it is | Where it sits | Involvement |
|---|---|---|---|
| **Claude Code** (Anthropic CLI) | Primary IDE + agent for build work | Daily driver. Runs plans, scaffolds repos, executes multi-step refactors | Build, custom skills, hooks, slash-commands, status line; authored my own reusable skills for brainstorming, multi-agent software orchestration, autoresearch-style prompt optimization, and several project-specific content-pipeline skills |
| **Anthropic API (Claude Haiku + Sonnet)** | LLM calls inside n8n workflows | Haiku ranks RSS items cheaply; Sonnet generates scene plans / post drafts / scripts | Build, prompt design, JSON-structured output contracts, token-budget tuning |
| **n8n (self-hosted Docker)** | Workflow orchestrator | Hosts 3 active Reel Generator workflows plus other personal automations on the same instance (a LinkedIn draft generator, a YouTube research pipeline) | Build, authored every node; solved cloudflared tunnel rotation, cross-workflow state via filesystem, Telegram webhook routing |
| **ElevenLabs Turbo v2.5** | Voice cloning + TTS with word-level timestamps | Voices every piece of AI-generated content in my voice clone | Build, integrated via a custom HTTP render-bridge, used `/with-timestamps` to drive word-synced captions |
| **Remotion** | React-based programmatic video rendering | Renders all shorts + long-form + reels at 1080×1920 9:16 30fps | Build, authored 33 scene components, adaptive beat-driven composition, SFX layer, brand header system |
| **Telegram Bot API** | Trigger + delivery + approval UI | Entry point for `/reel`, `/post`, `/status`; approval taps; MP4 delivery | Build, single-webhook setup across multiple workflows; inline keyboards; callback routing |
| **cloudflared** | Quick-tunnel for localhost → public HTTPS | Exposes n8n webhook to Telegram | Build, wrote a self-healing watchdog (`reel-watchdog.sh`) that reconciles URL rotation against n8n's `WEBHOOK_URL` env |
| **NotebookLM API** | Long-form source synthesis (50+ YouTube videos → report) | Feeds my content pipeline, 50 videos → report → author's-voice rewrite → voice → B-roll | Build, reverse-engineered the API for programmatic notebook creation / source add / audio generation |
| **Midjourney + Higgsfield** | Image + video generation (MJ for hero imagery, Higgsfield for motion) | Visual layer for content channels when stock footage won't cut it | Build, production-tested Higgsfield automation (797 lines), integrated into the visual pipeline |
| **Gemini CLI** | Secondary research LLM | Non-interactive research calls from shell scripts and content pipelines | Configure, pipe + heredoc only, never interactive |
| **crawl4ai / Playwright** | Web scraping fallback when API unavailable | Feeds research into brand briefs, competitor analyses | Configure + tune |
| **yt-dlp + youtube-transcript-api** | YouTube data ingestion | Downloads + transcripts for the content research pipeline | Configure |
| **Obsidian (MCPVault)** | Second brain / knowledge graph | Every project has an `_index.md`; MOCs; tacit-knowledge capture | Build, structured frontmatter schema, wikilinks, weekly synthesis loop |
| **LightRAG** | Local knowledge graph + RAG | Ingested the full Obsidian vault + 20 YouTube video transcripts (3375 nodes) | Build, configured, ingested, queried |
| **Paperclip** | Agent orchestration / governance | Experimenting as a coordination layer for multi-agent content ops | Configure, running v0.3.1 with `claude_local` adapter |

I build with each of these, not just call them. No "used it once" entries.

---

## Section 2: AI Fluency & Judgment

### 3. Describe one AI-powered automation you personally built or redesigned.

**The AI Reel Generator**, the project in this submission.

**Problem:** Producing a single shippable 60-90s social reel about recent AI news manually took me 2-4 hours: reading feeds, picking a story, scripting, recording voiceover, cutting, captioning, exporting. Doing this daily across three channels wasn't going to happen by hand, and off-the-shelf AI video tools produce content that is both visually generic and factually untethered from current news.

**Tools involved, end to end:**
- **Telegram Bot API**, trigger (`/reel <topic>`), approval UI (inline Approve/Reject buttons), delivery (MP4)
- **n8n (self-hosted)**, 3 workflows: Research+Approval (17 nodes), Render+Deliver (20 nodes), Error Notifier (3 nodes)
- **6 official AI-company RSS feeds**, OpenAI, Anthropic, Google DeepMind, Hugging Face, Meta AI, Mistral; Anthropic + Meta fall back to Google News
- **Claude Haiku 4.5**, ranks ~50 deduped stories against the topic for ~$0.001/call
- **Claude Sonnet 4.6**, scene-plans the top 3 (parallel, one per candidate)
- **ElevenLabs Turbo v2.5 `/with-timestamps`**, narration MP3 + word-level timing
- **Remotion (React)**, 1080×1920 9:16 render at 30fps; 33 scene components; archetype-driven scene kits
- **A custom Node.js HTTP bridge on port 5555**, escape hatch so Remotion + ElevenLabs run on the host, not inside the n8n container
- **cloudflared**, tunnels the n8n webhook for Telegram

**Inputs:** one natural-language topic string from Telegram (e.g. `/reel google deepmind gemini release`).

**Outputs:** 3 candidate preview cards with beat summaries → 1 approved candidate → 1 MP4 (~8-11 MB, ~65s, 1080×1920 H.264 + AAC, word-synced captions) delivered to Telegram.

**Measurable outcomes from the 5-run measurement in `docs/cost-latency-measurement.md`:**
- **Latency**: avg 101.6s end-to-end (range 94-109s), vs 2-4 hours manual. Flow A (research + cards) averages 30.6s; Flow B (render + deliver) averages 71.0s.
- **Cost**: avg $0.375 per reel (range $0.35-0.41). Breakdown: Haiku ranking $0.016 (4%), Sonnet planning $0.072 (19%), ElevenLabs narration $0.288 (77%).
- **Cache-replay**: 3.1 seconds when re-approving a previously-rendered candidate, 25× speedup vs fresh render.
- **Throughput**: predictable ±8% band across 5 varied topics. System is consistent, not lucky.
- **Manual editing steps for a shippable reel**: 0. Captions, pacing, transitions, brand colors, SFX all determined by the scene plan.

Published to: `ai-solutions-engineer-packet/ai-reel-generator/` (this repo).

### 4. What is the most complex automation you have deployed in a live environment?

**A research-to-LinkedIn pipeline I built for my own content** on the same n8n instance as the Reel Generator.

**Architecture:** a 39-node n8n workflow orchestrating a polling-based long-form research loop. High-level:

1. **Trigger**, Telegram `/research <topic>` or cron
2. **NotebookLM programmatic notebook creation**, spin up a fresh notebook via the API, add ~50 relevant YouTube sources found by yt-dlp search
3. **Polling loop**, NotebookLM takes ~5-10 min to ingest and index sources; the workflow polls `notebooks.status` every 30s until ready, with a 20-minute timeout
4. **Generate structured report**, call NotebookLM's audio-overview + Q&A endpoints to extract the research shape
5. **Hand off to author's-voice rewrite**, a second workflow consumes the report, calls Claude Sonnet via a voice-profile system template, drafts a LinkedIn-formatted post
6. **Human-in-loop approval**, post lands in Telegram with Approve/Edit/Skip buttons; user reviews; on approve, post goes to LinkedIn via Upload-Post; on edit, opens for inline revision
7. **State sharing**, job files at `/project/jobs/<jobId>.json` + n8n's workflow-static-data for intra-workflow state

**Trigger:** Telegram command or cron (daily 9am).

**Data flow:** Telegram → n8n → NotebookLM → polling loop → Claude Sonnet → Telegram approval → Upload-Post → LinkedIn. All tokens/state stored in n8n encrypted credentials or filesystem job files.

**Failure / exception handling:**
- Every HTTP node has `retryOnFail` with exponential backoff
- NotebookLM timeouts fall through to Error Notifier workflow (same pattern as Reel Generator, centralized error funnel)
- Claude safety-filter refusals route to a "rephrase and retry" path; after 2 retries → user notification
- Stale callback IDs handled with `continueOnFail: true`
- LinkedIn rate-limit (100 posts/day) tracked via a daily-quota state file

**Monitoring:**
- Error Notifier DMs me on any crash with workflow name, failing node, trimmed error, and a local logs link
- `/status` command queries n8n's executions API for recent run success/failure counts
- Cloudflared watchdog script (scheduled via Windows Task Scheduler) auto-reconciles tunnel URL rotation

**What I built vs what was built for me:**
- **I built:** every n8n node, the render-bridge, the voice-profile system, the idempotency layer, the error notifier, the watchdog, the Claude prompts, the JSON schemas, the sanitizer, all skill files, the cloudflared + Docker setup, the LinkedIn poster
- **I didn't build:** n8n itself, Claude/Anthropic API, ElevenLabs, NotebookLM, cloudflared, Remotion framework, Docker. I stand on those shoulders and wire them together.

---

## Section 3: Cross-functional Communication

### 5. Describe a time you had to understand a non-technical team's manual process and translate it into an automation.

The closest real-world parallel in my work: I decoded the **"Chase AI" YouTube format** (popular AI-tools channel, 8-12 min videos, ~20-30 cuts/minute, tool+tool+outcome narratives) and translated it into a reusable template for my own Hindi AI Channel.

**How I gathered requirements:**
- Watched 12 Chase AI videos end-to-end, time-stamped every cut, labeled every scene type
- Transcribed 3 full scripts, tagged the rhetorical moves (cold open / problem / tool intro / workflow demo / outcome / CTA)
- Pulled titles + thumbnails + view-counts from 40 videos, clustered by format archetype
- Asked Chase directly (via comments + community replies) about pacing decisions where the pattern wasn't obvious
- Re-enacted 2 full videos myself with placeholder copy to feel the rhythm

**Questions I asked:**
- "When does a cut happen, new sentence, new visual, new idea, or ambient pacing?" (answer: ambient pacing, ~2.5s avg)
- "What moves a viewer from intro to first tool within 20 seconds?" (answer: one sentence of concrete problem, then screen-share)
- "Which cuts are content cuts vs punch-in zooms?" (answer: ~60/40 split)

**How I translated it:**
- Wrote a structured spec with format-archetype schema (duration, cuts-per-min, scene-sequence template, voice-cadence target, minimum-shippable-template rules)
- Then built it into my scene catalog: 33 Remotion components that *compose* into Chase AI-style sequences deterministically
- Built the **archetype classifier** in the Reel Generator (keyword-scored, 7 archetypes, each with its own scene kit) as the automation layer, feed the model a topic, it picks the right format without human prompting
- Documented everything in my personal knowledge base so the next project can borrow the work

**How I explained it back:**
- 1-page visual brief with scene-by-scene diagrams (Excalidraw)
- Short demo reels in 3 different archetypes so the stakeholder (myself, the content creator) could feel the difference
- A written "which format for which topic" decision table so any new piece of content maps to a template

The outcome: a reel-production system where the *format choice* is no longer tacit-knowledge or vibes, it's a scored routing decision. Exactly the translation loop a Solutions Engineer does every day between marketing/ops teams and automation.

### 6. How do you handle pushback or skepticism when introducing AI tools to teams who haven't used them before?

**Specific example:** when I first proposed replacing my own manual-scripting process with the Reel Generator pipeline, my own "non-technical team" (me, as the creator) pushed back hard:

> "AI-written scripts sound generic. The captions won't be timed right. The visuals will look like every other AI tool. You'll end up ashamed of what it posts."

**How I handled it:**

1. **I agreed with every concern and wrote them down as explicit risks.** Not dismissively. "Yes, LLM scripts do sound generic if you let them. Yes, captions lose meaning when mis-timed. Yes, AI video tools produce a specific bad aesthetic."

2. **Ran a side-by-side with a tight evaluation rubric.** Before scaling up, I'd hand-script one reel, have the system script a reel on the same topic, then blind-review both on: factual grounding, voice authenticity, caption accuracy, visual hierarchy, shareability. The system failed the first three runs on voice. That's when I built the voice-profile system.

3. **Inserted human approval gates at the expensive, irreversible steps.** The Reel Generator's Approve button exists because I didn't trust the system to pick a story without my veto. That's not a compromise, it's exactly the right division: cheap/reversible work (research, drafting) is automated; expensive/irreversible work (render, publish) has a human go/no-go.

4. **Showed tangible wins first.** "This saved 3 hours today" beats "this could save 3 hours someday." I cherry-picked the first 5 reels to be topics I personally cared about, the visible time-savings converted skepticism faster than any pitch.

5. **Made failures loud, not hidden.** Every crash DMs me via the Error Notifier. Every bad output gets called out in a weekly review log. The system doesn't pretend to be perfect; it surfaces its own mistakes so trust accumulates on a foundation of honesty.

Generalized to a marketing/e-commerce context: same playbook. Run a controlled comparison against the current manual flow. Pick the reversible steps to automate first. Put humans on the keystrokes that actually matter. Make the wins legible and the losses obvious.

---

## Section 4: Governance & Risk

### 7. What parts of a workflow do you intentionally keep human-only, and why?

Four categories, always:

1. **Irreversible-cost decisions.** In the Reel Generator, Claude's scene plans cost ~$0.001 each, cheap, reversible. But an ElevenLabs narration + Remotion render burns ~$0.27 + ~70 seconds of CPU. I never let the system commit that spend without a human tap. The *entire architecture*, two workflows split by an Approve button, exists because of this rule.

2. **Voice + taste calls.** The model drafts; I veto. For my LinkedIn draft pipeline, every post lands in Telegram with Approve/Edit buttons. For the Reel Generator, the 3 candidate cards let me see the beat summary before approving. Voice is defensibly a human judgment call, and a system that auto-posts what it drafts will eventually embarrass you.

3. **Public-facing first-contact.** Anything that sends text or media to a user I don't personally know, outbound DMs, cold emails, customer replies, stays behind a human trigger until the error rate is measured. The Reel Generator sends to exactly one allowlisted Telegram user (me) for this reason. An open-to-the-public bot is a different, explicitly out-of-scope v2.

4. **High-stakes state transitions.** Deleting data, publishing content, spending money, changing permissions. Each is a moment where a silent AI bug costs more than the automation saves. I put these behind confirmations even in systems that don't otherwise need UI.

The through-line: *reversibility determines automation scope.* If un-doing it is cheap, the system can do it. If un-doing it is expensive or impossible, a human holds the pen.

### 8. How do you prevent AI from introducing errors or quality issues in production workflows?

Concrete patterns I actually use, every one of them shipped in the Reel Generator:

**Against hallucinations:**
- **Tight context.** Claude only sees the 46 deduped RSS items for ranking, not "the web." Scene planning only sees the one winning story + schema. Narrow input surface → narrow hallucination surface.
- **Structured output contracts.** Prompts require JSON in a specific shape; a `Parse` node validates with regex + try/catch and raises if the shape is wrong.
- **Schema validation at render time.** Remotion props are Zod-validated. Bad props → loud error in the workflow, not a bad render.

**Against data corruption:**
- **Sanitizer layer** in `Build Final Content`, catches Claude's occasional hex color (`#10A37F` → `green`), invented SFX names (whitelist of 40), invalid `severity` enum values, malformed `ComparisonCards.left` shapes. Each has a coercion rule; unrescuable cases fall back to a safe scene (`VersionReveal`).
- **Per-source try/catch** on RSS fetch, one dead feed never kills the run; we fall back to Google News for sources that have killed their feeds.
- **Allowlist over secret tokens.** Security: Telegram `from.id` checked against a hardcoded allowlist on both WF1 and WF2, not just on the webhook secret.

**Against semantic errors Zod can't see:**
- **Human approval gate.** Three candidate cards go to Telegram; I tap Approve on the one whose beat summary makes sense. No semantic eval gate in code can match this.
- **Archetype classifier.** Instead of freeform prompting, keyword-scored routing picks a topic-appropriate scene kit, deterministic, auditable, debuggable.

**Monitoring:**
- **Error Notifier workflow.** Every unhandled throw in any workflow funnels to a single Telegram DM to me with workflow name, failing node, trimmed error, execution ID, local logs link. I see crashes as they happen.
- **Execution history.** n8n's executions API is queryable; I wrote a `/status` command that tails recent runs.
- **ffprobe external eval (honest gap).** Not yet implemented; would be a 15-minute addition to verify MP4 aspect + duration + audio track before delivery.

**Rollback:**
- **Composite-ID idempotency.** Every artifact is keyed `<baseJobId>_<candidateLabel>`. Re-running is safe; same job_id → cache hit, not re-render. Different job_id → isolated artifacts, no clobber.
- **Job files on disk.** The entire approval state is a JSON file. I can `cat` it to see what the system was about to do, and I can delete/edit it to intervene.
- **Human veto is a form of rollback.** Reject a card → nothing downstream fires.

The overall principle: narrow the model's surface area, validate its outputs structurally before acting, gate irreversible spend behind humans, surface failures loudly, and make every artifact inspectable from a plain `ls`.

---

## Section 5: Staying Current

### 9. How do you stay current on AI developments?

Specific sources and how I feed learning back into production:

**People I track (Twitter/X, directly or via reposts):**
- **Andrej Karpathy**, the `autoresearch` pattern I now use for prompt optimization on my own content pipeline came from his recent Karpathy-skills work. I ported it into a prompt-optimizer that measurably improved content quality scores run-over-run.
- **Simon Willison**, his daily notes are the best signal-to-noise source for new LLM features and he tests everything. I read every post.
- **Latent Space / Swyx**, mix of podcast + newsletter; translates research papers to practitioner-level.
- **Geoffrey Huntley, Steve Yegge, Sundeep Charan**, recent experiments with agents and Claude Code tooling.

**Podcasts (commute / background):**
- Latent Space (weekly, practical)
- Dwarkesh Patel (occasional deep dives with lab researchers)
- Lenny's Podcast (AI PM takes, more applied)
- No Priors (researcher conversations)

**Newsletters:**
- Ben's Bites (daily, skim)
- Stratechery (weekly, for strategy context)
- The Information (selective, worth the paywall when there's a big release)
- Import AI (Jack Clark, policy + technical)

**YouTube channels:**
- Chase AI, Matthew Berman, AI Explained, Wes Roth, tools-and-news, great for new model release coverage in the first 48 hours
- I also scraped/transcribed their content into my NotebookLM pipeline so I can Q&A across the whole corpus

**Official sources (direct):**
- Anthropic release notes + API changelog
- OpenAI blog + DevDay keynotes
- Google DeepMind + Gemini release notes
- Meta AI research blog
- ElevenLabs + Remotion changelogs (matters for my stack)

**Research I actually read:**
- Anthropic's interpretability papers (circuit tracers)
- The sparse autoencoder / feature-extraction line of work
- OpenAI's tool-use + function-calling guides
- Papers with Code, weekly scan

**Communities:**
- n8n community forum (for specific workflow edge cases)
- r/LocalLLaMA (for open-weights updates)
- Anthropic discord (official channel access)

**How I translate learning into production changes:**

Three discrete loops:

1. **Weekly Obsidian vault synthesis.** Every session I work on something, a raw-timeline daily note goes into the vault. Weekly I synthesize into MOCs (maps of content), what did I learn this week, what changes should I make to templates, what patterns worth saving as skills. This has a PARA folder structure for retrieval.

2. **A personal templates repo.** When I find a pattern worth keeping (a reusable voice profile system, the Chase AI format spec, archetype classifier, sanitizer layer), it goes into a canonical templates repo. Every new project starts with `cp -r _templates/. <new-project>/`. This is how learnings outlast any one project.

3. **Claude Code skills.** Repeated workflows that I find myself doing 3+ times become skill files: `/brainstorm`, `/software-orchestrator`, `/autoresearch`, `/remotion`, plus a handful of project-specific ones for my content pipelines. Each is version-controlled and evolves with the practice.

So if Anthropic ships prompt caching next week, here's the actual path to production: read the docs on release day → experiment in Claude Code → update `_templates/CLAUDE.md` with a prompt-caching recipe → port the recipe into the Reel Generator's Claude Rank + Scene Plan nodes → re-run the 5-run cost measurement → update `docs/cost-latency-measurement.md` → capture the before/after in the vault's weekly synthesis.

That's the loop, and it's how the Reel Generator's cost / latency numbers actually got to where they are.
