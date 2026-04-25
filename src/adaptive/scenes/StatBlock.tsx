import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// StatBlock, 2x2 stat grid with a headline above. Each stat has label + value.
// Difference from BigStatStack: designed for 9:16, 4 tiles in a grid, heavy
// numeric values in accent color.
// Props: { headline?: string, stats: [{label, value}] (2-4) }
export const StatBlock: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const accent2 = ACCENT_HEX[props.accent2 ?? theme.accent2];

  const data = props as unknown as { stats?: { label: string; value: string }[] };
  const stats = Array.isArray(data.stats) ? data.stats.slice(0, 4) : [];
  const headFade = spring({ frame, fps, config: { damping: 15 } });
  const outFade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", gap: 40,
      }}>
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 56, fontWeight: 900,
            color: theme.textHeader, textAlign: "center",
            lineHeight: 1.15, letterSpacing: -0.5,
            opacity: headFade, transform: `translateY(${(1 - headFade) * 14}px)`,
            maxWidth: 860,
          }}>{props.headline}</div>
        )}
        <div style={{
          display: "grid",
          gridTemplateColumns: stats.length >= 3 ? "1fr 1fr" : "1fr",
          gap: 22,
          width: "100%",
          maxWidth: 860,
        }}>
          {stats.map((s, i) => {
            const tileSpring = spring({ frame: frame - 8 - i * 6, fps, config: { damping: 15 } });
            const tileAccent = i % 2 === 0 ? accent : accent2;
            return (
              <div key={i} style={{
                padding: "32px 28px",
                borderRadius: 18,
                background: `linear-gradient(135deg, ${tileAccent}1f, ${tileAccent}0a)`,
                border: `1.5px solid ${tileAccent}`,
                boxShadow: `0 8px 40px ${tileAccent}26`,
                display: "flex", flexDirection: "column", gap: 10,
                opacity: tileSpring,
                transform: `translateY(${(1 - tileSpring) * 18}px) scale(${0.96 + tileSpring * 0.04})`,
              }}>
                <div style={{
                  fontFamily: inter, fontSize: 78, fontWeight: 900,
                  color: tileAccent, lineHeight: 1,
                  textShadow: `0 0 30px ${tileAccent}55`,
                }}>{s.value}</div>
                <div style={{
                  fontFamily: inter, fontSize: 20, fontWeight: 700,
                  color: "#cbd5e1", letterSpacing: 2, textTransform: "uppercase",
                }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
