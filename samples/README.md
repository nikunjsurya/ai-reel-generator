# Sample reels

Six MP4s rendered by this exact pipeline on real /reel commands. All are 1080x1920, H.264 + AAC, ~60-90s, 9:16 vertical for Instagram Reels / TikTok / YouTube Shorts.

## The "3 drafts, you pick one" triplet

These three came from a single `/reel <topic>` command. After Workflow 1 ranked the day's stories, Claude Sonnet drafted three different reels on three different angles. The bot DM'd all three preview cards at once and waited for an Approve tap.

This triplet illustrates the human-approval gate (the 10% in the 60 / 30 / 10 framework): the AI is confident on all three; a human chooses which one ships.

| File | Headline | Brand styling |
|---|---|---|
| `triplet-A_ai-speech-leveled-up_gemini.mp4` | AI Speech Just Leveled Up | Gemini |
| `triplet-B_ai-fights-disease_openai.mp4` | AI That Fights Disease | OpenAI |
| `triplet-C_agents-sdk-leveled-up_openai.mp4` | Agents SDK Just Leveled Up | OpenAI |

## Single approved variants (different topics, different archetypes)

Each one is a single approved reel from a separate `/reel` command, picked to show the range of scene templates the archetype router can reach.

| File | Headline | Brand styling | Archetype |
|---|---|---|---|
| `single_claude-copyright-crisis_anthropic.mp4` | Claude Code Copyright Crisis | Anthropic | Controversy / risk |
| `single_deepmind-goes-global_gemini.mp4` | DeepMind Goes Global | Gemini | Research expansion |
| `single_gpt-5-5-launch_openai.mp4` | GPT-5.5 Is Here | OpenAI | Product launch |

## What you should notice

- **Animation variety across templates.** Each archetype routes through a different scene kit (HeroQuestion, BigStatStack, ComparisonCards, MockTerminal, MapMoment, VersionReveal, etc.). The launch reel and the controversy reel barely share any scenes, that's the routing working.
- **Brand-aware chrome.** Header color, watermark, and accent palette adapt to the source brand (Anthropic orange, OpenAI green, Gemini gradient). Defined in [src/adaptive/brand.ts](../src/adaptive/brand.ts).
- **Per-word caption sync.** Captions magnify the active word frame-by-frame, driven by ElevenLabs `/with-timestamps` word-level timing data. No drift, no whisper post-processing.
- **Voice consistency.** All six are narrated by the same ElevenLabs voice clone, so brand changes don't break vocal continuity.

## How they were rendered

1. `/reel <topic>` to the Telegram bot.
2. Workflow 1 fetched 6 RSS feeds, Haiku ranked stories, Sonnet drafted three reel scripts, the bot DM'd three preview cards.
3. Approve on one card triggered Workflow 2: ElevenLabs narration, caption sync, archetype-routed Remotion render, MP4 delivered to Telegram.

End-to-end measurement on these runs: ~90-115s from approval tap to delivery, ~$0.42 per reel. See [docs/cost-latency-measurement.md](../docs/cost-latency-measurement.md).
