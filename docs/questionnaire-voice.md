# AI Questionnaire, Nikunj's responses

These are honest answers, anchored in the AI Reel Generator I'm submitting and the other automations running on the same n8n instance. Nothing aspirational, nothing borrowed. If I name a tool, I built with it.

---

## Section 1: AI Usage Baseline

### Q1. How much time do you spend using AI tools for work-related tasks per week?

10+ hours, easily. I'm practically living inside Claude Code for build work. Claude, ChatGPT, Gemini, and Perplexity are open in browser tabs for research at any given time. ElevenLabs and Remotion are running for content production. And my self-hosted n8n instance at localhost:5678 is hosting workflows that themselves call Claude Haiku and Sonnet on every trigger, so AI is in the loop even when I'm not typing.

If I split the hours roughly: 6 hours a week on orchestration and build, 2 hours on content production (voice, captions, rendering), and another 2+ on reading release notes, running prompt-optimization experiments, and updating my own skill and template library. The library matters because it's how the next project starts faster than the last one.

### Q2. What AI tools and platforms do you actively use in your work today?

I'll go through the stack as it actually sits, not as a feature list.

Claude Code is my daily driver. It runs plans, scaffolds repos, executes multi-step refactors. I've authored my own reusable skills inside it: brainstorming, multi-agent software orchestration, autoresearch-style prompt optimization, plus a handful of project-specific content-pipeline skills. The Anthropic API itself shows up inside my n8n workflows: Haiku ranks RSS items cheaply, Sonnet generates the scene plans, post drafts, and scripts. I designed the prompts, the JSON output contracts, and tuned the token budgets on each.

n8n (self-hosted in Docker) is the workflow orchestrator. The Reel Generator's three workflows live there alongside a LinkedIn draft generator and a YouTube research pipeline. I authored every node, solved cloudflared tunnel rotation, set up cross-workflow state via the filesystem, and wired Telegram webhook routing. ElevenLabs Turbo v2.5 voices everything in my voice clone, integrated through a custom HTTP render-bridge, with `/with-timestamps` driving the word-synced captions. Remotion does the actual video rendering. I authored 33 scene components, an adaptive beat-driven composition layer, an SFX layer, and a brand header system. Output is 1080x1920 9:16 at 30fps.

The Telegram Bot API is my entry point and delivery surface for `/reel`, `/post`, `/status`, plus the inline-keyboard approval taps. cloudflared exposes the n8n webhook to Telegram, and I wrote a self-healing watchdog (`reel-watchdog.sh`) that reconciles URL rotation against n8n's `WEBHOOK_URL` env. NotebookLM gets reverse-engineered access for programmatic notebook creation, source ingestion, and audio generation, feeding the long-form research pipeline. Midjourney plus Higgsfield handle hero imagery and motion when stock footage won't cut it. The Higgsfield automation is 797 lines and it's been running in production.

Beyond that: Gemini CLI for non-interactive research from shell scripts (pipe and heredoc only, never interactive), crawl4ai and Playwright as scraping fallbacks when an API isn't there, yt-dlp and youtube-transcript-api for YouTube ingestion, Obsidian via MCPVault as my second brain (every project has an `_index.md`, MOCs, structured frontmatter), LightRAG locally with the full vault and 20 YouTube transcripts ingested at 3375 nodes, and Paperclip v0.3.1 with the `claude_local` adapter for agent governance experiments.

Every tool above I build with. I don't have a "tried it once" entry on the list.

---

## Section 2: AI Fluency & Judgment

### Q3. Describe one AI-powered automation you personally built or redesigned.

The AI Reel Generator. The same project I'm submitting in this packet.

The problem was concrete. Producing a single shippable 60 to 90 second social reel about recent AI news was eating 2 to 4 hours of my time, every time. Read feeds, pick a story, script, voiceover, cut, caption, export. Doing that daily across three channels was not going to happen by hand. And the off-the-shelf AI video tools were producing content that was both visually generic and factually untethered from current news, so they weren't a real option either.

