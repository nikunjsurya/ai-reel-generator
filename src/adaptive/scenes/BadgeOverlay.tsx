import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { SlideInBadge } from "../components/SlideInBadge";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// Scene wrapper for a slide-in alert badge + background headline/subhead.
// Props carried on SceneProps.badge via passthrough.
type BadgeData = {
  text: string;
  enterFrom?: "top-left" | "top-right" | "bottom";
  accent?: string;
};

export const BadgeOverlay: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = (props as unknown as { badge?: BadgeData }).badge;
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const headlineFade = spring({ frame, fps, config: { damping: 15 } });
  const subFade = spring({ frame: frame - 14, fps, config: { damping: 15 } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 48px",
          gap: 20,
        }}
      >
        {props.headline && (
          <div
            style={{
              fontFamily: inter,
              fontSize: 62,
              fontWeight: 900,
              color: theme.textHeader,
              letterSpacing: -0.5,
              textAlign: "center",
              lineHeight: 1.1,
              opacity: headlineFade,
              transform: `translateY(${(1 - headlineFade) * 12}px)`,
            }}
          >
            {props.headline}
          </div>
        )}
        {props.subhead && (
          <div
            style={{
              fontFamily: inter,
              fontSize: 30,
              color: "#CBD5E1",
              fontStyle: "italic",
              textAlign: "center",
              opacity: subFade,
              maxWidth: 720,
            }}
          >
            {props.subhead}
          </div>
        )}
      </div>
      {data && (
        <SlideInBadge
          text={data.text}
          accent={(data.accent as "orange" | "red" | undefined) ?? "orange"}
          enterFrom={data.enterFrom ?? "top-left"}
          durationInFrames={durationInFrames}
        />
      )}
    </div>
  );
};
