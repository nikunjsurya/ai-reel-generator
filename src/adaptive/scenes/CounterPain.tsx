import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

export const CounterPain: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent2 ?? "red"];
  const counter = props.counter;
  const counterValue = counter
    ? Math.round(interpolate(
        frame / fps,
        [0.2, 0.2 + (counter.durationSec ?? 3)],
        [counter.from, counter.to],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      ))
    : 0;

  const headFade = spring({ frame, fps, config: { damping: 15 } });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start",
      paddingTop: 240, gap: 26,
    }}>
      {props.headline && (
        <div style={{
          fontFamily: inter, fontSize: 68, fontWeight: 900,
          color: theme.textHeader, opacity: headFade, textAlign: "center",
          maxWidth: 900, lineHeight: 1.1,
        }}>
          {props.headline}{" "}
          <span style={{ color: accent }}>everywhere.</span>
        </div>
      )}
      {counter && (
        <div style={{
          marginTop: 14,
          padding: "18px 42px", borderRadius: 999,
          border: `2px solid ${accent}`,
          background: `${accent}14`,
          boxShadow: `0 0 60px ${accent}44, inset 0 0 20px ${accent}22`,
          display: "flex", alignItems: "center", gap: 32,
          fontFamily: inter, fontSize: 32, fontWeight: 800,
          color: accent, letterSpacing: 1.3, textTransform: "uppercase",
        }}>
          <span>{counter.label}</span>
          <span style={{
            fontSize: 60, fontWeight: 900, color: accent, letterSpacing: -1,
            minWidth: 120, textAlign: "right",
          }}>{counterValue}</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20, width: "82%" }}>
        {props.items?.map((it, i) => {
          const appear = spring({ frame: frame - (24 + i * 14), fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 24px", borderRadius: 14,
              border: `1px solid ${accent}55`,
              background: "rgba(15,23,41,0.6)",
              fontFamily: mono, fontSize: 32, fontWeight: 500,
              color: theme.textHeader,
              opacity: appear, transform: `translateY(${(1 - appear) * 12}px)`,
            }}>
              <span>{it.text}</span>
              {it.count && (
                <span style={{
                  fontSize: 28, fontWeight: 700, color: accent,
                  padding: "4px 14px", borderRadius: 999,
                  background: `${accent}20`, border: `1px solid ${accent}66`,
                }}>{it.count}</span>
              )}
            </div>
          );
        })}
      </div>
      {props.footer && (
        <div style={{
          marginTop: 24, fontFamily: inter, fontSize: 36, fontWeight: 700,
          color: theme.textHeader,
          opacity: spring({ frame: frame - 80, fps, config: { damping: 14 } }),
        }}>{props.footer}</div>
      )}
    </div>
  );
};