So I built the pipeline end to end. Telegram is the trigger (`/reel <topic>`), the approval UI (Approve and Reject inline buttons), and the delivery channel (final MP4). n8n hosts three workflows: Research and Approval (17 nodes), Render and Deliver (20 nodes), and an Error Notifier (3 nodes). Six official AI-company RSS feeds feed in: OpenAI, Anthropic, Google DeepMind, Hugging Face, Meta AI, Mistral, with Anthropic and Meta falling back to Google News when their feeds break. Claude Haiku 4.5 ranks roughly 50 deduped stories against the topic for about $0.001 a call. Claude Sonnet 4.6 scene-plans the top 3 in parallel, one per candidate. ElevenLabs Turbo v2.5 with `/with-timestamps` produces the narration MP3 and the word-level timing. Remotion renders at 1080x1920, 9:16, 30fps, against the 33 scene components and the archetype-driven scene kits. A custom Node.js HTTP bridge on port 5555 is the escape hatch that lets Remotion and ElevenLabs run on the host machine instead of inside the n8n container. cloudflared tunnels the webhook out for Telegram.

Inputs: one natural-language topic from Telegram, like `/reel google deepmind gemini release`. Outputs: 3 candidate preview cards with beat summaries, then 1 approved candidate, then 1 MP4 (around 8 to 11 MB, around 65 seconds, 1080x1920 H.264 plus AAC, word-synced captions) delivered back to Telegram.

The numbers, measured from 5 runs and written up in `docs/cost-latency-measurement.md`. Latency averages 101.6 seconds end-to-end (range 94 to 109), versus the 2 to 4 hours by hand. Flow A (research plus cards) averages 30.6s. Flow B (render plus deliver) averages 71.0s. Cost averages $0.375 per reel (range $0.35 to $0.41), broken down as Haiku ranking $0.016 (4%), Sonnet planning $0.072 (19%), ElevenLabs narration $0.288 (77%). Cache-replay on a previously-rendered candidate is 3.1 seconds, a 25x speedup on a fresh render. Throughput holds within a plus-or-minus 8% band across 5 varied topics, which is the part I care about most: the system is consistent, not lucky. Manual editing steps for a shippable reel: zero. Captions, pacing, transitions, brand colors, SFX are all determined by the scene plan.

Code lives at `ai-solutions-engineer-packet/ai-reel-generator/`.

### Q4. What is the most complex automation you have deployed in a live environment?

A research-to-LinkedIn pipeline I built for my own content, running on the same n8n instance as the Reel Generator.

It's a 39-node n8n workflow orchestrating a polling-based long-form research loop. The shape: Telegram `/research <topic>` or a 9am cron triggers it. NotebookLM gets a fresh notebook spun up programmatically via the API, with about 50 relevant YouTube sources found by yt-dlp search added in. NotebookLM takes 5 to 10 minutes to ingest and index, so the workflow polls `notebooks.status` every 30 seconds with a 20-minute timeout. Once ready, it calls NotebookLM's audio-overview and Q&A endpoints to extract the research shape into a structured report. A second workflow consumes the report, calls Claude Sonnet against my voice-profile system template, and drafts a LinkedIn-formatted post. The post lands in Telegram with Approve, Edit, and Skip buttons. On approve, it goes to LinkedIn via Upload-Post. On edit, it opens for inline revision. State is shared via job files at `/project/jobs/<jobId>.json` plus n8n's workflow-static-data for intra-workflow state.

Failure handling matters more than the happy path on something like this. Every HTTP node has `retryOnFail` with exponential backoff. NotebookLM timeouts fall through to the same Error Notifier workflow the Reel Generator uses, so all crashes funnel to one place. Claude safety-filter refusals route to a "rephrase and retry" path, and after 2 retries they hit a user notification. Stale callback IDs are caught with `continueOnFail: true`. LinkedIn's 100-posts-a-day rate limit is tracked through a daily-quota state file.

Monitoring is a Telegram DM to me on any unhandled crash, with workflow name, failing node, trimmed error, and a local logs link. A `/status` command queries n8n's executions API for recent run success and failure counts. The cloudflared watchdog runs on a Windows Task Scheduler trigger and auto-reconciles whenever the tunnel URL rotates.

