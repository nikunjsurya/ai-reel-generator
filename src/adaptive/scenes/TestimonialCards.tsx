import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: mono } = loadMono();

type Testimonial = {
  company: string;
  quote: string;
  author: string;
  title?: string;
  accent?: string;
  glyph?: string; // emoji or single char logo placeholder
};

// Sequential reveal: starts as 1 quote, adds card 2, then card 3. DG2f8 pattern.
// Measured in 3 of 5 long-forms as a recurring proof device.
export const TestimonialCards: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];

  const cards = ((props as any).cards as Testimonial[]) ?? [];
  const revealMode = ((props as any).revealMode as "sequential" | "all") ?? "sequential";
  const kicker = (props as any).kicker as string | undefined;
  const headline = props.headline;

  const palette = ["coral", "green", "purple", "yellow"];

  const cardCount = Math.max(1, cards.length);
  const firstCardFrom = 6;
  const stepFrames = Math.max(18, Math.floor((durationInFrames - firstCardFrom) / (cardCount + 1)));

  const kickerFade = spring({ frame, fps, config: { damping: 16 } });
  const headFade = spring({ frame: frame - 4, fps, config: { damping: 15 } });

  const visibleCount = revealMode === "all"
    ? cardCount
    : Math.min(cardCount, Math.max(1, Math.floor((frame - firstCardFrom) / stepFrames) + 1));

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "180px 80px 120px", gap: 40,
    }}>
      {kicker && (
        <div style={{
          fontFamily: mono, fontSize: 20, letterSpacing: 3,
          color: ACCENT_HEX.green, textTransform: "uppercase",
          opacity: kickerFade,
        }}>
          {kicker}
        </div>
      )}
      {headline && (
        <div style={{
          fontFamily: inter, fontSize: 48, fontWeight: 900,
          color: theme.textHeader, opacity: headFade,
          textAlign: "center", letterSpacing: -0.5, lineHeight: 1.15,
        }}>
          {headline}
        </div>
      )}

      <div style={{
        display: "flex", gap: 24, width: "100%",
        justifyContent: "center", flexWrap: "wrap",
        marginTop: 16, alignItems: "stretch",
      }}>
        {cards.slice(0, visibleCount).map((c, i) => {
          const accentKey = (c.accent as keyof typeof ACCENT_HEX) ??
            (palette[i % palette.length] as keyof typeof ACCENT_HEX);
          const accent = ACCENT_HEX[accentKey];
          const appearFrom = firstCardFrom + i * stepFrames;
          const appear = spring({ frame: frame - appearFrom, fps, config: { damping: 14, stiffness: 90 } });
          return (
            <div key={i} style={{
              flex: 1, maxWidth: visibleCount === 1 ? 900 : visibleCount === 2 ? 560 : 440,
              minWidth: 280,
              padding: "30px 32px",
              borderRadius: 20,
              background: `linear-gradient(150deg, ${accent}14, ${accent}04)`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 40px ${accent}22`,
              opacity: appear,
              transform: `translateY(${(1 - appear) * 20}px) scale(${0.96 + appear * 0.04})`,
              display: "flex", flexDirection: "column", gap: 18,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {c.glyph ? (
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${accent}22`, border: `1px solid ${accent}66`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22,
                  }}>
                    {c.glyph}
                  </div>
                ) : null}
                <div style={{
                  fontFamily: inter, fontSize: 22, fontWeight: 800,
                  color: accent, letterSpacing: 0.3,
                }}>
                  {c.company}
                </div>
              </div>
              <div style={{
                fontFamily: playfair, fontSize: 26, fontStyle: "italic",
                color: theme.textHeader, lineHeight: 1.35,
                flex: 1,
              }}>
                &ldquo;{c.quote}&rdquo;
              </div>
              <div style={{
                borderTop: `1px solid ${accent}33`, paddingTop: 14,
                display: "flex", flexDirection: "column", gap: 2,
              }}>
                <div style={{
                  fontFamily: inter, fontSize: 18, fontWeight: 700,
                  color: theme.textHeader,
                }}>
                  {c.author}
                </div>
                {c.title && (
                  <div style={{
                    fontFamily: inter, fontSize: 15, color: "#94A3B8",
                  }}>
                    {c.title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
