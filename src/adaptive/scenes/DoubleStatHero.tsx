import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// DoubleStatHero, two massive stats stacked vertically, each with a label.
// Visually heavier than BadgeOverlay. Different from StatBlock (which is a
// 2x2 grid of smaller tiles); this one presents TWO hero numbers as the
// whole point of the beat.
// Props: { leftStat: {label, value}, rightStat: {label, value},
//   separator?: string (e.g. "+", "vs", "→"; default "+"),
//   headline?: string }
export const DoubleStatHero: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const accent2 = ACCENT_HEX[props.accent2 ?? theme.accent2];

  const data = props as unknown as {
    leftStat?: { label: string; value: string };
    rightStat?: { label: string; value: string };
    separator?: string;
  };
  const left = data.leftStat;
  const right = data.rightStat;
  const sep = data.separator ?? "+";

  const headFade = spring({ frame, fps, config: { damping: 15 } });
  const leftSpring = spring({ frame: frame - 8, fps, config: { damping: 12, stiffness: 110 } });
  const rightSpring = spring({ frame: frame - 22, fps, config: { damping: 12, stiffness: 110 } });
  const sepFade = spring({ frame: frame - 34, fps, config: { damping: 15 } });
  const outFade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const renderStat = (stat: { label: string; value: string } | undefined, color: string, springVal: number) => {
    if (!stat) return null;
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 8,
        opacity: springVal,
        transform: `scale(${0.8 + springVal * 0.2})`,
      }}>
        <div style={{
          fontFamily: inter, fontSize: 140, fontWeight: 900,
          color, lineHeight: 1, letterSpacing: -4,
          textShadow: `0 0 50px ${color}66`,
        }}>{stat.value}</div>
        <div style={{
          fontFamily: inter, fontSize: 24, fontWeight: 700,
          color: "#cbd5e1", letterSpacing: 3, textTransform: "uppercase",
        }}>{stat.label}</div>
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${accent}0f 0%, transparent 40%, ${accent2}0f 100%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 40px", gap: 40,
      }}>
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 42, fontWeight: 800,
            color: theme.textHeader, textAlign: "center", maxWidth: 800,
            opacity: headFade,
            transform: `translateY(${(1 - headFade) * 12}px)`,
          }}>{props.headline}</div>
        )}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        }}>
          {renderStat(left, accent, leftSpring)}
          <div style={{
            fontFamily: inter, fontSize: 72, fontWeight: 300,
            color: "#64748b", lineHeight: 1,
            opacity: sepFade,
            transform: `scale(${sepFade})`,
          }}>{sep}</div>
          {renderStat(right, accent2, rightSpring)}
        </div>
      </div>
    </div>
  );
};
