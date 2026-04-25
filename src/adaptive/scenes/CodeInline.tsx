import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

// CodeInline, smaller, more flexible than MockTerminal or MockEditor. No
// chrome (no macOS dots, no filename bar). Just a single highlighted line
// (or a tiny 2-3 line snippet) floating with a caption below. Useful for
// "the one-line install" or "the API call" moments that don't justify a
// full terminal.
// Props: { code: string | [string] (up to 3 lines), caption?: string,
//   language?: "bash"|"python"|"js"|"ts"|"sh" (default "bash") }
export const CodeInline: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const data = props as unknown as { code?: string | string[]; caption?: string; language?: string };
  const lines = Array.isArray(data.code) ? data.code.slice(0, 4) : [data.code || ""];
  const caption = data.caption;
  const lang = (data.language || "bash").toLowerCase();

  const headFade = spring({ frame, fps, config: { damping: 15 } });
  const capFade = spring({ frame: frame - 30, fps, config: { damping: 16 } });
  const outFade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Very simple syntax accent: bash/js highlight keywords + strings in accent.
  const highlight = (line: string) => {
    const parts: { text: string; color: string }[] = [];
    let rest = line;
    // Split on spaces but preserve them in tokens.
    const tokens = rest.split(/(\s+)/);
    for (const tok of tokens) {
      if (/^(npm|pip|curl|docker|git|yarn|pnpm|uv)$/i.test(tok)) {
        parts.push({ text: tok, color: accent });
      } else if (/^(install|run|add|build|test|deploy|start|list|get|post|put|delete)$/i.test(tok)) {
        parts.push({ text: tok, color: "#10a37f" });
      } else if (/^--[\w-]+/.test(tok)) {
        parts.push({ text: tok, color: "#fbbf24" });
      } else if (/^["'].*["']$/.test(tok)) {
        parts.push({ text: tok, color: "#a855f7" });
      } else {
        parts.push({ text: tok, color: theme.textHeader });
      }
    }
    return parts;
  };

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 48px", gap: 28,
      }}>
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 42, fontWeight: 800,
            color: theme.textHeader, textAlign: "center", maxWidth: 860,
            opacity: headFade,
          }}>{props.headline}</div>
        )}
        <div style={{
          width: "92%", maxWidth: 900,
          padding: "36px 40px",
          background: "rgba(10,16,32,0.75)",
          border: `1.5px solid ${accent}55`,
          borderRadius: 18,
          boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22`,
          fontFamily: mono, fontSize: 32, fontWeight: 500,
          lineHeight: 1.5, letterSpacing: -0.3,
          opacity: headFade,
          transform: `translateY(${(1 - headFade) * 16}px)`,
        }}>
          {lines.map((line, i) => {
            const lineSpring = spring({ frame: frame - 14 - i * 8, fps, config: { damping: 16 } });
            return (
              <div key={i} style={{
                display: "flex", flexWrap: "wrap",
                opacity: lineSpring,
                transform: `translateX(${(1 - lineSpring) * -10}px)`,
              }}>
                <span style={{ color: accent, marginRight: 10 }}>{i === 0 ? "$" : ">"}</span>
                {highlight(line).map((part, j) => (
                  <span key={j} style={{ color: part.color, whiteSpace: "pre" }}>{part.text}</span>
                ))}
              </div>
            );
          })}
        </div>
        {caption && (
          <div style={{
            fontFamily: inter, fontSize: 26, color: "#cbd5e1",
            textAlign: "center", maxWidth: 780, fontStyle: "italic",
            opacity: capFade,
          }}>{caption}</div>
        )}
        {/* Language tag, small corner */}
        {lang && (
          <div style={{
            fontFamily: mono, fontSize: 16, fontWeight: 600,
            color: accent, letterSpacing: 4, textTransform: "uppercase",
            opacity: capFade,
          }}>· {lang} ·</div>
        )}
      </div>
    </div>
  );
};
