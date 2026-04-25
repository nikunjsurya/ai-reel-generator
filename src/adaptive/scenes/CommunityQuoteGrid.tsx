import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: mono } = loadMono();

type CommunityQuote = {
  category: string;
  color: string;
  text: string;
  author?: string;
};

// Community objections/verdicts card grid. DG2f8 pattern: starts 2-up,
// animates to 2x2. Each card has a colored category pill top-left.
// 1 of 5 videos, one-off, but included for replication parity.
export const CommunityQuoteGrid: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];

  const quotes = ((props as any).quotes as CommunityQuote[]) ?? [];
  const headline = props.headline ?? "What The Community Says";
  const kicker = (props as any).kicker as string | undefined;

  const headFade = spring({ frame, fps, config: { damping: 16 } });
  const kickerFade = spring({ frame: frame - 2, fps, config: { damping: 16 } });

  // First 2 cards visible from frame ~10. Cards 3+4 appear at ~55% of scene.
  const midpoint = Math.floor(durationInFrames * 0.55);

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "180px 80px 120px", gap: 32,
    }}>
      {kicker && (
        <div style={{
          fontFamily: mono, fontSize: 18, letterSpacing: 3,
          color: ACCENT_HEX[theme.accent], textTransform: "uppercase",
          opacity: kickerFade,
        }}>
          {kicker}
        </div>
      )}
      <div style={{
        fontFamily: inter, fontSize: 48, fontWeight: 900,
        color: theme.textHeader, opacity: headFade,
        textAlign: "center", letterSpacing: -0.5, lineHeight: 1.15,
      }}>
        {headline}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 22, width: "100%", maxWidth: 1500,
        marginTop: 20,
      }}>
        {quotes.slice(0, 4).map((q, i) => {
          const color = ACCENT_HEX[q.color as keyof typeof ACCENT_HEX] ?? q.color ?? "#94A3B8";
          const delayFrames = i < 2 ? 10 + i * 10 : midpoint + (i - 2) * 10;
          const appear = spring({ frame: frame - delayFrames, fps, config: { damping: 14 } });
          if (appear < 0.01) return <div key={i} />;
          return (
            <div key={i} style={{
              padding: "24px 28px",
              borderRadius: 18,
              background: `linear-gradient(150deg, ${color}16, ${color}04)`,
              border: `1px solid ${color}55`,
              opacity: appear,
              transform: `translateY(${(1 - appear) * 20}px) scale(${0.96 + appear * 0.04})`,
              display: "flex", flexDirection: "column", gap: 16,
              minHeight: 200,
            }}>
              <div style={{
                alignSelf: "flex-start",
                padding: "5px 14px", borderRadius: 999,
                background: `${color}22`, border: `1px solid ${color}66`,
                fontFamily: mono, fontSize: 14, fontWeight: 800,
                letterSpacing: 2, color, textTransform: "uppercase",
              }}>
                {q.category}
              </div>
              <div style={{
                fontFamily: playfair, fontSize: 22, fontStyle: "italic",
                color: theme.textHeader, lineHeight: 1.4,
                flex: 1,
              }}>
                &ldquo;{q.text}&rdquo;
              </div>
              {q.author && (
                <div style={{
                  fontFamily: inter, fontSize: 15, color: "#94A3B8",
                }}>
                  {q.author}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
