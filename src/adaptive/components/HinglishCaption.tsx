import {
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  delayRender,
  continueRender,
  interpolate,
} from "remotion";
import { useEffect, useState } from "react";
import { loadFont as loadHind } from "@remotion/google-fonts/Hind";
import { loadFont as loadTiro } from "@remotion/google-fonts/TiroDevanagariHindi";
import type { CaptionsFile } from "../types";

const { fontFamily: hindFamily } = loadHind();
const { fontFamily: tiroFamily } = loadTiro();

type Word = { text: string; start: number; end: number };

function chunkWords(words: Word[], target: number): Word[][] {
  const chunks: Word[][] = [];
  let current: Word[] = [];
  // Keep chunks under ~40 chars AND at most `target + 1` words so the
  // caption pill fits the 960px-wide container at 46pt without clipping.
  // Hinglish words mix Devanagari and Latin glyphs, so we cap on both.
  const HARD_MAX_WORDS = target + 1;
  const HARD_MAX_CHARS = 38;
  const currentChars = () =>
    current.reduce((sum, w) => sum + w.text.length, 0) + Math.max(0, current.length - 1);
  for (const w of words) {
    current.push(w);
    const hasEndPunct = /[।.?!,]$/.test(w.text);
    const overWords = current.length >= HARD_MAX_WORDS;
    const overChars = currentChars() >= HARD_MAX_CHARS;
    const hitTarget = current.length >= target && hasEndPunct;
    if (hitTarget || overWords || overChars) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length === 1 && chunks.length > 0) chunks[chunks.length - 1].push(current[0]);
  else if (current.length > 0) chunks.push(current);
  return chunks;
}

// Per-letter magnifier: letters near the "just-spoken" position scale up in
// a gaussian wave that follows the voice through the word. Base scale 1.0,
// peak scale 1.32 at the exact spoken letter, falloff σ≈1.15 letters so the
// wave is 2-3 letters wide. Also lifts brightness at peak.
function magnifyScale(letterIndex: number, spokenPos: number) {
  const d = letterIndex - spokenPos;
  const gaussian = Math.exp(-(d * d) / (2 * 1.15 * 1.15));
  return 1 + 0.32 * gaussian;
}
function magnifyLift(letterIndex: number, spokenPos: number) {
  const d = letterIndex - spokenPos;
  const gaussian = Math.exp(-(d * d) / (2 * 1.15 * 1.15));
  return -6 * gaussian; // px lift toward peak
}

export const HinglishCaption: React.FC<{
  captionsSrc: string;
  accentColor: string;
  wordsPerChunk?: number;
  suppressForBeats?: string[];
  // "pulse" = legacy behavior (whole word flips to accent + weight 900).
  // "magnify" = gaussian-waves-each-letter-as-spoken. Reel-generator uses
  // "magnify" for a more appealing read-along feel.
  wordEffect?: "pulse" | "magnify";
}> = ({
  captionsSrc,
  accentColor,
  wordsPerChunk = 3,
  suppressForBeats = [],
  wordEffect = "pulse",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [captions, setCaptions] = useState<CaptionsFile | null>(null);

  useEffect(() => {
    const handle = delayRender("load-captions");
    fetch(staticFile(captionsSrc))
      .then((r) => r.json())
      .then((data: CaptionsFile) => { setCaptions(data); continueRender(handle); })
      .catch(() => continueRender(handle));
  }, [captionsSrc]);

  if (!captions) return null;

  const nowSec = frame / fps;

  // Skip captions during beats listed in suppressForBeats
  const activeBeat = captions.beats.find((b) => nowSec >= b.startSec && nowSec < b.endSec);
  if (activeBeat && suppressForBeats.includes(activeBeat.id)) return null;

  const chunks = chunkWords(captions.words, wordsPerChunk);

  let active: Word[] | null = null;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const chunkStart = c[0].start;
    const next = chunks[i + 1];
    const screenEnd = next ? next[0].start : c[c.length - 1].end + 0.5;
    if (nowSec >= chunkStart && nowSec < screenEnd) { active = c; break; }
  }
  if (!active) return null;

  const chunkStart = active[0].start;
  const enterProgress = interpolate(nowSec - chunkStart, [0, 0.15], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const enterY = (1 - enterProgress) * 16;

  const renderMagnify = (w: Word, isCurrent: boolean) => {
    if (!isCurrent) {
      // Non-current word: render plain spans, no animation.
      return w.text.split("").map((ch, li) => (
        <span key={li} style={{ display: "inline-block", color: "white", fontWeight: 700 }}>{ch}</span>
      ));
    }
    const wordDur = Math.max(0.08, w.end - w.start);
    const progress = Math.min(1, Math.max(0, (nowSec - w.start) / wordDur));
    // Spoken position walks from 0..len-1 across the word's duration.
    const spokenPos = progress * Math.max(0, w.text.length - 1);
    return w.text.split("").map((ch, li) => {
      const scale = magnifyScale(li, spokenPos);
      const lift = magnifyLift(li, spokenPos);
      // Peak letter gets accent color; rest of the word eases toward white.
      const peakStrength = Math.max(0, (scale - 1) / 0.32); // 0..1
      return (
        <span key={li} style={{
          display: "inline-block",
          transform: `translateY(${lift}px) scale(${scale})`,
          transformOrigin: "bottom center",
          color: peakStrength > 0.5 ? accentColor : "white",
          fontWeight: peakStrength > 0.5 ? 900 : 700,
          textShadow: peakStrength > 0.5
            ? `0 2px 12px ${accentColor}cc, 0 2px 8px rgba(0,0,0,0.9)`
            : "0 2px 8px rgba(0,0,0,0.9)",
          willChange: "transform",
        }}>{ch}</span>
      );
    });
  };

  return (
    <div style={{
      position: "absolute", bottom: 240, left: 60, right: 60,
      display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{
        fontFamily: `${hindFamily}, ${tiroFamily}, "Noto Sans Devanagari", sans-serif`,
        fontSize: 46, fontWeight: 700, color: "white", textAlign: "center",
        lineHeight: 1.25, letterSpacing: 0.2, padding: "16px 28px", borderRadius: 12,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(12px)",
        border: `1px solid ${accentColor}44`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}22`,
        opacity: enterProgress, transform: `translateY(${enterY}px)`,
        maxWidth: "100%", textShadow: "0 2px 8px rgba(0,0,0,0.9)",
      }}>
        {active.map((w, i) => {
          const isCurrent = nowSec >= w.start && nowSec < w.end;
          if (wordEffect === "magnify") {
            return (
              <span key={i} style={{
                display: "inline-block",
                marginRight: i < active!.length - 1 ? "0.35em" : 0,
              }}>
                {renderMagnify(w, isCurrent)}
              </span>
            );
          }
          return (
            <span key={i} style={{
              color: isCurrent ? accentColor : "white",
              marginRight: i < active!.length - 1 ? "0.35em" : 0,
              fontWeight: isCurrent ? 900 : 700,
            }}>{w.text}</span>
          );
        })}
      </div>
    </div>
  );
};
