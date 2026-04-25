import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { CommandPill } from "../components/CommandPill";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

export const CommandPills: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const headFade = spring({ frame, fps, config: { damping: 15 } });
  const kickerFade = spring({ frame: frame - 2, fps, config: { damping: 16 } });

  const kickerText = (props as any).kickerText as string | undefined;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 40,
      padding: "0 80px",
    }}>
      {kickerText && (
        <div style={{
          fontFamily: mono, fontSize: 22, fontWeight: 700,
          color: accent, letterSpacing: 4,
          textTransform: "uppercase", opacity: kickerFade,
        }}>
          {kickerText}
        </div>
      )}
      {props.version && (
        <div style={{
          fontFamily: inter, fontSize: 150, fontWeight: 900,
          color: accent,
          textShadow: `0 0 60px ${accent}66`,
          letterSpacing: -2, opacity: headFade,
        }}>
          {props.version}
        </div>
      )}
      {props.headline && (
        <div style={{
          fontFamily: inter, fontSize: 56, fontWeight: 800,
          color: theme.textHeader, opacity: headFade,
          textAlign: "center", lineHeight: 1.15, letterSpacing: -0.5,
        }}>
          {props.headline}
        </div>
      )}
      <div style={{
        display: "flex",
        flexDirection: (props.pills && props.pills.length > 2) ? "row" : "column",
        gap: 22, alignItems: "center", justifyContent: "center",
        flexWrap: "wrap",
      }}>
        {props.pills?.map((p, i) => {
          // Optional per-pill highlight window propagated from the content
          // pipeline (see WF2 Build Final Content: it scans narration word
          // timings for each pill's text and sets highlightAtSec relative to
          // the beat start).
          const withTimings = p as typeof p & {
            highlightAtSec?: number;
            highlightDurSec?: number;
          };
          return (
            <CommandPill
              key={i}
              text={p.text}
              accent={p.accent}
              delay={10 + i * 12}
              highlightAtSec={withTimings.highlightAtSec}
              highlightDurSec={withTimings.highlightDurSec}
            />
          );
        })}
      </div>
      {props.subhead && (
        <div style={{
          fontFamily: inter, fontSize: 34, fontWeight: 500,
          color: "#cbd5e1", textAlign: "center", maxWidth: 780, lineHeight: 1.4,
          opacity: spring({ frame: frame - 36, fps, config: { damping: 15 } }),
        }}>
          {props.subhead}
        </div>
      )}
    </div>
  );
};
