import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

export const ProgressBars: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const headFade = spring({ frame, fps, config: { damping: 15 } });
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start", paddingTop: 260, gap: 22,
    }}>
      {props.headline && (
        <div style={{
          fontFamily: inter, fontSize: 64, fontWeight: 900,
          color: theme.textHeader, textAlign: "center", opacity: headFade,
        }}>{props.headline.split(" ").map((w, i) => (
          <span key={i} style={{ color: i === 0 ? ACCENT_HEX[theme.accent2] : theme.textHeader }}>{w} </span>
        ))}</div>
      )}
      {props.subhead && (
        <div style={{
          fontFamily: inter, fontSize: 32, color: "#cbd5e1",
          maxWidth: 880, textAlign: "center", opacity: headFade,
        }}>{props.subhead}</div>
      )}
      <div style={{ width: "82%", display: "flex", flexDirection: "column", gap: 18, marginTop: 26 }}>
        {props.bars?.map((b, i) => {
          const startFrame = 20 + i * 10;
          const dur = 50;
          const pct = interpolate(frame, [startFrame, startFrame + dur], [0, b.targetPct ?? 100], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const hex = ACCENT_HEX[b.accent];
          const appear = spring({ frame: frame - i * 8, fps, config: { damping: 14 } });
          return (
            <div key={i} style={{
              padding: "14px 20px", borderRadius: 14,
              background: "rgba(15,23,41,0.6)",
              border: `1px solid ${hex}44`,
              opacity: appear,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontFamily: inter, fontSize: 30, fontWeight: 700, color: "white",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: 999, background: hex,
                    boxShadow: `0 0 14px ${hex}`,
                  }} />
                  {b.label}
                </div>
                <div style={{ fontFamily: mono, fontSize: 26, color: hex }}>{Math.round(pct)}%</div>
              </div>
              <div style={{
                marginTop: 10, height: 10, borderRadius: 999,
                background: `${hex}22`, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`, background: hex,
                  boxShadow: `0 0 14px ${hex}`, borderRadius: 999,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
