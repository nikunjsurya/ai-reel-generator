import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

const { fontFamily: inter } = loadInter();
const { fontFamily: playfair } = loadPlayfair();

// VersionReveal supports three modes:
// - version (default): label + giant version string, tight kerning
// - title (V7 long-form title cards): cream serif headline + optional subtitle
// - question (V7 long-form hook cards): cream serif question + coral subtitle
export const VersionReveal: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const mode = (props as any).mode ?? "version";
  const subtitle = (props as any).subtitle as string | undefined;
  const kickerPill = (props as any).kickerPill as string | undefined;

  const labelFade = spring({ frame: frame - 4, fps, config: { damping: 16 } });
  const verSpring = spring({ frame: frame - 14, fps, config: { damping: 14, stiffness: 110 } });
  const subtitleFade = spring({ frame: frame - 24, fps, config: { damping: 16 } });
  const scale = interpolate(verSpring, [0, 1], [0.72, 1]);

  if (mode === "title" || mode === "question") {
    const headline = props.headline ?? props.title ?? props.version ?? "Headline";
    const hLen = headline.length;
    const fontSize = hLen <= 20 ? 150 : hLen <= 34 ? 110 : hLen <= 50 ? 84 : 64;
    const headlineColor = mode === "question" ? theme.textHeader : theme.textHeader;
    const subColor = mode === "question" ? accent : "rgba(245,237,214,0.7)";

    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 32,
        padding: "0 90px",
      }}>
        {kickerPill ? (
          <div style={{
            fontFamily: inter, fontSize: 20, fontWeight: 700,
            letterSpacing: 4, color: accent, opacity: labelFade,
            padding: "8px 18px", borderRadius: 100,
            border: `2px solid ${accent}`,
            textTransform: "uppercase",
          }}>
            {kickerPill}
          </div>
        ) : null}
        <div style={{
          fontFamily: playfair, fontSize,
          fontWeight: 600, color: headlineColor,
          opacity: verSpring, transform: `scale(${scale})`,
          letterSpacing: -1, textAlign: "center",
          lineHeight: 1.05,
          textShadow: "0 6px 22px rgba(0,0,0,0.7)",
        }}>
          {headline}
        </div>
        {subtitle ? (
          <div style={{
            fontFamily: playfair, fontStyle: "italic",
            fontSize: hLen <= 34 ? 44 : 36, fontWeight: 400,
            color: subColor, opacity: subtitleFade,
            letterSpacing: 0.3, textAlign: "center",
          }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    );
  }

  // Default version mode (existing behavior)
  const versionText = props.version ?? "v—";
  const len = versionText.length;
  const versionFontSize =
    len <= 8 ? 200 : len <= 11 ? 160 : len <= 14 ? 130 : 110;
  const versionLetterSpacing = len <= 8 ? -2 : len <= 11 ? -1 : 0;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 26,
    }}>
      <div style={{
        fontFamily: inter, fontSize: 40, fontWeight: 700,
        letterSpacing: 8, color: theme.textHeader, opacity: labelFade,
      }}>
        {(props.label ?? theme.display.toUpperCase())}
      </div>
      <div style={{
        fontFamily: inter,
        fontSize: versionFontSize, fontWeight: 900,
        color: accent,
        textShadow: `0 0 60px ${accent}66, 0 8px 32px rgba(0,0,0,0.6)`,
        opacity: verSpring, transform: `scale(${scale})`,
        letterSpacing: versionLetterSpacing,
        textAlign: "center",
        padding: "0 60px",
      }}>
        {versionText}
      </div>
    </div>
  );
};
