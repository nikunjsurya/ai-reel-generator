import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  delayRender,
  continueRender,
  interpolate,
} from "remotion";
import { useEffect, useState } from "react";
import type { AdaptiveShortProps, CaptionsFile, SceneName } from "./types";
import { BRAND, ACCENT_HEX } from "./brand";
import { BrandHeader } from "./components/BrandHeader";
import { BrandWatermark } from "./components/BrandWatermark";
import { ChannelWatermark } from "./components/ChannelWatermark";
import { ChapterDots } from "./components/ChapterDots";
import { ComparisonHeader } from "./components/ComparisonHeader";
import { HinglishCaption } from "./components/HinglishCaption";
import { SfxLayer, planSfx } from "./components/SfxLayer";
import { SceneFade } from "./components/SceneFade";

import { VersionReveal } from "./scenes/VersionReveal";
import { CommandPills } from "./scenes/CommandPills";
import { CounterPain } from "./scenes/CounterPain";
import { SkillLabel } from "./scenes/SkillLabel";
import { MockTerminal } from "./scenes/MockTerminal";
import { MockEditor } from "./scenes/MockEditor";
import { SkillDone } from "./scenes/SkillDone";
import { ProgressBars } from "./scenes/ProgressBars";
import { SeverityCards } from "./scenes/SeverityCards";
import { BrollClip } from "./scenes/BrollClip";
import { CTAOutro } from "./scenes/CTAOutro";
import { MockTweetCard } from "./scenes/MockTweetCard";
import { ComparisonCards } from "./scenes/ComparisonCards";
import { BrowserReveal } from "./scenes/BrowserReveal";
import { BadgeOverlay } from "./scenes/BadgeOverlay";
// V7 long-form scenes
import { BigStatStack } from "./scenes/BigStatStack";
import { SectionDividerCard } from "./scenes/SectionDividerCard";
import { HeroQuestion } from "./scenes/HeroQuestion";
import { TimelineConnector } from "./scenes/TimelineConnector";
import { SplitFactCard } from "./scenes/SplitFactCard";
import { UrlRevealCard } from "./scenes/UrlRevealCard";
import { TabSelectorPillars } from "./scenes/TabSelectorPillars";
import { TestimonialCards } from "./scenes/TestimonialCards";
import { CommunityQuoteGrid } from "./scenes/CommunityQuoteGrid";
import { BrandOutroBumper } from "./scenes/BrandOutroBumper";
// Tier-1 shorts-native additions (reel-generator pipeline)
import { QuoteCallout } from "./scenes/QuoteCallout";
import { StatBlock } from "./scenes/StatBlock";
import { MapMoment } from "./scenes/MapMoment";
import { PricingReveal } from "./scenes/PricingReveal";
import { VsTimeline } from "./scenes/VsTimeline";
import { IconGrid } from "./scenes/IconGrid";
import { DoubleStatHero } from "./scenes/DoubleStatHero";
import { CodeInline } from "./scenes/CodeInline";

// Partial map: V7 long-form scenes (StatReveal, HeroQuestion, etc) are declared
// in the SceneName enum but implemented progressively. Missing entries render
// null in the Sequence block below.
const SCENE_MAP: Partial<Record<SceneName, React.FC<any>>> = {
  VersionReveal,
  CommandPills,
  CounterPain,
  SkillLabel,
  MockTerminal,
  MockEditor,
  SkillDone,
  ProgressBars,
  SeverityCards,
  BrollClip,
  CTAOutro,
  MockTweetCard,
  ComparisonCards,
  BrowserReveal,
  BadgeOverlay,
  // V7 long-form scenes
  BigStatStack,
  SectionDividerCard,
  HeroQuestion,
  TimelineConnector,
  SplitFactCard,
  UrlRevealCard,
  TabSelectorPillars,
  TestimonialCards,
  CommunityQuoteGrid,
  BrandOutroBumper,
  // StatReveal aliased to BigStatStack (single-stat case just uses 1-item stats[])
  StatReveal: BigStatStack,
  // SponsorCard / SponsorCourseCard fall back to SectionDividerCard for V7 v1
  // (forensic shows sponsor is primarily an audio cassette; visual is chapter-like)
  SponsorCard: SectionDividerCard,
  SponsorCourseCard: SectionDividerCard,
  // Tier-1 shorts-native additions
  QuoteCallout,
  StatBlock,
  MapMoment,
  PricingReveal,
  VsTimeline,
  IconGrid,
  DoubleStatHero,
  CodeInline,
};

// Thin orange progress bar flush to top edge, DIY Smart Code signature.
// Fills left-to-right across the full runtime, always visible (not inside SceneFade).
const TopProgressBar: React.FC<{ totalFrames: number; color: string }> = ({
  totalFrames,
  color,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, Math.max(1, totalFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: "rgba(255,255,255,0.08)",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: color,
          boxShadow: `0 0 12px ${color}99`,
        }}
      />
    </div>
  );
};

