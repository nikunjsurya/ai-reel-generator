import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

// MapMoment, abstract "global reach" visualization. A stylized globe-ish
// ring of dots with labeled country/region pins. No real map data (no
// GeoJSON dependency), intentionally abstract, reads as "global" at a glance.
// Props: { headline?: string, stat?: string (big number like "70+ countries"),
//   pins?: [string] (4-8 country/city names) }
export const MapMoment: React.FC<{ props: SceneProps; durationInFrames: number }> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];

  const data = props as unknown as { stat?: string; pins?: string[] };
  const pins = Array.isArray(data.pins) ? data.pins.slice(0, 8) : [];
  const stat = data.stat;

  const ringSpring = spring({ frame, fps, config: { damping: 14 } });
  const statSpring = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const outFade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // 40-dot ring that rotates slowly; 8 accent pulse-pins superimposed on top.
  const ringDots = Array.from({ length: 40 }).map((_, i) => {
    const rot = (i / 40) * Math.PI * 2 + frame / 240;
    const r = 280;
    const x = Math.cos(rot) * r;
    const y = Math.sin(rot) * r;
    const isPin = pins.length > 0 && i % Math.max(1, Math.floor(40 / pins.length)) === 0;
    return { x, y, isPin };
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outFade }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${accent}1a 0%, transparent 55%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", gap: 32,
      }}>
        {props.headline && (
          <div style={{
            fontFamily: inter, fontSize: 48, fontWeight: 900,
            color: theme.textHeader, textAlign: "center",
            lineHeight: 1.15, maxWidth: 860,
            opacity: ringSpring,
            transform: `translateY(${(1 - ringSpring) * 12}px)`,
          }}>{props.headline}</div>
        )}
        {/* Ring SVG.
            viewBox expanded from -320/640 to -420/840 (60px extra padding on each
            side) so pin labels at radius 350 don't get clipped when label strings
            are long or when the label is at the top/bottom extremes. Container
            also grew to 820x820 to keep proportions natural. */}
        <div style={{
          position: "relative", width: 820, height: 820,
          transform: `scale(${ringSpring})`,
        }}>
          <svg viewBox="-420 -420 840 840" width="100%" height="100%">
            {/* Concentric rings */}
            <circle cx={0} cy={0} r={280} fill="none" stroke={`${accent}44`} strokeWidth={1.5} strokeDasharray="3,6" />
            <circle cx={0} cy={0} r={200} fill="none" stroke={`${accent}22`} strokeWidth={1} strokeDasharray="2,8" />
            <circle cx={0} cy={0} r={120} fill="none" stroke={`${accent}33`} strokeWidth={1} strokeDasharray="2,4" />
            {/* Ring dots */}
            {ringDots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y}
                r={d.isPin ? 6 : 2}
                fill={d.isPin ? accent : `${accent}66`}
                opacity={d.isPin ? 1 : 0.5}
              />
            ))}
            {/* Pin labels, 4 pins max get labeled so it doesn't clutter.
                Labels sit at r=350 which is now inside the expanded viewBox.
                dominantBaseline="middle" vertically centers the label on its
                anchor point so top/bottom extremes render fully. */}
            {pins.slice(0, 4).map((label, i) => {
              const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
              const r = 350;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              const fadeIn = spring({ frame: frame - 18 - i * 4, fps, config: { damping: 14 } });
              const shortLabel = String(label).toUpperCase().slice(0, 14);
              return (
                <g key={i} opacity={fadeIn}>
                  <text x={x} y={y}
                    fontFamily={mono} fontSize={18} fontWeight={700}
                    fill={theme.textHeader} textAnchor="middle"
                    dominantBaseline="middle">
                    {shortLabel}
                  </text>
                </g>
              );
            })}
            {/* Center stat */}
            {stat && (
              <text x={0} y={10}
                fontFamily={inter} fontSize={80} fontWeight={900}
                fill={accent} textAnchor="middle"
                opacity={statSpring}>
                {stat}
              </text>
            )}
          </svg>
        </div>
        {props.subhead && (
          <div style={{
            fontFamily: inter, fontSize: 28, color: "#cbd5e1",
            textAlign: "center", maxWidth: 720, lineHeight: 1.4,
            opacity: statSpring,
          }}>{props.subhead}</div>
        )}
      </div>
    </div>
  );
};
