import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

// VsTimeline, horizontal timeline with 3-5 dated markers. Used to show a
// short history: "2022 → 2023 → now" or version evolution "v1 → v2 → v3".
// Different from the V7 TimelineConnector scene which is a vertical chapter
// sequence; this one is compact + 9:16 friendly.
// Props: { headline?: string, markers: [{label, date, highlight?: boolean}] (3-5) }
export const VsTimeline: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const data = props as unknown as {
    markers?: { label: string; date: string; highlight?: boolean }[];
  };
  const markers = Array.isArray(data.markers) ? data.markers.slice(0, 5) : [];

  const headFade = spring({ frame, fps, config: { damping: 15 } });
  // Line-draw progresses across all markers (one beat per marker).
  const lineProgress = interpolate(frame, [12, 12 + markers.length * 10], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const outFade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", gap: 60,
      }}>
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 50, fontWeight: 900,
            color: theme.textHeader, textAlign: "center", maxWidth: 800,
            opacity: headFade,
          }}>{props.headline}</div>
        )}
        <div style={{
          position: "relative", width: "100%", maxWidth: 880,
          padding: "80px 40px",
        }}>
          {/* Draw line */}
          <div style={{
            position: "absolute", top: "50%", left: 40, right: 40,
            height: 3, background: `${accent}33`, borderRadius: 2,
            transform: "translateY(-50%)",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: 40,
            height: 3, background: accent, borderRadius: 2,
            width: `calc((100% - 80px) * ${lineProgress})`,
            transform: "translateY(-50%)",
            boxShadow: `0 0 12px ${accent}`,
          }} />
          {/* Markers */}
          <div style={{
            position: "relative",
            display: "flex", justifyContent: "space-between",
            alignItems: "center",
          }}>
            {markers.map((m, i) => {
              const delay = 14 + i * 10;
              const markSpring = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 130 } });
              const isHi = !!m.highlight;
              const dotSize = isHi ? 22 : 16;
              return (
                <div key={i} style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 16,
                  opacity: markSpring,
                  transform: `scale(${0.5 + markSpring * 0.5})`,
                }}>
                  {/* Date above */}
                  <div style={{
                    fontFamily: mono, fontSize: 22, fontWeight: 700,
                    color: accent, letterSpacing: 2, textTransform: "uppercase",
                  }}>{m.date}</div>
                  {/* Dot */}
                  <div style={{
                    width: dotSize, height: dotSize, borderRadius: 999,
                    background: isHi ? accent : theme.bg,
                    border: `3px solid ${accent}`,
                    boxShadow: isHi ? `0 0 20px ${accent}` : `0 0 8px ${accent}44`,
                  }} />
                  {/* Label below */}
                  <div style={{
                    fontFamily: inter, fontSize: 22, fontWeight: isHi ? 900 : 600,
                    color: isHi ? theme.textHeader : "#cbd5e1",
                    textAlign: "center", maxWidth: 180,
                    marginTop: 4,
                  }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
