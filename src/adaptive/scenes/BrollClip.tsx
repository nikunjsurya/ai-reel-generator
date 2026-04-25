import { AbsoluteFill, Img, Video, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// Detect whether brollSrc points to an image or a video by extension.
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;
function isImage(src: string | undefined) {
  if (!src) return false;
  return IMAGE_EXT.test(src);
}

// BrollClip, article preview card.
//
// Design rationale (updated from full-bleed variant):
//   Full-bleed B-roll worked for 9:16-native video but made 16:9 article hero
//   images look stretched because object-fit:cover scaled them ~2.1x to fill
//   height. Redesigned as a floating card: image keeps native aspect inside a
//   rounded 16:9 frame, brand-colored background fills the rest of the 9:16
//   frame. Per-word captions at the bottom of the screen handle narration;
//   this scene shows only the article title (or optional headline prop) so
//   there's no double-captioning.
export const BrollClip: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const hasBroll = !!props.brollSrc;
  const brollIsImage = isImage(props.brollSrc);

  // Card slides in from below with a spring.
  const cardSpring = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const cardY = interpolate(cardSpring, [0, 1], [60, 0]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Subtle ken-burns on the image inside the card (not on the screen).
  const imageScale = interpolate(frame, [0, durationInFrames], [1.0, 1.06]);

  // Out-fade last 12 frames.
  const outFade = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const title = (props as unknown as { title?: string }).title
    ?? props.headline
    ?? "";
  const sourceBadge = (props as unknown as { sourceBadge?: string }).sourceBadge
    ?? (props.brand ? props.brand.toUpperCase() : undefined);

  return (
    <AbsoluteFill style={{ opacity: outFade }}>
      {/* Brand-colored frame bg with subtle accent glow. */}
      <div style={{
        position: "absolute", inset: 0,
        background: theme.bg,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% 35%, ${accent}22 0%, transparent 60%)`,
      }} />

      {/* Centered card. */}
      <div style={{
        position: "absolute",
        top: 260,
        left: 60,
        right: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 32,
        opacity: cardOpacity,
        transform: `translateY(${cardY}px)`,
      }}>
        {/* Source badge above the image (small pill). */}
        {sourceBadge && (
          <div style={{
            alignSelf: "center",
            fontFamily: inter,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: accent,
            padding: "8px 18px",
            borderRadius: 999,
            border: `1.5px solid ${accent}88`,
            background: `${accent}14`,
          }}>{sourceBadge}</div>
        )}

        {/* Image card, fixed 16:9 aspect ratio. */}
        <div style={{
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px ${accent}55`,
          position: "relative",
          background: "#000",
        }}>
          {hasBroll ? (
            <div style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${imageScale})`,
              transformOrigin: "center center",
            }}>
              {brollIsImage ? (
                <Img
                  src={staticFile(props.brollSrc!)}
                  style={{
                    width: "100%",
                    height: "100%",
                    // contain preserves the image's natural aspect; any gaps
                    // fall onto the card's black base so nothing is stretched.
                    // The card itself is 16:9 so most hero images fit cleanly.
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Video
                  src={staticFile(props.brollSrc!)}
                  muted
                  volume={0}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              )}
            </div>
          ) : (
            // Fallback: gradient placeholder so the card never reads "empty".
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(135deg, ${theme.bg}, ${accent}33)`,
            }} />
          )}
        </div>

        {/* Accent divider. */}
        <div style={{
          width: 120,
          height: 3,
          background: accent,
          borderRadius: 2,
          alignSelf: "center",
          boxShadow: `0 0 12px ${accent}88`,
        }} />

        {/* Article title. Kept short (2-3 lines max) because per-word
            captions handle the narration at the bottom. */}
        {title && (
          <div style={{
            fontFamily: inter,
            fontSize: 44,
            fontWeight: 800,
            color: theme.textHeader,
            textAlign: "center",
            lineHeight: 1.2,
            padding: "0 20px",
            textShadow: `0 2px 12px rgba(0,0,0,0.6)`,
          }}>
            {title}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
