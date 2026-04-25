import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

type Tab = {
  number: string; // "01"
  label: string;
  color?: string;
};

type Panel = {
  kicker?: string; // "PILLAR 01 OF 05"
  title: string;
  body?: string;
  definitionChip?: { label: string; text: string };
};

// Signature DG2f8 feature-matrix scene: persistent 5-tab row at top, swappable
// detail panel below. Active tab glows with accent border + underline.
// Auto-cycles through tabs evenly across scene duration.
export const TabSelectorPillars: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];

  const tabs = ((props as any).tabs as Tab[]) ?? [];
  const panels = ((props as any).panels as Panel[]) ?? [];
  const headline = props.headline;

  const palette = ["coral", "blue", "purple", "green", "cyan"];
  const tabColors = tabs.map((t, i) =>
    t.color
      ? ACCENT_HEX[t.color as keyof typeof ACCENT_HEX] ?? t.color
      : ACCENT_HEX[palette[i % palette.length] as keyof typeof ACCENT_HEX]
  );

  const tabCount = Math.max(1, tabs.length);
  const framesPerTab = Math.floor(durationInFrames / tabCount);
  const activeIndex = Math.min(tabCount - 1, Math.floor(frame / framesPerTab));

  const panelCrossFade = interpolate(
    frame - activeIndex * framesPerTab,
    [0, 12, framesPerTab - 12, framesPerTab],
    [0, 1, 1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const headFade = spring({ frame, fps, config: { damping: 16 } });
  const tabsFade = spring({ frame: frame - 6, fps, config: { damping: 14 } });

  const currentPanel = panels[activeIndex] ?? panels[0];
  const activeColor = tabColors[activeIndex];

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      padding: "180px 100px 140px",
      gap: 48,
    }}>
      {headline && (
        <div style={{
          fontFamily: inter, fontSize: 38, fontWeight: 800,
          color: theme.textHeader, opacity: headFade,
          textAlign: "center", letterSpacing: -0.4,
        }}>
          {headline}
        </div>
      )}

      {/* Tab row */}
      <div style={{
        display: "flex", gap: 14, width: "100%",
        justifyContent: "center", opacity: tabsFade,
      }}>
        {tabs.map((t, i) => {
          const isActive = i === activeIndex;
          const c = tabColors[i];
          return (
            <div key={i} style={{
              flex: 1, maxWidth: 260,
              padding: "18px 14px 16px",
              borderRadius: 14,
              background: isActive
                ? `linear-gradient(140deg, ${c}33, ${c}0A)`
                : "rgba(15,23,41,0.4)",
              border: `1px solid ${isActive ? c : "rgba(245,237,214,0.08)"}`,
              boxShadow: isActive ? `0 0 32px ${c}44` : "none",
              display: "flex", flexDirection: "column", gap: 6,
              alignItems: "center",
              transition: "all 240ms ease-out",
              transform: isActive ? "scale(1.02)" : "scale(0.98)",
              opacity: isActive ? 1 : 0.6,
              position: "relative",
            }}>
              <div style={{
                fontFamily: mono, fontSize: 14, fontWeight: 700,
                letterSpacing: 2, color: c, opacity: isActive ? 1 : 0.7,
              }}>
                {t.number}
              </div>
              <div style={{
                fontFamily: inter, fontSize: 18, fontWeight: 700,
                color: isActive ? theme.textHeader : "rgba(245,237,214,0.6)",
                textAlign: "center", lineHeight: 1.15,
              }}>
                {t.label}
              </div>
              {isActive && (
                <div style={{
                  position: "absolute", bottom: -1, left: "12%", right: "12%",
                  height: 3, background: c,
                  boxShadow: `0 0 10px ${c}`,
                  borderRadius: 2,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {currentPanel && (
        <div style={{
          flex: 1,
          padding: "44px 48px",
          borderRadius: 20,
          background: `linear-gradient(140deg, ${activeColor}16, ${activeColor}04)`,
          border: `1px solid ${activeColor}55`,
          boxShadow: `0 0 40px ${activeColor}22`,
          display: "flex", flexDirection: "column", gap: 20,
          opacity: panelCrossFade,
          position: "relative",
        }}>
          {currentPanel.kicker && (
            <div style={{
              fontFamily: mono, fontSize: 18, fontWeight: 700,
              letterSpacing: 3, color: activeColor, textTransform: "uppercase",
            }}>
              {currentPanel.kicker}
            </div>
          )}
          <div style={{
            fontFamily: inter, fontSize: 64, fontWeight: 900,
            color: theme.textHeader, lineHeight: 1.08, letterSpacing: -1,
            maxWidth: currentPanel.definitionChip ? "65%" : "100%",
          }}>
            {currentPanel.title}
          </div>
          {currentPanel.body && (
            <div style={{
              fontFamily: inter, fontSize: 26, fontWeight: 400,
              color: "rgba(245,237,214,0.8)", lineHeight: 1.4,
              maxWidth: currentPanel.definitionChip ? "65%" : "80%",
            }}>
              {currentPanel.body}
            </div>
          )}
          {currentPanel.definitionChip && (
            <div style={{
              position: "absolute", right: 40, bottom: 44,
              maxWidth: 340, padding: "20px 22px",
              borderRadius: 14,
              background: "rgba(15,23,41,0.82)",
              border: `1px solid ${activeColor}66`,
            }}>
              <div style={{
                fontFamily: mono, fontSize: 12, fontWeight: 800,
                letterSpacing: 3, color: activeColor, textTransform: "uppercase",
                marginBottom: 8,
              }}>
                {currentPanel.definitionChip.label}
              </div>
              <div style={{
                fontFamily: inter, fontSize: 16, color: "rgba(245,237,214,0.82)",
                lineHeight: 1.35,
              }}>
                {currentPanel.definitionChip.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
