import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

// Full-screen color-break card: small mono kicker + giant mono URL.
// DG2f8 uses a wine-red gradient for claude.ai/design. 1 of 5 videos but
// high-impact for single-URL CTAs.
export const UrlRevealCard: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];

  const url = props.version ?? (props as any).url ?? (props as any).cta ?? "example.com";
  const kicker = (props as any).kicker ?? "FIND IT AT";
  const gradient = ((props as any).gradient as [string, string] | undefined) ?? ["#831843", "#450a0a"];

  const kickerFade = spring({ frame, fps, config: { damping: 16 } });
  const urlSpring = spring({ frame: frame - 8, fps, config: { damping: 13, stiffness: 90 } });
  const scale = interpolate(urlSpring, [0, 1], [0.88, 1]);

  const urlLen = url.length;
  const urlSize = urlLen <= 14 ? 180 : urlLen <= 22 ? 140 : urlLen <= 32 ? 100 : 76;

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32, padding: "0 80px",
    }}>
      <div style={{
        fontFamily: mono, fontSize: 26, fontWeight: 700,
        letterSpacing: 6, color: "rgba(245,237,214,0.82)",
        textTransform: "uppercase", opacity: kickerFade,
      }}>
        {kicker}
      </div>
      <div style={{
        fontFamily: mono, fontSize: urlSize, fontWeight: 700,
        color: theme.textHeader, letterSpacing: -1,
        textAlign: "center",
        opacity: urlSpring, transform: `scale(${scale})`,
        textShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}>
        {url}
      </div>
    </div>
  );
};
