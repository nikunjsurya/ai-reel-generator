import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: inter } = loadInter();

// ~6-7 second brand outro bumper. Measured in all 5 DIY long-forms: same MP4
// asset used byte-for-byte across every video. This is a self-contained
// Remotion generator so we don't need an external MP4 asset.
// Renders: dark bg → particles + lens flare → big channel lockup → hold → fade.
export const BrandOutroBumper: React.FC<{ props: SceneProps; durationInFrames: number }> = ({
  props,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const accent2 = ACCENT_HEX[props.accent2 ?? theme.accent2];

  const channelName = (props as any).channelName ?? "Hindi AI";
  const tagline = (props as any).tagline ?? "";

  const introFade = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const logoSpring = spring({ frame: frame - 16, fps, config: { damping: 13, stiffness: 90 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.72, 1]);
  const flareOpacity = 0.5 + 0.5 * Math.sin(frame / 8);

  const outFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // 24 floating particles for lens-flare field
  const particles = Array.from({ length: 28 }).map((_, i) => {
    const seed = (i * 137) % 360;
    const x = (seed * 13) % width;
    const y = ((seed * 17) % height);
    const driftX = Math.sin(frame / 40 + i) * 8;
    const driftY = Math.cos(frame / 50 + i * 0.7) * 6;
    const size = 1 + ((i * 3) % 4);
    const color = i % 2 === 0 ? accent : accent2;
    return { x: x + driftX, y: y + driftY, size, color, key: i };
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#06070E",
      overflow: "hidden",
      opacity: outFade,
    }}>
      {/* Radial accent gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, ${accent}22 0%, transparent 55%)`,
        opacity: introFade * 0.9,
      }} />

      {/* Lens flare streak */}
      <div style={{
        position: "absolute",
        top: "38%",
        left: "-20%", right: "-20%",
        height: 6,
        transform: "rotate(-8deg)",
        background: `linear-gradient(90deg, transparent, ${accent} 45%, ${accent2} 55%, transparent)`,
        filter: "blur(6px)",
        opacity: flareOpacity * introFade * 0.8,
      }} />

      {/* Particles */}
      {particles.map((p) => (
        <div key={p.key} style={{
          position: "absolute",
          left: p.x, top: p.y,
          width: p.size * 2, height: p.size * 2,
          borderRadius: "50%",
          background: p.color,
          boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          opacity: introFade * 0.8,
        }} />
      ))}

      {/* Logo lockup */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          opacity: logoSpring, transform: `scale(${logoScale})`,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            boxShadow: `0 0 28px ${accent}88`,
          }} />
          <div style={{
            fontFamily: playfair, fontSize: 110, fontWeight: 600,
            color: "#F5EDD6", letterSpacing: -1,
            textShadow: `0 0 60px ${accent}44`,
          }}>
            {channelName}
          </div>
        </div>
        {tagline && (
          <div style={{
            fontFamily: inter, fontSize: 26, fontWeight: 500,
            color: "rgba(245,237,214,0.6)", letterSpacing: 4,
            textTransform: "uppercase",
            opacity: spring({ frame: frame - 30, fps, config: { damping: 16 } }),
          }}>
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
};
