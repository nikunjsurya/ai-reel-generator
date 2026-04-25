import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ACCENT_HEX } from "../brand";
import type { AccentKey } from "../types";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// Alert overlay pill: enters from an off-screen edge, springs into view,
// holds, then slides back out near the end. Emits a sync'd stab via the
// `slidein_badge` SFX hint (registered in SfxLayer).
export const SlideInBadge: React.FC<{
  text: string;
  accent?: AccentKey;
  enterFrom?: "top-left" | "top-right" | "bottom";
  holdFrames?: number;
  durationInFrames: number;
}> = ({ text, accent = "orange", enterFrom = "top-left", holdFrames, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = ACCENT_HEX[accent];

  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140 },
  });
  // Badge holds through the full beat, exits during the last ~12 frames.
  // If holdFrames is explicitly set, respect it as a ceiling.
  const exitStart =
    holdFrames !== undefined
      ? Math.min(durationInFrames - 12, 10 + holdFrames)
      : Math.max(20, durationInFrames - 12);
  const exitProgress = interpolate(frame, [exitStart, exitStart + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const offsets: Record<string, { initial: string; origin: React.CSSProperties }> = {
    "top-left": {
      initial: "translateX(-120%)",
      origin: { top: 180, left: 30 },
    },
    "top-right": {
      initial: "translateX(120%)",
      origin: { top: 180, right: 30 },
    },
    bottom: {
      initial: "translateY(140%)",
      origin: { bottom: 200, left: 0, right: 0, justifyContent: "center", display: "flex" },
    },
  };

  const cfg = offsets[enterFrom];
  const enterT = enterProgress;
  const exitT = exitProgress;

  return (
    <div
      style={{
        position: "absolute",
        ...cfg.origin,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 26px",
          borderRadius: 16,
          background: "rgba(10, 16, 32, 0.9)",
          border: `2px solid ${color}`,
          boxShadow: `0 0 30px ${color}44`,
          fontFamily: inter,
          color: color,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: "uppercase",
          transform:
            enterT < 1
              ? cfg.initial.replace(
                  /-?\d+/,
                  (n) => `${parseFloat(n) * (1 - enterT)}`
                )
              : exitT > 0
                ? `translateY(${exitT * -30}px)`
                : "none",
          opacity: enterT * (1 - exitT),
        }}
      >
        <span style={{ fontSize: 22, opacity: 0.75 }}>⚠</span>
        {text}
      </div>
    </div>
  );
};
