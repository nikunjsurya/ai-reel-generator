import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

export const SkillLabel: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const label = spring({ frame, fps, config: { damping: 15 } });
  const cmd = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 26,
    }}>
      <div style={{
        fontFamily: inter, fontSize: 44, fontWeight: 700, letterSpacing: 7,
        color: theme.textHeader, opacity: label,
      }}>{props.label ?? "SKILL"}</div>
      <div style={{
        fontFamily: mono, fontSize: 112, fontWeight: 800,
        color: accent, letterSpacing: -1,
        textShadow: `0 0 60px ${accent}55`,
        opacity: cmd, transform: `scale(${0.9 + cmd * 0.1})`,
      }}>{props.command ?? "/command"}</div>
    </div>
  );
};
