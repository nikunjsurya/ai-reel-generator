import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// IconGrid, 2xN grid of company/tool/service name tiles, each tile animated
// in with a staggered spring. No real logos (keeps pipeline free of logo
// fetching + licensing); each tile shows the text name over a brand-colored
// chip. Reads as "works with / integrated with / partnered with" at a glance.
// Props: { headline?: string, items: [string] (4-8), subhead?: string }
export const IconGrid: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const accent2 = ACCENT_HEX[props.accent2 ?? theme.accent2];

  const data = props as unknown as { items?: string[] };
  const items = Array.isArray(data.items) ? data.items.slice(0, 8) : [];

  const headFade = spring({ frame, fps, config: { damping: 15 } });
  const outFade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Grid columns: 2 for ≤4 items, 3 for 5-8.
  const cols = items.length > 4 ? 3 : 2;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", gap: 36,
      }}>
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 48, fontWeight: 900,
            color: theme.textHeader, textAlign: "center",
            lineHeight: 1.15, maxWidth: 820,
            opacity: headFade,
            transform: `translateY(${(1 - headFade) * 12}px)`,
          }}>{props.headline}</div>
        )}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 18,
          width: "100%", maxWidth: 860,
        }}>
          {items.map((it, i) => {
            const itemSpring = spring({ frame: frame - 8 - i * 4, fps, config: { damping: 15, stiffness: 140 } });
            const tileAccent = i % 2 === 0 ? accent : accent2;
            return (
              <div key={i} style={{
                padding: "22px 14px",
                borderRadius: 14,
                background: `${tileAccent}14`,
                border: `1.5px solid ${tileAccent}66`,
                boxShadow: `0 4px 24px ${tileAccent}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: inter, fontSize: 26, fontWeight: 800,
                color: theme.textHeader,
                textAlign: "center",
                opacity: itemSpring,
                transform: `translateY(${(1 - itemSpring) * 14}px) scale(${0.92 + itemSpring * 0.08})`,
              }}>{it}</div>
            );
          })}
        </div>
        {props.subhead && (
          <div style={{
            fontFamily: inter, fontSize: 26, color: "#cbd5e1",
            textAlign: "center", maxWidth: 700, lineHeight: 1.4,
            opacity: headFade,
          }}>{props.subhead}</div>
        )}
      </div>
    </div>
  );
};