What I built versus what I stand on: I built every n8n node, the render-bridge, the voice-profile system, the idempotency layer, the error notifier, the watchdog, the Claude prompts, the JSON schemas, the sanitizer, all the skill files, the cloudflared and Docker setup, the LinkedIn poster. I didn't build n8n itself, the Anthropic API, ElevenLabs, NotebookLM, cloudflared, the Remotion framework, or Docker. I stand on those shoulders and wire them together.

---

## Section 3: Cross-functional Communication

### Q5. Describe a time you had to understand a non-technical team's manual process and translate it into an automation.

The closest real parallel in my work is decoding the Chase AI YouTube format and translating it into a reusable template for my own Hindi AI Channel. Chase AI is a popular AI-tools channel: 8 to 12 minute videos, around 20 to 30 cuts a minute, tool-plus-tool-plus-outcome narratives. The "process" was tacit. The creator never wrote it down. So I had to reverse-engineer it.

How I gathered requirements. I watched 12 of his videos end to end, time-stamped every cut, and labeled every scene type. I transcribed 3 full scripts and tagged the rhetorical moves: cold open, problem, tool intro, workflow demo, outcome, CTA. I pulled titles, thumbnails, and view counts from 40 videos and clustered them by format archetype. Where the pattern wasn't obvious, I asked Chase directly via comments and community replies. And I re-enacted 2 full videos myself with placeholder copy just to feel the rhythm, because watching is not the same as performing.

The questions I had to answer were narrow and specific. When does a cut happen, exactly: new sentence, new visual, new idea, or ambient pacing? (Answer: ambient pacing, around 2.5 seconds average.) What moves a viewer from intro to first tool inside 20 seconds? (Answer: one sentence of concrete problem, then screen-share.) Which cuts are content cuts versus punch-in zooms? (Answer: roughly 60/40 split.)

The translation. I wrote a structured spec with a format-archetype schema (duration, cuts-per-minute, scene-sequence template, voice-cadence target, minimum-shippable-template rules). Then I built it into the scene catalog: 33 Remotion components that compose into Chase AI-style sequences deterministically. The archetype classifier in the Reel Generator (keyword-scored, 7 archetypes, each with its own scene kit) is the automation layer over that spec. Feed it a topic, it picks the right format without anyone prompting it. Documented the whole thing in my knowledge base so the next project can borrow it.

For explaining it back, I made a 1-page visual brief with scene-by-scene Excalidraw diagrams, short demo reels in 3 different archetypes so the stakeholder (me, in this case, as the creator) could feel the difference, and a written "which format for which topic" decision table so any new piece of content maps cleanly to a template.

The outcome was a system where format choice is no longer tacit-knowledge or vibes. It's a scored routing decision. That's the same translation loop a Solutions Engineer runs every day between marketing or ops teams and the automation that has to serve them.

### Q6. How do you handle pushback or skepticism when introducing AI tools to teams who haven't used them before?

A specific example. When I first proposed replacing my own manual scripting with the Reel Generator pipeline, my own non-technical team (which is just me, as the creator, wearing the other hat) pushed back hard. The pushback was: "AI-written scripts sound generic. The captions won't be timed right. The visuals will look like every other AI tool. You'll end up ashamed of what it posts."

How I handled it.

First, I agreed with every concern and wrote them down as explicit risks. Not dismissively. Yes, LLM scripts do sound generic if you let them. Yes, captions lose meaning when mis-timed. Yes, AI video tools produce a specific bad aesthetic that everyone can spot.

Second, I ran a side-by-side with a tight evaluation rubric. Before scaling up, I'd hand-script one reel, have the system script a reel on the same topic, then blind-review both on factual grounding, voice authenticity, caption accuracy, visual hierarchy, and shareability. The system failed the first three runs on voice. That's when I built the voice-profile system. The rubric didn't kill the project, it sharpened it.

Third, I inserted human approval gates at the expensive, irreversible steps. The Approve button in the Reel Generator exists because I didn't trust the system to pick a story without my veto. That isn't a compromise, it's the right division of labor. Cheap, reversible work (research, drafting) is automated. Expensive, irreversible work (render, publish) has a human go/no-go.

