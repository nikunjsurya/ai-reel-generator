# Template variety, the sameness problem and the fix

## Why every reel currently looks the same

It's not a rendering limitation. The AdaptiveShort component already has 27
registered scene types. We're only using ~8 of them. The constraint is one
file: the Claude Scene Plan prompt in WF1.

Current prompt says something like:

> Follow this recommended order: 1) VersionReveal, 2) MockTweetCard, 3) CommandPills,
> 4) BadgeOverlay, 5) MockTerminal or SkillLabel, 6) ComparisonCards, 7) CTAOutro

Claude Sonnet is disciplined, given a numbered recipe, it follows the recipe.
Topic changes, but the structural spine doesn't. The terminal appears on every
reel, even when the story has nothing to do with code. The fake tweet card
appears every time, even when the story wasn't announced on Twitter.

The fix isn't to give Claude more freedom, that produces noise. The fix is to
**classify the topic first, then hand Claude a topic-appropriate scene kit**.
Different topics get different playbooks.

## Scene catalog, what's actually available

From `src/adaptive/AdaptiveShort.tsx` SCENE_MAP, all 27 are implemented:

| Scene | Best for | Typical use |
|---|---|---|
| VersionReveal | Product labels, version reveals | Hook beat: "OPENAI CODEX · V2.0" |
| MockTweetCard | Social announcements | "X posted this about Y" |
| CommandPills | 3-feature lists | "Three new capabilities" |
| BadgeOverlay | One big number | "$10M", "3M users" |
| MockTerminal | CLI / code demos | Only when story is genuinely code |
| MockEditor | Code with diffs | Pull requests, patch demos |
| SkillLabel | Step-by-step feature reveal | "One. Computer use." |
| SkillDone | Transition between features | "Feature done, next up" |
| ComparisonCards | Two-product side-by-side | vs competitor |
| BrowserReveal | Website or UI reveal | Product launches with web UI |
| CounterPain | Before/after count animations | "Down from 10,000 to 42" |
| ProgressBars | Benchmark-style bar charts | SWE-bench scores, latency |
| SeverityCards | Risk-severity cards | Vulnerabilities, policy severity |
| BrollClip | Article hero image card | General-purpose visual break |
| CTAOutro | Follow-for-more close | Every reel's final beat |
| BigStatStack | Multiple big stats together | Quarterly earnings, year-over-year |
| SectionDividerCard | Chapter breaks (long-form) | Rarely useful in 90s reels |
| HeroQuestion | Provocative question frame | "Should AI models be regulated?" |
| TimelineConnector | Date-based sequence | "Jan → Mar → Sep timeline" |
| SplitFactCard | Two-column contrast | Before/after, claim/reality |
| UrlRevealCard | URL callout | "See more at x.com" |
| TabSelectorPillars | Three-tab compare | Tier-A/B/C breakdowns |
| TestimonialCards | Quotes from users | Customer/community voices |
| CommunityQuoteGrid | Multi-quote reactions | Social response to an event |
| SponsorCard / SponsorCourseCard | Sponsor slots | (longform only) |
| StatReveal | Single giant number | Alias to BigStatStack |
| BrandOutroBumper | Full brand lockup end | Channel-branded close |

A 90-second reel fits 6-10 beats. Our archetypes pick different kits from this
list so the reel feels topically right.

## Archetype → scene kit (the proposed map)

Seven archetypes cover ~95% of AI news. Each gets a scene kit of 4-7
"recommended" scenes and an "avoid" list. Claude picks beats from the kit
(order loose, count flexible).

### 1. `launch_announcement`
"X launched Y", "X drops Z", "Introducing N"

- Kit: VersionReveal, MockTweetCard, BrollClip, BadgeOverlay, CommandPills, CTAOutro
- Avoid: MockTerminal, MockEditor (unless topic explicitly technical), SeverityCards
- Vibe: celebratory, big version number, one hero image

### 2. `technical_deep_dive`
Benchmarks, API changes, model versions, performance, coding

