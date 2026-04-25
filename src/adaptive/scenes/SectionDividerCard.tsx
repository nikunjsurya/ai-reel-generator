import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: mono } = loadMono();

// Full-canvas act-break card: kicker + big centered headline + optional subtitle.
// Present in 5 of 5 DIY long-forms. Used as inside-chapter act break (not the
// same as ChapterTransition). Sits on the same dark canvas with no pattern.
export const SectionDividerCard: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const kicker = (props as any).kicker as string | undefined;
  const serif = ((props as any).serif as boolean | undefined) ?? true;
  const headline = props.headline ?? props.title ?? "";
  const subtitle = props.subhead ?? (props as any).subtitle as string | undefined;

  const kickerFade = spring({ frame, fps, config: { damping: 16 } });
  const headSpring = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const subFade = spring({ frame: frame - 18, fps, config: { damping: 16 } });

  const headTranslate = interpolate(headSpring, [0, 1], [24, 0]);
  const hLen = headline.length;
  const hSize = hLen <= 14 ? 140 : hLen <= 26 ? 108 : hLen <= 42 ? 80 : 64;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 26, padding: "0 120px",
    }}>
      {kicker && (
        <div style={{
          fontFamily: mono, fontSize: 22, letterSpacing: 4,
          color: accent, textTransform: "uppercase",
          opacity: kickerFade,
        }}>
          {kicker}
        </div>
      )}
      <div style={{
        fontFamily: serif ? playfair : inter,
        fontSize: hSize,
        fontWeight: serif ? 600 : 900,
        color: theme.textHeader,
        letterSpacing: serif ? -1 : -1.5,
        lineHeight: 1.05,
        textAlign: "center",
        opacity: headSpring,
        transform: `translateY(${headTranslate}px)`,
        textShadow: "0 8px 30px rgba(0,0,0,0.7)",
      }}>
        {headline}
      </div>
      {subtitle && (
        <div style={{
          fontFamily: serif ? playfair : inter,
          fontStyle: serif ? "italic" : "normal",
          fontSize: hLen <= 26 ? 40 : 30,
          fontWeight: 400,
          color: "rgba(245,237,214,0.65)",
          textAlign: "center",
          opacity: subFade, maxWidth: 1200,
          lineHeight: 1.3,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