Fourth, tangible wins first. "This saved 3 hours today" beats "this could save 3 hours someday." So I cherry-picked the first 5 reels to be topics I personally cared about. The visible time-savings converted skepticism faster than any pitch ever would.

Fifth, I made failures loud, not hidden. Every crash DMs me through the Error Notifier. Every bad output gets called out in a weekly review log. The system doesn't pretend to be perfect, it surfaces its own mistakes, so trust builds on a foundation of honesty instead of polish.

Generalize this to a marketing or e-commerce context and the playbook is the same. Run a controlled comparison against the current manual flow. Pick the reversible steps to automate first. Put humans on the keystrokes that actually matter. Make the wins legible and the losses obvious.

---

## Section 4: Governance & Risk

### Q7. What parts of a workflow do you intentionally keep human-only, and why?

Four categories. Always.

The first is irreversible-cost decisions. In the Reel Generator, Claude's scene plans cost about $0.001 each. Cheap. Reversible. But an ElevenLabs narration plus a Remotion render burns roughly $0.27 plus 70 seconds of CPU time. I never let the system commit that spend without a human tap. The entire architecture (two workflows split by an Approve button) exists because of this rule.

The second is voice and taste calls. The model drafts, I veto. For my LinkedIn pipeline, every post lands in Telegram with Approve and Edit buttons. For the Reel Generator, the 3 candidate cards let me see the beat summary before approving anything. Voice is a human judgment call, defensibly. A system that auto-posts what it drafts will eventually embarrass you, and the day it does, the whole automation loses trust.

The third is public-facing first-contact. Anything that sends text or media to a user I don't personally know (outbound DMs, cold emails, customer replies) stays behind a human trigger until the error rate is actually measured. The Reel Generator delivers to exactly one allowlisted Telegram user (me) for this exact reason. A bot open to the public is a different system, and it's explicitly out of scope for v1.

The fourth is high-stakes state transitions. Deleting data, publishing content, spending money, changing permissions. Each of those is a moment where a silent AI bug costs more than the automation saves over a month. I put confirmations in front of those even in systems that don't otherwise have UI.

The through-line on all four: reversibility determines automation scope. If undoing it is cheap, the system can do it. If undoing it is expensive or impossible, a human holds the pen.

### Q8. How do you prevent AI from introducing errors or quality issues in production workflows?

The patterns I actually use are concrete and every one of them is shipped in the Reel Generator. I'll group them by the failure mode they're solving.

Against hallucinations. I keep the context tight. Claude only sees the 46 deduped RSS items at ranking time, not "the web." Scene planning only sees the one winning story plus the schema. Narrow input surface, narrow hallucination surface. Output is required as JSON in a specific shape, and a Parse node validates it with regex plus try/catch and raises if the shape is wrong. Remotion props are Zod-validated at render time. Bad props cause a loud error in the workflow, not a silently bad render.

