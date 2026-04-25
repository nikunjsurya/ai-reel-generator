import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "#EF4444",
  MED: "#FBA434",
  LOW: "#5EEAD4",
};

// status-check variant icon/color mapping.
// "REAL" / "CONFIRMED" → green check, "MISSING" / "MISSING" → amber warn,
// "GONE" / "BROKEN" → red cross.
const STATUS_COLOR: Record<string, string> = {
  ok: "#22C55E",
  real: "#22C55E",
  confirmed: "#22C55E",
  warn: "#FBA434",
  missing: "#FBA434",
  partial: "#FBA434",
  bad: "#EF4444",
  broken: "#EF4444",
  gone: "#EF4444",
  info: "#60A5FA",
};

const STATUS_ICON: Record<string, string> = {
  ok: "✓",
  real: "✓",
  confirmed: "✓",
  warn: "!",
  missing: "!",
  partial: "!",
  bad: "✕",
  broken: "✕",
  gone: "✕",
  info: "i",
};

type StatusRow = {
  status: string;
  title: string;
  subhead?: string;
};

export const SeverityCards: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const variant = ((props as any).variant as "severity" | "status-check" | undefined) ?? "severity";

  const headFade = spring({ frame, fps, config: { damping: 15 } });
  const threshFade = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  if (variant === "status-check") {
    const rows = ((props as any).statusRows as StatusRow[]) ?? [];
    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: 200, gap: 30,
      }}>
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 72, fontWeight: 900,
            color: theme.textHeader, opacity: headFade,
            textAlign: "center", letterSpacing: -1,
          }}>{props.headline}</div>
        )}
        {props.subhead && (
          <div style={{
            fontFamily: mono, fontSize: 22, color: "rgba(245,237,214,0.6)",
            opacity: threshFade, letterSpacing: 3, textTransform: "uppercase",
          }}>{props.subhead}</div>
        )}
        <div style={{
          width: "78%", maxWidth: 1100,
          display: "flex", flexDirection: "column", gap: 18,
          marginTop: 28,
        }}>
          {rows.map((r, i) => {
            const appear = spring({ frame: frame - (26 + i * 18), fps, config: { damping: 14 } });
            const color = STATUS_COLOR[r.status.toLowerCase()] ?? "#94A3B8";
            const icon = STATUS_ICON[r.status.toLowerCase()] ?? "•";
            return (
              <div key={i} style={{
                padding: "26px 30px", borderRadius: 14,
                background: "rgba(15,23,41,0.72)",
                borderLeft: `6px solid ${color}`,
                boxShadow: `0 0 32px ${color}22`,
                opacity: appear,
                transform: `translateY(${(1 - appear) * 16}px)`,
                display: "flex", alignItems: "center", gap: 22,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: `${color}22`, border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color, fontWeight: 900, fontFamily: inter, fontSize: 30,
                  flexShrink: 0,
                }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: inter, fontSize: 30, fontWeight: 700,
                    color: theme.textHeader, lineHeight: 1.2,
                  }}>{r.title}</div>
                  {r.subhead && (
                    <div style={{
                      fontFamily: inter, fontSize: 18, color: "#94A3B8",
                      marginTop: 6,
                    }}>{r.subhead}</div>
                  )}
                </div>
                <div style={{
                  fontFamily: mono, fontSize: 16, fontWeight: 900,
                  color, letterSpacing: 2, textTransform: "uppercase",
                  padding: "4px 14px", borderRadius: 999,
                  background: `${color}1A`, border: `1px solid ${color}66`,
                }}>
                  {r.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // severity variant (existing behavior)
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start", paddingTop: 260, gap: 22,
    }}>
      {props.headline && (
        <div style={{
          fontFamily: inter, fontSize: 64, fontWeight: 900,
          color: theme.textHeader, opacity: headFade, textAlign: "center",
        }}>{props.headline}</div>
      )}
      {props.threshold && (
        <div style={{
          padding: "10px 26px", borderRadius: 999,
          border: `1px solid ${ACCENT_HEX[theme.accent2]}`,
          fontFamily: mono, fontSize: 26, color: ACCENT_HEX[theme.accent2],
          opacity: threshFade,
        }}>{props.threshold}</div>
      )}
      <div style={{ width: "82%", display: "flex", flexDirection: "column", gap: 20, marginTop: 26 }}>
        {props.cards?.map((c, i) => {
          const appear = spring({ frame: frame - (24 + i * 16), fps, config: { damping: 14 } });
          const col = SEVERITY_COLOR[c.severity];
          return (
            <div key={i} style={{
              padding: "22px 26px", borderRadius: 16,
              background: "rgba(15,23,41,0.75)",
              borderLeft: `5px solid ${col}`,
              boxShadow: `0 0 30px ${col}22`,
              opacity: appear, transform: `translateY(${(1 - appear) * 12}px)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <span style={{
                  fontFamily: inter, fontSize: 24, fontWeight: 900,
                  color: col, letterSpacing: 1.6,
                  padding: "4px 14px", borderRadius: 999,
                  background: `${col}22`, border: `1px solid ${col}66`,
                }}>{c.severity}</span>
                <span style={{ fontFamily: mono, fontSize: 22, color: "#94a3b8" }}>
                  confidence {c.confidence}
                </span>
              </div>
              <div style={{
                fontFamily: inter, fontSize: 34, fontWeight: 700,
                color: theme.textHeader, lineHeight: 1.25,
              }}>{c.title}</div>
              <div style={{
                marginTop: 8, fontFamily: mono, fontSize: 24,
                color: "#5EEAD4",
              }}>{c.path}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
