import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

export const SkillDone: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const g = "#22C55E";
  const pill = spring({ frame, fps, config: { damping: 14 } });
  const tease = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 30,
    }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 14,
        padding: "20px 40px", borderRadius: 999,
        border: `2px solid ${g}`, background: `${g}18`,
        boxShadow: `0 0 40px ${g}55`,
        fontFamily: inter, fontSize: 48, fontWeight: 800, color: g,
        opacity: pill, transform: `scale(${0.92 + pill * 0.08})`,
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 999, background: g,
          color: "#0a1020", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 900,
        }}>✓</span>
        {props.done ?? "Done"}
      </div>
      {props.tease && (
        <div style={{
          fontFamily: inter, fontSize: 56, fontWeight: 800,
          color: theme.textHeader, opacity: tease,
        }}>{props.tease}</div>
      )}
    </div>
  );
};