Against data corruption. There's a sanitizer layer in `Build Final Content` that catches Claude's occasional drift: hex colors when it should have used a token (#10A37F gets coerced to `green`), invented SFX names against a whitelist of 40, invalid `severity` enum values, malformed `ComparisonCards.left` shapes. Each has a coercion rule, and the unrescuable cases fall back to a known-safe scene (`VersionReveal`). Per-source try/catch on RSS fetch, so one dead feed never kills the run, and feeds that go down route to Google News. Security-side, the Telegram `from.id` is checked against a hardcoded allowlist on both WF1 and WF2. Not just a webhook secret. Allowlist over secret tokens.

Against semantic errors that no schema can see. Three candidate cards go to Telegram. I tap Approve on the one whose beat summary actually makes sense. No code-side semantic eval gate beats a human reading three short summaries. And the archetype classifier replaces freeform prompting with keyword-scored routing into a topic-appropriate scene kit, so the routing is deterministic, auditable, debuggable.

Monitoring. The Error Notifier funnels every unhandled throw in any workflow into a single Telegram DM to me with workflow name, failing node, trimmed error, execution ID, and a link to local logs. n8n's executions API is queryable, and I wrote a `/status` command that tails recent runs. Honest gap: I don't yet have an ffprobe external eval to verify MP4 aspect, duration, and audio track before delivery. It's a 15-minute addition and I haven't shipped it. Calling it out so it's not hidden.

Rollback. Every artifact is keyed by composite ID, `<baseJobId>_<candidateLabel>`, so re-running is safe. Same job_id hits cache, different job_id produces isolated artifacts with no clobber. The entire approval state is a JSON file on disk, so I can `cat` it to see what the system is about to do and edit or delete it if I need to intervene. And human veto is itself a form of rollback. Reject a card, nothing downstream fires.

The principle behind all of it: narrow the model's surface area, validate its outputs structurally before acting on them, gate irreversible spend behind humans, surface failures loudly, and make every artifact inspectable from a plain `ls`.

---

## Section 5: Staying Current

### Q9. How do you stay current on AI developments?

Specific sources and the path each takes back into production.

People I track on Twitter/X, directly or via reposts. Andrej Karpathy is the big one. The autoresearch pattern I now use for prompt optimization on my own content pipeline came directly from his recent Karpathy-skills work. I ported it into a prompt-optimizer that measurably improved content quality scores run-over-run. Simon Willison's daily notes are the best signal-to-noise source for new LLM features I've found, and he tests everything, so I read every post. Latent Space and Swyx for the practitioner-level translation of research papers. Geoffrey Huntley, Steve Yegge, and Sundeep Charan for recent agent and Claude Code tooling experiments.

Podcasts on commute and in the background. Latent Space (weekly, practical), Dwarkesh Patel (deep dives with lab researchers, occasional), Lenny's Podcast (AI PM takes, more applied), No Priors (researcher conversations).

Newsletters. Ben's Bites daily for skim, Stratechery weekly for strategy context, The Information selectively when the paywall is worth it on a big release, and Import AI from Jack Clark for policy-plus-technical.

YouTube. Chase AI, Matthew Berman, AI Explained, Wes Roth, all useful for tools-and-news in the first 48 hours after a model release. I also scrape and transcribe their content into my NotebookLM pipeline so I can Q&A across the whole corpus instead of rewatching.

Direct from the source. Anthropic's release notes and API changelog, OpenAI's blog and DevDay keynotes, Google DeepMind and Gemini release notes, the Meta AI research blog, ElevenLabs and Remotion changelogs (those last two matter because they're in my stack).

Research papers I actually read. Anthropic's interpretability work (the circuit tracers), the sparse autoencoder and feature-extraction line, OpenAI's tool-use and function-calling guides, and a weekly scan of Papers with Code.

Communities. The n8n forum for specific workflow edge cases, r/LocalLLaMA for open-weights updates, and the official Anthropic discord.

Now the part that actually matters: how does any of this translate into production changes? Three discrete loops.

The first is a weekly Obsidian vault synthesis. Every session I work, a raw-timeline daily note goes into the vault. Once a week I synthesize into MOCs (maps of content): what did I learn, what should change in templates, what patterns are worth saving as skills. The vault has a PARA folder structure for retrieval.

The second is the personal templates repo. When I find a pattern worth keeping (a reusable voice profile system, the Chase AI format spec, the archetype classifier, the sanitizer layer), it goes into a canonical templates repo. Every new project starts with `cp -r _templates/. <new-project>/`. That's how learnings outlast any single project.

The third is Claude Code skills. Repeated workflows that I find myself running 3+ times become skill files: `/brainstorm`, `/software-orchestrator`, `/autoresearch`, `/remotion`, plus a handful of project-specific ones for the content pipelines. Each is version-controlled. Each evolves with the practice.

So if Anthropic ships prompt caching next week, the actual path to production is: read the docs on release day, experiment in Claude Code, update `_templates/CLAUDE.md` with a prompt-caching recipe, port the recipe into the Reel Generator's Claude Rank and Scene Plan nodes, re-run the 5-run cost measurement, update `docs/cost-latency-measurement.md`, and capture the before/after in the vault's weekly synthesis.

That's the loop. And it's how the Reel Generator's cost and latency numbers actually got to where they are.
