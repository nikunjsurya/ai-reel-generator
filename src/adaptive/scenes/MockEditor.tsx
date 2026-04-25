import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

const colorMap: Record<string, string> = {
  key: "#7DD3FC",
  value: "#86EFAC",
  string: "#FCA5A5",
  muted: "#94A3B8",
  accent: "#E2725B",
  number: "#FBBF24",
};

export const MockEditor: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const headerFade = spring({ frame, fps, config: { damping: 15 } });
  const winFade = spring({ frame: frame - 6, fps, config: { damping: 14 } });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start", paddingTop: 240, gap: 26,
    }}>
      {props.header && (
        <div style={{
          fontFamily: inter, fontSize: 48, fontWeight: 800,
          color: accent, opacity: headerFade, maxWidth: 900, textAlign: "center", lineHeight: 1.2,
        }}>{props.header}</div>
      )}
      <div style={{
        width: "86%", borderRadius: 18,
        background: "#0b1220",
        border: `1px solid ${accent}44`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22`,
        overflow: "hidden",
        opacity: winFade, transform: `translateY(${(1 - winFade) * 24}px)`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 18px",
          background: "#0f1628", borderBottom: `1px solid ${accent}22`,
        }}>
          <div style={{ display: "flex", gap: 7 }}>
            <span style={dot("#ff5f57")} />
            <span style={dot("#febc2e")} />
            <span style={dot("#28c940")} />
          </div>
          <div style={{
            flex: 1, textAlign: "center", fontFamily: mono, fontSize: 20, color: "#94a3b8",
          }}>{props.filename ?? "file"}</div>
        </div>
        <div style={{ padding: "24px 26px", fontFamily: mono, fontSize: 26, lineHeight: 1.7 }}>
          {props.lines?.map((l, i) => {
            const appear = spring({ frame: frame - (18 + i * 8), fps, config: { damping: 14 } });
            const col = colorMap[l.color ?? "value"] ?? "#cbd5e1";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
                opacity: appear, transform: `translateX(${(1 - appear) * 14}px)`,
              }}>
                {l.check && <span style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: "#22C55E22", border: "1px solid #22C55E",
                  color: "#22C55E", fontSize: 18, fontWeight: 900,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✓</span>}
                <span style={{ color: col, whiteSpace: "pre" }}>{l.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const dot = (bg: string): React.CSSProperties => ({
  width: 13, height: 13, borderRadius: 999, background: bg,
});
