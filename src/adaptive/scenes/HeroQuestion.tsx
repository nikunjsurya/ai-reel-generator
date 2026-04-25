import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { HeroKickerPill } from "../components/HeroKickerPill";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

const { fontFamily: playfair } = loadPlayfair();

// V1 (DG2f8) baseline opener: cream serif rhetorical question + coral subtitle.
// Voice-first hook (no SFX stinger). Confirmed one-off in the triangulation
// (most videos lead with a stat), but needed for replication parity.
export const HeroQuestion: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const question = props.headline ?? (props as any).question ?? "";
  const subtitle = props.subhead ?? (props as any).subtitle ?? "";
  const kickerPill = (props as any).kickerPill as string | undefined;

  const qSpring = spring({ frame: frame - 2, fps, config: { damping: 13, stiffness: 90 } });
  const subFade = spring({ frame: frame - 18, fps, config: { damping: 16 } });
  const translate = interpolate(qSpring, [0, 1], [24, 0]);
  const qLen = question.length;
  const qSize = qLen <= 20 ? 120 : qLen <= 34 ? 96 : qLen <= 50 ? 74 : 60;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 28, padding: "0 140px",
    }}>
      {kickerPill ? <HeroKickerPill label={kickerPill} color={accent} /> : null}
      <div style={{
        fontFamily: playfair, fontSize: qSize,
        fontWeight: 600, color: theme.textHeader,
        opacity: qSpring, transform: `translateY(${translate}px)`,
        letterSpacing: -1, textAlign: "center",
        lineHeight: 1.08,
        textShadow: "0 8px 28px rgba(0,0,0,0.7)",
      }}>
        {question}
      </div>
      {subtitle && (
        <div style={{
          fontFamily: playfair, fontStyle: "italic",
          fontSize: qLen <= 34 ? 42 : 34,
          fontWeight: 400, color: accent,
          opacity: subFade, letterSpacing: 0.3,
          textAlign: "center",
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
