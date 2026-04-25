import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

type Event = {
  date: string;
  label: string;
  detail?: string;
  color?: string;
};

// Two (or more) dated cards connected by a gradient line with pulsing colored
// dots. Used for the "APR 16 / APR 17" timeline card in DG2f8 and similar
// date-framed reveals. 3 of 5 videos (event-framing device).
export const TimelineConnector: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const accent2 = ACCENT_HEX[props.accent2 ?? theme.accent2];

  const events = ((props as any).events as Event[]) ?? [];
  const headline = props.headline;

  const headFade = spring({ frame, fps, config: { damping: 15 } });
  const lineProgress = spring({ frame: frame - 20, fps, config: { damping: 15, stiffness: 60 } });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 100]);

  const palette = [accent, accent2, ACCENT_HEX.green, ACCENT_HEX.yellow];

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 60, padding: "0 120px",
    }}>
      {headline && (
        <div style={{
          fontFamily: inter, fontSize: 44, fontWeight: 800,
          color: theme.textHeader, opacity: headFade,
          textAlign: "center", letterSpacing: -0.5,
        }}>
          {headline}
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "stretch",
        gap: 0, width: "88%", maxWidth: 1400, position: "relative",
      }}>
        {events.map((e, i) => {
          const color = e.color ? ACCENT_HEX[e.color as keyof typeof ACCENT_HEX] ?? e.color : palette[i % palette.length];
          const cardSpring = spring({ frame: frame - (8 + i * 12), fps, config: { damping: 14 } });
          const isLast = i === events.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{
                flex: 1,
                padding: "28px 26px", borderRadius: 18,
                background: `linear-gradient(140deg, ${color}18, ${color}05)`,
                border: `1px solid ${color}55`,
                opacity: cardSpring,
                transform: `translateY(${(1 - cardSpring) * 14}px)`,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{
                  fontFamily: mono, fontSize: 20, fontWeight: 700,
                  letterSpacing: 3, color, textTransform: "uppercase",
                }}>
                  {e.date}
                </div>
                <div style={{
                  fontFamily: inter, fontSize: 36, fontWeight: 800,
                  color: theme.textHeader, lineHeight: 1.2,
                }}>
                  {e.label}
                </div>
                {e.detail && (
                  <div style={{
                    fontFamily: inter, fontSize: 20, color: "#94A3B8",
                    lineHeight: 1.35,
                  }}>
                    {e.detail}
                  </div>
                )}
              </div>
              {!isLast && (
                <div style={{
                  width: 120, height: 3,
                  position: "relative", margin: "0 -1px",
                  background: "rgba(245,237,214,0.08)",
                  alignSelf: "center",
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, bottom: 0,
                    width: `${lineWidth}%`,
                    background: `linear-gradient(90deg, ${color}, ${palette[(i + 1) % palette.length]})`,
                    boxShadow: `0 0 12px ${color}66`,
                  }} />
                  <div style={{
                    position: "absolute", top: -5, left: "-8px",
                    width: 14, height: 14, borderRadius: "50%",
                    background: color, boxShadow: `0 0 14px ${color}`,
                  }} />
                  <div style={{
                    position: "absolute", top: -5, right: "-8px",
                    width: 14, height: 14, borderRadius: "50%",
                    background: palette[(i + 1) % palette.length],
                    opacity: lineProgress,
                    boxShadow: `0 0 14px ${palette[(i + 1) % palette.length]}`,
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
