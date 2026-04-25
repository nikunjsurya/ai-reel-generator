import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: inter } = loadInter();

// QuoteCallout, large pull-quote center-stage with oversize decorative quote
// marks. Used when the narration is calling out a headline, a direct quote
// from a source, or a provocative statement.
// Props carried on SceneProps via passthrough:
//   quote: string (required)
//   attribution?: string
//   kicker?: string (small label above the quote, e.g. "ANTHROPIC · CEO")
export const QuoteCallout: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const data = props as unknown as { quote?: string; attribution?: string; kicker?: string };
  const quote = data.quote || props.headline || "";
  const attribution = data.attribution;
  const kicker = data.kicker;

  const markSpring = spring({ frame, fps, config: { damping: 14 } });
  const quoteSpring = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  const attrFade = spring({ frame: frame - 30, fps, config: { damping: 16 } });
  const outFade = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      {/* Radial accent wash so the quote feels lit */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% 45%, ${accent}1a 0%, transparent 65%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 80px", gap: 32,
      }}>
        {kicker && (
          <div style={{
            fontFamily: inter, fontSize: 22, fontWeight: 700,
            color: accent, letterSpacing: 4, textTransform: "uppercase",
            opacity: markSpring,
          }}>{kicker}</div>
        )}
        <div style={{
          fontFamily: playfair, fontSize: 220, fontWeight: 900,
          color: accent, lineHeight: 0.7,
          transform: `scale(${markSpring})`, textShadow: `0 0 60px ${accent}33`,
        }}>"</div>
        <div style={{
          fontFamily: playfair, fontSize: 52, fontWeight: 700,
          color: theme.textHeader, textAlign: "center",
          lineHeight: 1.25, letterSpacing: -0.5,
          maxWidth: 900,
          opacity: quoteSpring,
          transform: `translateY(${(1 - quoteSpring) * 20}px)`,
        }}>{quote}</div>
        {attribution && (
          <div style={{
            fontFamily: inter, fontSize: 28, fontWeight: 600,
            color: "#cbd5e1", letterSpacing: 1.5, textTransform: "uppercase",
            opacity: attrFade,
          }}>— {attribution}</div>
        )}
      </div>
    </div>
  );
};
