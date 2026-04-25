type Props = {
  opacity?: number;
  format?: "short" | "longform";
  label?: string;
};

// Long-form shifts the channel watermark to bottom-left at ~20% opacity so
// the brand glyph (top-right) dominates. Short keeps the bottom-right stronger
// placement because the video IS the channel's content.
//
// label: pass an explicit string to override the default "Hindi · AI" text.
// Empty string "" hides the watermark entirely (ai-reel-generator uses this
// for one-off /reel outputs that don't belong to a single branded channel).
export const ChannelWatermark: React.FC<Props> = ({ opacity, format = "short", label }) => {
  const isLongform = format === "longform";
  const effectiveOpacity = opacity ?? (isLongform ? 0.22 : 0.55);
  const effectiveLabel = label ?? "Hindi · AI";
  if (effectiveLabel === "") return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: isLongform ? 60 : 24,
        left: isLongform ? 32 : "auto",
        right: isLongform ? "auto" : 28,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        fontSize: isLongform ? 14 : 18,
        fontWeight: 600,
        letterSpacing: 1.2,
        color: "rgba(245,237,214,0.75)",
        textTransform: "uppercase",
        opacity: effectiveOpacity,
        pointerEvents: "none",
        zIndex: 9,
      }}
    >
      <span style={{
        width: isLongform ? 7 : 10,
        height: isLongform ? 7 : 10,
        borderRadius: 3,
        background: "linear-gradient(135deg,#E2725B 0%,#5EEAD4 100%)",
      }} />
      {effectiveLabel}
    </div>
  );
};