- Kit: VersionReveal, ComparisonCards, ProgressBars, MockTerminal, MockEditor, BadgeOverlay, CTAOutro
- Avoid: MockTweetCard (social isn't the hook), CommunityQuoteGrid
- Vibe: numbers, bars, code terminal

### 3. `feature_capability`
"X now has feature Y", product-feature additions

- Kit: VersionReveal, CommandPills, SkillLabel, SkillDone, BrowserReveal, CTAOutro
- Optional: MockTerminal if feature is code-facing
- Avoid: SeverityCards, CounterPain
- Vibe: walk through features one by one

### 4. `business_partnership`
"X partners with Y", acquisitions, deals, $ funding, enterprise deployment

- Kit: BrollClip (partner logo/image), MockTweetCard, BadgeOverlay, SplitFactCard, CTAOutro
- Avoid: MockTerminal, MockEditor, ProgressBars (technical scenes feel wrong)
- Vibe: business, handshake, dollar amounts, location/scale imagery

### 5. `controversy_policy`
Regulation, lawsuits, safety concerns, policy changes

- Kit: HeroQuestion, SeverityCards, SplitFactCard, CommunityQuoteGrid, CTAOutro
- Avoid: BadgeOverlay-with-big-celebratory-stat, CommandPills (too upbeat)
- Vibe: provocative question, red severity markers, multi-voice response

### 6. `industry_stats`
Usage numbers, market share, growth rates, "X crossed Y users"

- Kit: BigStatStack, BadgeOverlay, CounterPain, ProgressBars, CTAOutro
- Vibe: numbers-first, lots of animated counters

### 7. `story_impact`
Individual case studies, customer stories, human impact

- Kit: HeroQuestion, TestimonialCards, BrollClip, SplitFactCard, CTAOutro
- Avoid: MockTerminal, ComparisonCards (impersonal)
- Vibe: human, quoted, emotional

## Detection, how we pick the archetype

Pure keyword matching on topic + story title + description. No AI call for
classification, it's trivially fast and deterministic. If no archetype
strongly matches, we fall back to `launch_announcement` (the most common).

```
technical_deep_dive: /bench|api|sdk|code|codex|sdk|cli|compiler|python|github|repo|pull request|commit|latency|inference|throughput|tokens\/sec/i
business_partnership: /partner|deal|acqui|invest|fund|enterprise|deploy|rollout|hyatt|accenture|customer|client|revenue|\$\d+[MBK]/i
controversy_policy: /lawsuit|regulat|ban|concern|safety|risk|danger|bias|hallucin|jailbreak|policy|court|fine|sued|violat/i
industry_stats: /\bmillion\b|\bbillion\b|users|growth|market share|penetrat|adoption|quarter|annual|yoy/i
feature_capability: /feature|now support|can now|adds|added|launches|rollout|available|supports/i
story_impact: /helps|transform|accelerat|for \w+ team|case study|story|journey|employee|customer/i
launch_announcement: (fallback)
```

Topic alone is often ambiguous ("/reel claude" → launch? feature? benchmark?), so
we run the detector on `topic + top candidate's title + description`. The
detected archetype is attached to each candidate and flows into Claude Scene Plan.

## What the prompt becomes

Instead of a single recipe, the prompt now:
1. States the detected archetype and its "vibe"
2. Lists the archetype's recommended scene kit (with brief "what this scene is" notes)
3. Lists the scenes to AVOID for this archetype
4. Requires beat variety: "no two adjacent beats use the same scene"
5. Lists all 27 scenes as the full option space, but weights the recommended kit

## Stretch goal (not this pass)

Even within a scene, we can add template variants. CommandPills has 3 accents;
CTAOutro has 5 layout variants (follow / subscribe / pick / comment / version);
VersionReveal could have "version-heavy" vs "label-heavy" variants.

Claude can pick the variant per beat if we expose it. Deferring this, first
pass just fixes archetype selection, which is the dominant cause of sameness.
