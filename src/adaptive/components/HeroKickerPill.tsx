import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: mono } = loadMono();

type Props = {
  label: string;
  color: string;
  position?: "top-left" | "top-right";
};

// Small rounded pill with pulsing dot + mono label. Seen in 4 of 5 DIY
// long-forms: "• IN THIS VIDEO", "• BREAKING", "• AI NEWS". Overlay
// component - mount on any hero scene via an absolutely-positioned wrapper.
export const HeroKickerPill: React.FC<Props> = ({ label, color, position = "top-left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = spring({ frame, fps, config: { damping: 18 } });
  const pulse = 0.6 + 0.4 * Math.abs(Math.sin(frame / 18));

  return (
    <div style={{
      position: "absolute",
      top: 140,
      left: position === "top-left" ? 60 : "auto",
      right: position === "top-right" ? 60 : "auto",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 16px 8px 14px",
      borderRadius: 999,
      background: `${color}1A`,
      border: `1px solid ${color}66`,
      opacity: fade,
      zIndex: 15,
      pointerEvents: "none",
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: "50%",
        background: color, opacity: pulse,
        boxShadow: `0 0 10px ${color}AA`,
      }} />
      <span style={{
        fontFamily: mono, fontSize: 16, fontWeight: 700,
        letterSpacing: 2.5, color,
        textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
};
