import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

export const MockTerminal: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const labelFade = spring({ frame, fps, config: { damping: 15 } });
  const winFade = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  // 400ms on / 400ms off per Gemini spec (12 frames = ~400ms at 30fps)
  const cursorVisible = Math.floor(frame / 12) % 2 === 0;

  const logLines = props.logLines ?? [];
  const lineCount = logLines.length;

  // Log lines finish appearing around frame (22 + lineCount*8). After that,
  // the coral scan line sweeps down through the log block, then the green
  // success row appears at the bottom.
  const logFilledAt = 22 + lineCount * 8;
  const scanStart = logFilledAt + 4;
  // Scan sweep lasts 1.2s for a satisfying, readable pace.
  const scanEnd = scanStart + Math.round(fps * 1.2);
  const successAt = scanEnd + 6;

  // Scan line y-position: interpolate 0 -> 1 (normalized) across the sweep.
  const scanProgress = interpolate(frame, [scanStart, scanEnd], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const scanVisible = frame >= scanStart && frame <= scanEnd;

  // Success row entrance
  const successFade = spring({ frame: frame - successAt, fps, config: { damping: 15 } });
  const successVisible = frame >= successAt;

  // Derive a success string from props if present; otherwise synthesize.
  const successText =
    (props as unknown as { successText?: string }).successText ??
    `Found ${Math.max(3, lineCount * 6 - 1)} read-only patterns, ranked by frequency.`;

  const GREEN = "#22C55E";

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start", paddingTop: 230, gap: 30,
    }}>
      <div style={{
        fontFamily: inter, fontSize: 66, fontWeight: 900,
        color: accent, opacity: labelFade, letterSpacing: -0.5,
      }}>Skill One</div>
      <div style={{
        width: "86%", borderRadius: 18,
        background: "#050810",
        border: `1px solid ${accent}33`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.75), 0 0 0 1px ${accent}1a`,
        overflow: "hidden",
        opacity: winFade,
        transform: `translateY(${(1 - winFade) * 24}px)`,
      }}>
        {/* title bar */}
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 18px",
          background: "#0b1220", borderBottom: `1px solid #1e293b`,
        }}>
          <div style={{ display: "flex", gap: 7 }}>
            <span style={dot("#ff5f57")} />
            <span style={dot("#febc2e")} />
            <span style={dot("#28c940")} />
          </div>
          <div style={{
            flex: 1, textAlign: "center", fontFamily: mono, fontSize: 20,
            color: "#94a3b8", fontWeight: 500, letterSpacing: 0.3,
          }}>{props.title ?? "~/myproject claude"}</div>
        </div>

        <div style={{ padding: "28px 30px 24px", fontFamily: mono, fontSize: 28, lineHeight: 1.55 }}>
          <div style={{ color: accent, fontWeight: 700, fontSize: 32 }}>
            &gt; {props.prompt ?? "/command"}
            {cursorVisible && <span style={{ marginLeft: 4, color: accent, opacity: 0.7 }}>▍</span>}
          </div>
          <div style={{ color: "#F5B302", marginTop: 18, fontSize: 26, fontWeight: 500 }}>
            <span style={{ color: "#F5B302", marginRight: 8 }}>●</span>
            {props.status ?? ""}
          </div>

          {/* log block, relative positioned so scan line can overlay */}
          <div style={{
            marginTop: 20, padding: "18px 20px", borderRadius: 10,
            background: "#010305", border: "1px solid #111827",
            position: "relative", overflow: "hidden",
          }}>
            {logLines.map((l, i) => {
              const lineAppear = spring({ frame: frame - (22 + i * 8), fps, config: { damping: 15 } });
              const isTool = l.role === "tool";
              let bodyText = l.text;
              let approved = "";
              const m = /^(.*?)(\s*\[approved\])\s*$/.exec(l.text);
              if (m) { bodyText = m[1]; approved = m[2]; }
              return (
                <div key={i} style={{
                  color: isTool ? "#cbd5e1" : "#94a3b8",
                  fontSize: 24, lineHeight: 1.55,
                  opacity: lineAppear,
                  position: "relative",
                  paddingBottom: 2,
                }}>
                  <span style={{ color: "#64748b" }}>{isTool ? "[tool_use] " : "user: "}</span>
                  <span>{bodyText}</span>
                  {approved && (
                    <span style={{ color: accent, fontWeight: 600 }}> {approved.trim()}</span>
                  )}
                </div>
              );
            })}
            <div style={{ color: "#475569", fontSize: 22, marginTop: 4 }}>...</div>

            {/* coral horizontal scan line that sweeps through the log block */}
            {scanVisible && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${scanProgress * 100}%`,
                    height: 2,
                    background: accent,
                    boxShadow: `0 0 18px ${accent}, 0 0 4px ${accent}`,
                    pointerEvents: "none",
                  }}
                />
                {/* soft trailing glow */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `calc(${scanProgress * 100}% - 30px)`,
                    height: 30,
                    background: `linear-gradient(to bottom, transparent, ${accent}22)`,
                    pointerEvents: "none",
                  }}
                />
              </>
            )}
          </div>

          {/* green success row under the log block */}
          {successVisible && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              marginTop: 18,
              color: GREEN, fontFamily: mono, fontSize: 22, fontWeight: 600,
              opacity: successFade,
              transform: `translateY(${(1 - successFade) * 8}px)`,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 6,
                color: GREEN, fontWeight: 900, fontSize: 22,
              }}>✓</span>
              <span style={{ lineHeight: 1.35, textShadow: `0 0 12px ${GREEN}55` }}>{successText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const dot = (bg: string): React.CSSProperties => ({
  width: 13, height: 13, borderRadius: 999, background: bg,
});
