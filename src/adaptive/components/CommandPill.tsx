import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import type { AccentKey } from "../types";
import { ACCENT_HEX } from "../brand";

export const CommandPill: React.FC<{
  text: string;
  accent: AccentKey;
  delay?: number;
  size?: "sm" | "md" | "lg";
  // Highlight-as-spoken (relative to the pill's sequence start, in seconds).
  // When current time is inside [highlightAtSec, highlightAtSec+highlightDurSec],
  // the pill scales up, lifts, and brightens, matching the moment the narration
  // says this pill's name. Omit both to keep the pill statically rendered.
  highlightAtSec?: number;
  highlightDurSec?: number;
}> = ({
  text,
  accent,
  delay = 0,
  size = "md",
  highlightAtSec,
  highlightDurSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = ACCENT_HEX[accent];
  const progress = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 180 } });
  const fontSize = size === "sm" ? 28 : size === "md" ? 34 : 44;
  const pad = size === "sm" ? "10px 22px" : size === "md" ? "14px 30px" : "18px 40px";

  // Compute highlight envelope, a smooth 0 → 1 → 0 shape around the spoken
  // window. Start ramps up over 150ms, stays at 1 for the middle, then eases
  // out over the last 300ms so the pill doesn't snap back abruptly.
  let hi = 0;
  if (
    typeof highlightAtSec === "number" &&
    typeof highlightDurSec === "number" &&
    highlightDurSec > 0
  ) {
    const nowSec = frame / fps;
    const start = highlightAtSec;
    const end = highlightAtSec + highlightDurSec;
    const rampIn = 0.15;
    const rampOut = 0.3;
    if (nowSec >= start && nowSec <= end) {
      const fadeIn = interpolate(nowSec, [start, start + rampIn], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const fadeOut = interpolate(nowSec, [end - rampOut, end], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      hi = Math.min(fadeIn, fadeOut);
    } else if (nowSec > end && nowSec <= end + 0.4) {
      // Soft tail so the pill doesn't feel like it snaps.
      hi = interpolate(nowSec, [end, end + 0.4], [0.2, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }

  const baseScale = 0.92 + progress * 0.08;
  const scale = baseScale + 0.14 * hi;
  const lift = (1 - progress) * 14 - 4 * hi;
  const bgAlpha = 0.06 + 0.18 * hi; // 0x10 → ~0x41
  const borderWidth = 2 + 2 * hi; // 2 → 4
  const outerGlow = 32 + 28 * hi; // 32 → 60
  const outerAlpha = 0x55 + Math.round(0x44 * hi); // 0x55..0x99
  const outerAlphaHex = outerAlpha.toString(16).padStart(2, "0");

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize,
        fontWeight: 600,
        color,
        padding: pad,
        borderRadius: 999,
        border: `${borderWidth}px solid ${color}`,
        background: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(
          color.slice(3, 5),
          16
        )}, ${parseInt(color.slice(5, 7), 16)}, ${bgAlpha})`,
        boxShadow: `0 0 ${outerGlow}px ${color}${outerAlphaHex}, inset 0 0 12px ${color}22`,
        opacity: progress,
        transform: `translateY(${lift}px) scale(${scale})`,
        transition: "none",
        willChange: "transform, box-shadow",
      }}
    >
      <span
        style={{
          width: 8 + 2 * hi,
          height: 8 + 2 * hi,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 ${12 + 12 * hi}px ${color}`,
        }}
      />
      {text}
    </div>
  );
};