export const AdaptiveShort: React.FC<AdaptiveShortProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const theme = BRAND[props.brand];
  const [captions, setCaptions] = useState<CaptionsFile | null>(null);

  useEffect(() => {
    const h = delayRender("load-captions-router");
    fetch(staticFile(props.captionsSrc))
      .then((r) => r.json())
      .then((d: CaptionsFile) => { setCaptions(d); continueRender(h); })
      .catch(() => continueRender(h));
  }, [props.captionsSrc]);

  if (!captions) return <AbsoluteFill style={{ background: theme.bg }} />;

  const format = props.format ?? "short";
  const isLongform = format === "longform";
  const sfxEvents = planSfx(props.beats, captions, format);
  const useComparison = props.headerStyle === "comparison" && props.comparisonHeader;
  const progressColor = ACCENT_HEX[theme.accent];

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {/* Background pattern: Shorts get the brand molecular/hex pattern;
          long-form gets a clean radial bg so the designed scenes read clean. */}
      {isLongform ? null : <BrandWatermark brand={props.brand} />}

      {/* Top-edge orange progress bar, always visible (both formats). */}
      <TopProgressBar totalFrames={durationInFrames} color={progressColor} />

      {/* Header: Shorts = centered lockup, long-form = top-right smaller glyph. */}
      {useComparison ? (
        <ComparisonHeader left={props.comparisonHeader!.left} right={props.comparisonHeader!.right} />
      ) : (
        <BrandHeader brand={props.brand} format={format} label={props.headerLabel} />
      )}

      {/* Chapter-dot ticker (long-form only, requires chapters[] metadata). */}
      {isLongform && props.chapters && props.chapters.length > 0 ? (
        <ChapterDots
          chapters={props.chapters}
          captions={captions}
          activeColor={progressColor}
          totalFrames={durationInFrames}
        />
      ) : null}

      {/* Narration. Both formats now get a ~1.2s silent lead-in baked into the
          audio file itself (generator prepends silence, captions shifted). Stinger
          plays alone over that lead-in, voice enters from its actual first word.
          No volume ducking needed here. */}
      <Audio src={staticFile(props.audioSrc)} volume={1} />

      {/* SFX layer: stinger fires at t=0 for both formats; lead-in silence in the
          narration ensures no overlap with voice. */}
      <SfxLayer events={sfxEvents} />

      {/* Scenes, timed to beat boundaries, wrapped in SceneFade so cuts feel smooth.
          Gap-closing: extend each beat's Sequence to run until the next beat's
          startSec (or end of video for the last beat). Without this extension,
          the 0.3-1.5s silence between beat captions renders as a black frame
          because no Sequence covers those frames. */}
      {props.beats.map((beat, idx) => {
        const ct = captions.beats.find((c) => c.id === beat.id);
        if (!ct) return null;
        const startFrame = Math.round(ct.startSec * fps);
        // Find the next beat that has a captions window so we can extend into
        // the silence between them. If this is the last beat, extend to end.
        let extendedEndSec: number = ct.endSec;
        for (let j = idx + 1; j < props.beats.length; j++) {
          const nextCt = captions.beats.find((c) => c.id === props.beats[j].id);
          if (nextCt) {
            extendedEndSec = nextCt.startSec;
            break;
          }
        }
        // Last-beat fallback: extend to the composition end.
        const isLastBeatWithCaptions = !props.beats
          .slice(idx + 1)
          .some((b) => captions.beats.find((c) => c.id === b.id));
        if (isLastBeatWithCaptions) {
          extendedEndSec = Math.max(ct.endSec, durationInFrames / fps);
        }
        const endFrame = Math.round(extendedEndSec * fps);
        const durFrames = Math.max(1, endFrame - startFrame);
        const Scene = SCENE_MAP[beat.scene];
        if (!Scene) return null;
        return (
          <Sequence key={beat.id} from={startFrame} durationInFrames={durFrames}>
            <SceneFade durationInFrames={durFrames}>
              <Scene props={beat.props} durationInFrames={durFrames} />
            </SceneFade>
          </Sequence>
        );
      })}

      {/* Burned-in Hinglish captions.
          - captionsMode "auto": suppress for scenes that already have
            on-screen UI text carrying the beat.
          - "always": show captions for every beat (reel-generator default so
            viewers read along consistently throughout the reel).
          - "never": no burned captions at all. */}
      {(() => {
        const mode = props.captionsMode ?? "auto";
        if (isLongform || mode === "never") return null;
        const legacySuppress = new Set([
          "VersionReveal",
          "SkillLabel",
          "CTAOutro",
          "BrollClip",
          "MockTweetCard",
          "ComparisonCards",
          "BrowserReveal",
          "BadgeOverlay",
          "CommandPills",
        ]);
        const suppressForBeats =
          mode === "always"
            ? []
            : props.beats.filter((b) => legacySuppress.has(b.scene)).map((b) => b.id);
        return (
          <HinglishCaption
            captionsSrc={props.captionsSrc}
            accentColor={ACCENT_HEX[theme.accent]}
            wordsPerChunk={3}
            suppressForBeats={suppressForBeats}
            wordEffect={props.captionWordEffect}
          />
        );
      })()}

      <ChannelWatermark format={format} label={props.channelLabel} />
    </AbsoluteFill>
  );
};
