import { z } from "zod";

// Pill item used by multiple scenes
export const pillSchema = z.object({
  text: z.string(),
  accent: z.enum(["coral", "cyan", "red", "green", "yellow", "orange", "purple", "pink", "blue"]).default("coral"),
  // Optional per-pill highlight window, relative to the pill's scene start
  // in seconds. When set, the pill scales up / lifts / brightens during this
  // interval so it syncs with the narration naming it.
  highlightAtSec: z.number().optional(),
  highlightDurSec: z.number().optional(),
});

// Accent palette keys used across brand/adaptive system
export const accentKey = z.enum([
  "coral", "cyan", "red", "green", "yellow", "orange", "purple", "pink", "blue", "white", "muted",
]);

// Brand identifier
export const brandKey = z.enum([
  "anthropic", "openai", "gemini", "google", "meta", "xai", "deepseek", "mistral", "huggingface", "github", "generic",
]);

// Minimal props for each scene, all optional beyond {brand, accent}
export const sceneProps = z.object({
  brand: brandKey.default("anthropic"),
  accent: accentKey.default("coral"),
  accent2: accentKey.optional(),
  headline: z.string().optional(),
  subhead: z.string().optional(),
  footer: z.string().optional(),
  label: z.string().optional(),
  version: z.string().optional(),
  command: z.string().optional(),
  title: z.string().optional(),
  prompt: z.string().optional(),
  status: z.string().optional(),
  filename: z.string().optional(),
  header: z.string().optional(),
  done: z.string().optional(),
  tease: z.string().optional(),
  threshold: z.string().optional(),
  cta: z.string().optional(),
  source: z.string().optional(),
  caption: z.string().optional(),
  brollSrc: z.string().optional(),
  fallbackBg: z.string().optional(),
  pills: z.array(pillSchema).optional(),
  counter: z.object({
    label: z.string(),
    from: z.number(),
    to: z.number(),
    durationSec: z.number().default(3),
  }).optional(),
  items: z.array(z.object({ text: z.string(), count: z.string().optional() })).optional(),
  logLines: z.array(z.object({ role: z.string(), text: z.string() })).optional(),
  lines: z.array(z.object({
    text: z.string(),
    color: z.enum(["key", "value", "string", "muted", "accent", "number"]).default("value"),
    check: z.boolean().optional(),
  })).optional(),
  bars: z.array(z.object({
    label: z.string(),
    accent: accentKey.default("cyan"),
    targetPct: z.number().default(100),
  })).optional(),
  cards: z.array(z.object({
    severity: z.enum(["HIGH", "MED", "LOW"]).default("HIGH"),
    confidence: z.number(),
    title: z.string(),
    path: z.string(),
  })).optional(),
}).passthrough();

export const sceneName = z.enum([
  "VersionReveal",
  "CommandPills",
  "CounterPain",
  "SkillLabel",
  "MockTerminal",
  "MockEditor",
  "SkillDone",
  "ProgressBars",
  "SeverityCards",
  "BrollClip",
  "CTAOutro",
  "MockTweetCard",
  "ComparisonCards",
  "BrowserReveal",
  "BadgeOverlay",
  // V7 long-form scenes (usable in Shorts where data shape allows)
  "StatReveal",
  "BigStatStack",
  "SectionDividerCard",
  "HeroQuestion",
  "TimelineConnector",
  "SplitFactCard",
  "UrlRevealCard",
  "TabSelectorPillars",
  "TestimonialCards",
  "CommunityQuoteGrid",
  "SponsorCard",
  "SponsorCourseCard",
  "BrandOutroBumper",
  // Tier-1 shorts-native additions (reel-generator pipeline)
  "QuoteCallout",
  "StatBlock",
  "MapMoment",
  "PricingReveal",
  "VsTimeline",
  "IconGrid",
  "DoubleStatHero",
  "CodeInline",
]);

export const beatSchema = z.object({
  id: z.string(),
  intent: z.string(),
  text: z.string(),
  scene: sceneName,
  props: sceneProps,
  sfxHints: z.array(z.string()).default([]),
});

export const captionsSchema = z.object({
  words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
  beats: z.array(z.object({
    id: z.string(),
    intent: z.string(),
    scene: sceneName,
    startSec: z.number(),
    endSec: z.number(),
  })),
  duration: z.number(),
});

export const headerStyle = z.enum(["brand", "comparison"]);

export const comparisonHeaderSchema = z.object({
  left: z.object({ brand: brandKey, label: z.string() }),
  right: z.object({ brand: brandKey, label: z.string() }),
});

// V7 long-form: chapters group beats for chrome (ChapterDots) purposes only.
// Beats still carry their own narration timing; chapters just declare the
// grouping + a title + an optional sponsor slot per chapter.
export const chapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  beatIds: z.array(z.string()),
  sponsor: z.object({
    slug: z.string(),
    brand: z.string(),
    durationSec: z.number().default(33),
  }).optional(),
});

export const formatKey = z.enum(["short", "longform"]);

export const captionsMode = z.enum(["auto", "always", "never"]);

export const adaptiveShortSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string().default("hinglish"),
  voice: z.string().default("rudra"),
  brand: brandKey.default("anthropic"),
  channel: z.string().default("hindi-ai"),
  format: formatKey.default("short"),
  targetDurationSec: z.number().default(70),
  audioSrc: z.string(),
  captionsSrc: z.string(),
  beats: z.array(beatSchema),
  chapters: z.array(chapterSchema).optional(),
  headerStyle: headerStyle.optional(),
  headerLabel: z.string().optional(),
  comparisonHeader: comparisonHeaderSchema.optional(),
  // captionsMode: "auto" keeps a per-scene suppress list; "always" forces
  // captions on every beat; "never" disables burned-in captions entirely.
  // Reel-generator pipeline uses "always".
  captionsMode: captionsMode.optional().default("auto"),
  // channelLabel overrides the bottom-right watermark text. Empty string
  // hides the watermark entirely.
  channelLabel: z.string().optional(),
  // captionWordEffect: "pulse" = whole-word flip; "magnify" = per-letter
  // gaussian-wave magnifier following the voice. Reel-generator uses "magnify".
  captionWordEffect: z.enum(["pulse", "magnify"]).optional().default("pulse"),
});

export type AccentKey = z.infer<typeof accentKey>;
export type BrandKey = z.infer<typeof brandKey>;
export type SceneName = z.infer<typeof sceneName>;
export type SceneProps = z.infer<typeof sceneProps>;
export type Pill = z.infer<typeof pillSchema>;
export type Beat = z.infer<typeof beatSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type FormatKey = z.infer<typeof formatKey>;
export type AdaptiveShortProps = z.infer<typeof adaptiveShortSchema>;
export type CaptionsFile = z.infer<typeof captionsSchema>;
