import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { MockBrowserFrame } from "../components/MockBrowserFrame";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// Scene that wraps MockBrowserFrame with a headline + optional subhead.
// Used when the topic has a product/landing page to show.
// Props carried on SceneProps.browser via passthrough.
type BrowserData = {
  url: string;
  screenshot?: string;
  tabs?: string[];
};

export const BrowserReveal: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = (props as unknown as { browser?: BrowserData }).browser;
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const headlineFade = spring({ frame, fps, config: { damping: 15 } });
  const subFade = spring({ frame: frame - 10, fps, config: { damping: 15 } });

  if (!data) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "180px 40px 120px",
        gap: 24,
      }}
    >
      {props.headline && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 56,
            fontWeight: 900,
            color: accent,
            letterSpacing: -0.5,
            lineHeight: 1.05,
            textAlign: "center",
            textShadow: `0 0 40px ${accent}44`,
            opacity: headlineFade,
            transform: `translateY(${(1 - headlineFade) * 14}px)`,
          }}
        >
          {props.headline}
        </div>
      )}
      <MockBrowserFrame
        url={data.url}
        screenshot={data.screenshot}
        tabs={data.tabs}
      />
      {props.subhead && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 28,
            color: "#CBD5E1",
            textAlign: "center",
            opacity: subFade,
            maxWidth: 720,
          }}
        >
          {props.subhead}
        </div>
      )}
    </div>
  );
};
