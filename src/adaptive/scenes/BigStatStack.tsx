import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

type Stat = {
  value: string;
  caption: string;
  accent?: string;
};

// 1-3 huge glowing stacked numbers, each with a small monospace caption
// beneath. Measured in 4 of 5 DIY long-forms. The most-reused new scene.
// Pass via props.stats: [{value, caption, accent}]
export const BigStatStack: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];

  const stats = ((props as any).stats as Stat[]) ?? [];
  const kicker = (props as any).kicker as string | undefined;
  const headline = props.headline;
  const accentPalette = ["coral", "cyan", "green", "blue", "yellow"];

  const kickerFade = spring({ frame, fps, config: { damping: 16 } });
  const headFade = spring({ frame: frame - 4, fps, config: { damping: 15 } });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 40, padding: "0 100px",
    }}>
      {kicker && (
        <div style={{
          fontFamily: mono, fontSize: 22, letterSpacing: 4,
          color: ACCENT_HEX[theme.accent], textTransform: "uppercase",
          opacity: kickerFade,
        }}>
          {kicker}
        </div>
      )}
      {headline && (
        <div style={{
          fontFamily: inter, fontSize: 48, fontWeight: 900,
          color: theme.textHeader, textAlign: "center",
          opacity: headFade, letterSpacing: -0.5, lineHeight: 1.15,
          maxWidth: 1200,
        }}>
          {headline}
        </div>
      )}
      <div style={{
        display: "flex", flexDirection: "column", gap: 44,
        alignItems: "center", marginTop: 8,
      }}>
        {stats.map((s, i) => {
          const accent = ACCENT_HEX[
            (s.accent as keyof typeof ACCENT_HEX) ??
            (accentPalette[i % accentPalette.length] as keyof typeof ACCENT_HEX)
          ];
          const appear = spring({
            frame: frame - (16 + i * 20),
            fps, config: { damping: 13, stiffness: 100 },
          });
          const valLen = s.value.length;
          const valSize = valLen <= 4 ? 220 : valLen <= 7 ? 180 : valLen <= 10 ? 140 : 110;
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              opacity: appear, transform: `scale(${0.8 + appear * 0.2})`,
            }}>
              <div style={{
                fontFamily: inter, fontSize: valSize, fontWeight: 900,
                color: accent, letterSpacing: -3,
                textShadow: `0 0 80px ${accent}55, 0 10px 40px rgba(0,0,0,0.6)`,
                lineHeight: 0.95,
              }}>
                {s.value}
              </div>
              <div style={{
                fontFamily: mono, fontSize: 22, fontWeight: 600,
                color: "rgba(245,237,214,0.72)", letterSpacing: 3,
                textTransform: "uppercase", marginTop: 12,
              }}>
                {s.caption}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
