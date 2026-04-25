# Handling AI Hallucinations, Framework + Applied Patterns

The Questionnaire's Q8 ("how do you prevent AI from introducing errors or quality issues in production workflows?") and the "error handling" evaluation dimension both ask the same question. This is the framework I apply, with concrete examples from the Reel Generator.

## The framework, 8 patterns

Every one of these reduces the *surface area* where the model can be wrong. Use as many as fit; they compound.

### 1. Narrow the input surface

The less freedom the model has on input, the fewer paths it has to invent facts.

- **Don't hand a model "the web."** Hand it a curated, time-bounded, shape-validated list of sources.
- In the Reel Generator: Claude only ever sees the 46 deduped RSS items from the last 7 days. No free-text search. No "go fetch". If a story isn't in the 6 official feeds, it can't be in the ranking.

### 2. Structured output contracts

Force the model to emit data in a schema you validate. Prose is where hallucinations hide; named fields can't hide.

- Prompt requires JSON matching a target shape.
- `Parse Scene Plans` regex-extracts the first `{...}` block, JSON.parses inside try/catch, throws with the first 200 chars of the raw response on failure.
- Remotion props are Zod-validated. Bad shapes throw loudly.

### 3. Ground the model with facts it can verify

Inject real, current, verifiable context so the model doesn't invent.

- **Date grounding** (just added after Opus 4.7 said "2025"): every Claude Sonnet prompt now includes `Today: 2026-04-23` and the story's `pubDate`. Sonnet's knowledge cutoff is late 2025, so without this it defaults to "2025" for launch-year references.
- **Brand grounding**: the story's `source` field maps to a `brandHint` so Claude doesn't invent a brand.
- **URL grounding**: the source `link` is in the prompt so any URL the model writes must match it.

### 4. Post-validate + sanitize

Schema validation catches shape errors; a sanitizer catches *semantic* errors the schema allows.

- `Build Final Content` has a ~400-line sanitizer that:
  - **Coerces hex colors to palette keys**: Claude sometimes writes `#10A37F`; the sanitizer RGB-distance-matches to `green`.
  - **Whitelists SFX names** against a 40-name catalog; invalid names dropped.
  - **Clamps enums**: `severity: "high"` → `"MED"` default if not in `["HIGH","MED","LOW"]`.
  - **Shape-rescues nested props**: if `ComparisonCards.left` is a string instead of `{title, features}`, coerces or swaps the beat.
- Parse Scene Plans has a duplicate-scene rescue: if Claude reuses the same scene type, the rescue swaps the offender to an unused fallback.

### 5. Cheap model for filtering, expensive model for synthesis

Small fast models hallucinate less on narrow tasks (rank these indices) than large models do on open-ended tasks.

- Claude Haiku 4.5 ranks 50 stories → 3 indices. Task is structured, cost is $0.02.
- Claude Sonnet 4.6 only writes scene plans for the 3 candidates the user will actually see. Cost ~$0.08, but only fires after the cheap filter.
- If I used Sonnet everywhere, my Anthropic bill would be 10× and Flow A latency would double.

### 6. Human-in-the-loop at irreversible steps

AI handles reversible work; humans gate irreversible spend.

- The whole architecture is two workflows split by an Approve button. Research + 3 candidate scene plans = $0.03 and 30 seconds. Render + narration = $0.28 and 75 seconds. The button is the gate.
- If I get 3 cards that all look off, I tap Reject and it costs me nothing. If I tap Approve on a bad one, the cost is the $0.30 render.

### 7. Make failures loud, not silent

A silent hallucination becomes a shipped bug. A loud error becomes a fix.

- Error Notifier workflow DMs the owner the moment anything throws. Includes: workflow name, failing node, trimmed error message, execution ID, local logs link.
- Unauthorized users throw and get caught by Error Notifier (owner sees "someone tried" without the attacker getting a DM).
- The Telegram bot is the monitoring dashboard. No separate UI to forget to check.

### 8. Idempotency + rollback

Every action should be safe to redo. Every artifact should be inspectable from the filesystem.

- Composite IDs: artifacts are keyed `<baseJobId>_<candidateLabel>`. Re-approving the same candidate → cache hit in 3s, not re-render.
- Job files on disk: the entire job state is `/project/jobs/<jobId>.json`. `cat` it to see what the system was about to do. `rm` it to cancel.
- MP4 cache: if something is ever wrong with a delivered reel, I can delete the cached MP4 and re-tap Approve to re-render with the latest sanitizer / scene catalog.

## What this looks like in a specific case: the Opus 4.7 year hallucination

Walk the framework top-to-bottom on the bug you spotted:

| Step | What happened |
|---|---|
| Input | RSS story from Anthropic's feed, real title and description, `pubDate` = 2026-04-09 |
| Prompt | Included story metadata, scene kit, archetype. **Did NOT include current date.** |
| Model | Claude Sonnet 4.6, training cutoff late 2025 |
| Output | `leftStat: { label: "Release", value: "2025" }`, model defaulted to its training year |
| Schema validation | Passed, `value: "2025"` is a valid string |
| Sanitizer | Passed, no hex, no SFX issue, no enum violation |
| User sees | Wrong year on screen |
| **Root cause** | **Pattern 3 violation**: no date grounding. Model had no fact to anchor to. |
| **Fix applied** | Added `TODAY`, `TODAY_YEAR`, `STORY_PUB_DATE` to both system and user prompts with explicit instruction "never write 2025 unless the story explicitly says so." |

That's the whole loop: a hallucination is almost always a missing pattern. Find the missing pattern, apply it, measure again.

## What's still unhandled (honest gaps)

These are real holes, not solved today:

1. **Semantic hallucination of claims within the story.** Claude could invent a benchmark number ("85% on SWE-bench") that wasn't in the source. No fact-check loop yet. Fix: after scene-plan generation, re-prompt Claude Haiku with "does every claim in this script appear in the source description?" as a verifier. One extra LLM call per reel, ~$0.005.
2. **Narration claim verification.** Same issue but in the prose narration, not just scene props.
3. **Brand-color invention.** Claude could pick `purple` for an Anthropic reel even though coral is the brand. Brand accent is enforced by `BRAND_ACCENT[base.brand]` override, decent today, not bulletproof.
4. **Prompt injection via topic text.** User is allowlisted so this is a non-issue for me. For a public bot, wrap topic in delimiters + run Haiku pre-check that the topic isn't trying to reprogram Sonnet.
5. **Caption drift on long narrations.** ElevenLabs `/with-timestamps` is word-accurate for ~90s narrations in my tests. For 5-minute+ long-form, word-timing drift can compound. Not relevant today; would be for a long-form variant.

Rank these as "what I'd do differently with more time" in the Loom.

## The meta-lesson

Hallucinations aren't a single problem, they're a family of problems that need a layered defense. No one pattern is enough. You combine narrow input + structured output + fact grounding + sanitizer + cheap-filter + human-gate + loud errors + idempotency, and the rate of shipped bad output drops toward zero. When a bug does ship (like "2025"), the fix is always "which of the 8 patterns was missing."
