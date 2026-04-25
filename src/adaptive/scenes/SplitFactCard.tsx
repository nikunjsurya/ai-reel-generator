import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { staticFile, Img } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: mono } = loadMono();

type Highlight = {
  word: string;
  color?: string;
  strike?: boolean;
};

// Left image/reference + right paragraph with inline highlighted / strikethrough
// spans. Used for "Same Model. Day Two." card in DG2f8 (reference image of
// yesterday's video + headline with coral highlight on "twenty-four").
export const SplitFactCard: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const imageSrc = (props as any).imageSrc as string | undefined;
  const imagePill = (props as any).imagePill as string | undefined;
  const rightKicker = (props as any).rightKicker as string | undefined;
  const rightHeadline = props.headline ?? "";
  const rightBody = props.subhead ?? (props as any).body ?? "";
  const highlights = ((props as any).highlights as Highlight[]) ?? [];

  const imgSpring = spring({ frame: frame - 2, fps, config: { damping: 14 } });
  const rightSpring = spring({ frame: frame - 10, fps, config: { damping: 14 } });

  const renderHighlighted = (text: string) => {
    if (!highlights.length) return text;
    let out: (string | React.ReactNode)[] = [text];
    highlights.forEach((h, idx) => {
      const colorHex = h.color ? ACCENT_HEX[h.color as keyof typeof ACCENT_HEX] ?? h.color : accent;
      const replaced: (string | React.ReactNode)[] = [];
      out.forEach((piece) => {
        if (typeof piece === "string" && piece.includes(h.word)) {
          const parts = piece.split(h.word);
          parts.forEach((p, i) => {
            replaced.push(p);
            if (i < parts.length - 1) {
              replaced.push(
                <span
                  key={`${idx}-${i}`}
                  style={{
                    color: colorHex,
                    fontWeight: 800,
                    textDecoration: h.strike ? "line-through" : undefined,
                    textDecorationColor: h.strike ? colorHex : undefined,
                    textDecorationThickness: h.strike ? 3 : undefined,
                  }}
                >
                  {h.word}
                </span>
              );
            }
          });
        } else {
          replaced.push(piece);
        }
      });
      out = replaced;
    });
    return out;
  };

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 60, padding: "0 120px",
    }}>
      <div style={{
        flex: 1, maxWidth: 720,
        opacity: imgSpring, transform: `translateX(${(1 - imgSpring) * -30}px)`,
        position: "relative",
      }}>
        {imageSrc ? (
          <Img
            src={staticFile(imageSrc)}
            style={{
              width: "100%", maxHeight: 640, objectFit: "cover",
              borderRadius: 18, border: `1px solid ${accent}55`,
              boxShadow: `0 30px 80px rgba(0,0,0,0.6)`,
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: 400, borderRadius: 18,
            background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
            border: `1px solid ${accent}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: inter, fontSize: 24, color: "rgba(245,237,214,0.5)",
          }}>
            [image slot]
          </div>
        )}
        {imagePill && (
          <div style={{
            position: "absolute", top: 20, left: 20,
            padding: "6px 14px", borderRadius: 999,
            background: "#0a1020", border: `1px solid ${accent}`,
            color: accent, fontFamily: mono, fontSize: 14,
            fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
          }}>
            {imagePill}
          </div>
        )}
      </div>
      <div style={{
        flex: 1.1, maxWidth: 780,
        display: "flex", flexDirection: "column", gap: 20,
        opacity: rightSpring, transform: `translateX(${(1 - rightSpring) * 30}px)`,
      }}>
        {rightKicker && (
          <div style={{
            fontFamily: mono, fontSize: 18, letterSpacing: 3,
            color: accent, textTransform: "uppercase",
          }}>
            {rightKicker}
          </div>
        )}
        <div style={{
          fontFamily: playfair, fontSize: 72, fontWeight: 600,
          color: theme.textHeader, lineHeight: 1.1, letterSpacing: -1,
        }}>
          {renderHighlighted(rightHeadline)}
        </div>
        {rightBody && (
          <div style={{
            fontFamily: inter, fontSize: 28,
            color: "rgba(245,237,214,0.8)", lineHeight: 1.4,
          }}>
            {renderHighlighted(rightBody)}
          </div>
        )}
      </div>
    </div>
  );
};
