import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

// PricingReveal, big "$X / unit" price tag plus feature bullets. For pricing
// announcements, tier launches, subscription news.
// Props: { price: string (e.g. "$20"), unit: string (e.g. "/mo"),
//   tier?: string (e.g. "PRO"), features: [string] (3-5),
//   headline?: string, subhead?: string }
export const PricingReveal: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const data = props as unknown as { price?: string; unit?: string; tier?: string; features?: string[] };
  const price = data.price || "$0";
  const unit = data.unit || "/mo";
  const tier = data.tier;
  const features = Array.isArray(data.features) ? data.features.slice(0, 6) : [];

  const tierSpring = spring({ frame, fps, config: { damping: 14 } });
  const priceSpring = spring({ frame: frame - 4, fps, config: { damping: 13, stiffness: 90 } });
  const outFade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% 35%, ${accent}22 0%, transparent 65%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", gap: 28,
      }}>
        {tier && (
          <div style={{
            fontFamily: mono, fontSize: 26, fontWeight: 700,
            letterSpacing: 6, color: accent, textTransform: "uppercase",
            padding: "10px 22px", borderRadius: 999,
            border: `2px solid ${accent}`, background: `${accent}14`,
            opacity: tierSpring,
          }}>{tier}</div>
        )}
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 44, fontWeight: 800,
            color: theme.textHeader, textAlign: "center", maxWidth: 800,
            opacity: tierSpring,
          }}>{props.headline}</div>
        )}
        <div style={{
          display: "flex", alignItems: "baseline", gap: 10,
          transform: `scale(${priceSpring})`,
          opacity: priceSpring,
        }}>
          <div style={{
            fontFamily: inter, fontSize: 220, fontWeight: 900,
            color: accent, lineHeight: 1, letterSpacing: -6,
            textShadow: `0 0 60px ${accent}66`,
          }}>{price}</div>
          <div style={{
            fontFamily: inter, fontSize: 48, fontWeight: 700,
            color: "#cbd5e1",
          }}>{unit}</div>
        </div>
        {features.length > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 14,
            marginTop: 8,
          }}>
            {features.map((f, i) => {
              const fSpring = spring({ frame: frame - 24 - i * 8, fps, config: { damping: 16 } });
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  fontFamily: inter, fontSize: 30, fontWeight: 600,
                  color: theme.textHeader,
                  opacity: fSpring,
                  transform: `translateX(${(1 - fSpring) * -14}px)`,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 999,
                    background: accent, boxShadow: `0 0 12px ${accent}`,
                  }} />
                  {f}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
