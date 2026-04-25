import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "../brand";
import type { BrandKey } from "../types";

// Large background watermark pattern, brand-specific.
// Anthropic: scattered molecular nodes + sparkles.
// OpenAI: hex dot grid.
// Gemini: soft gradient blobs.
// Meta: infinity arcs. etc.

const Anthropic: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 180) * 6;
  return (
    <svg
      width="1080"
      height="1920"
      viewBox="0 0 1080 1920"
      style={{ position: "absolute", inset: 0, opacity }}
    >
      <g fill="#F5EDD6" opacity="0.6">
        {/* molecular cluster nodes */}
        <circle cx={180 + drift} cy="220" r="5" />
        <circle cx={260 + drift} cy="270" r="4" />
        <line x1={180 + drift} y1="220" x2={260 + drift} y2="270" stroke="#F5EDD6" strokeWidth="1.5" />
        <circle cx="380" cy="320" r="4" />
        <line x1={260 + drift} y1="270" x2="380" y2="320" stroke="#F5EDD6" strokeWidth="1.5" />
        <circle cx="520" cy="280" r="5" />
        <line x1="380" y1="320" x2="520" y2="280" stroke="#F5EDD6" strokeWidth="1.5" />

        <circle cx="780" cy="520" r="5" />
        <circle cx="880" cy="590" r="4" />
        <line x1="780" y1="520" x2="880" y2="590" stroke="#F5EDD6" strokeWidth="1.5" />
        <circle cx="940" cy="680" r="4" />
        <line x1="880" y1="590" x2="940" y2="680" stroke="#F5EDD6" strokeWidth="1.5" />

        <circle cx="120" cy="780" r="4" />
        <circle cx="200" cy="860" r="5" />
        <line x1="120" y1="780" x2="200" y2="860" stroke="#F5EDD6" strokeWidth="1.5" />

        <circle cx={560 + drift * 0.5} cy="1240" r="5" />
        <circle cx={680 + drift * 0.5} cy="1310" r="4" />
        <line x1={560 + drift * 0.5} y1="1240" x2={680 + drift * 0.5} y2="1310" stroke="#F5EDD6" strokeWidth="1.5" />
        <circle cx="820" cy="1380" r="4" />
        <line x1={680 + drift * 0.5} y1="1310" x2="820" y2="1380" stroke="#F5EDD6" strokeWidth="1.5" />

        <circle cx="120" cy="1520" r="4" />
        <circle cx="260" cy="1560" r="5" />
        <line x1="120" y1="1520" x2="260" y2="1560" stroke="#F5EDD6" strokeWidth="1.5" />

        <circle cx="900" cy="1720" r="4" />
        <circle cx="960" cy="1800" r="5" />
        <line x1="900" y1="1720" x2="960" y2="1800" stroke="#F5EDD6" strokeWidth="1.5" />
      </g>
      {/* large soft sparkles */}
      <g fill="#F5EDD6" opacity="0.3">
        {[
          [300, 500, 90], [750, 820, 130], [180, 1100, 100], [880, 1180, 110], [420, 1620, 95],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(frame * 0.1) + i * 30})`}>
            <rect x={-1.5} y={-s / 2} width={3} height={s} />
            <rect x={-s / 2} y={-1.5} width={s} height={3} />
            <rect x={-1} y={-s / 2} width={2} height={s} transform="rotate(45)" />
            <rect x={-s / 2} y={-1} width={s} height={2} transform="rotate(45)" />
          </g>
        ))}
      </g>
    </svg>
  );
};

const DotGrid: React.FC<{ opacity: number; color: string }> = ({ opacity, color }) => {
  const rows = 24, cols = 14;
  return (
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity }}>
      <g fill={color} opacity="0.5">
        {Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <circle key={`${r}-${c}`} cx={40 + c * 80} cy={40 + r * 80} r="2.5" />
          ))
        )}
      </g>
    </svg>
  );
};

const Gradient: React.FC<{ opacity: number; c1: string; c2: string }> = ({ opacity, c1, c2 }) => (
  <div style={{ position: "absolute", inset: 0, opacity }}>
    <div style={{
      position: "absolute", top: "10%", left: "-10%", width: "60%", aspectRatio: "1",
      background: `radial-gradient(circle, ${c1}, transparent 70%)`, filter: "blur(80px)",
    }} />
    <div style={{
      position: "absolute", bottom: "5%", right: "-10%", width: "55%", aspectRatio: "1",
      background: `radial-gradient(circle, ${c2}, transparent 70%)`, filter: "blur(80px)",
    }} />
  </div>
);

export const BrandWatermark: React.FC<{ brand: BrandKey }> = ({ brand }) => {
  const theme = BRAND[brand];
  if (brand === "anthropic") return <Anthropic opacity={theme.watermarkOpacity} />;
  if (brand === "gemini" || brand === "google") return <Gradient opacity={0.35} c1="#60A5FA" c2="#F5B302" />;
  if (brand === "meta") return <Gradient opacity={0.3} c1="#60A5FA" c2="#A78BFA" />;
  if (brand === "mistral") return <Gradient opacity={0.3} c1="#FBA434" c2="#F5B302" />;
  if (brand === "huggingface") return <Gradient opacity={0.3} c1="#F5B302" c2="#FBA434" />;
  if (brand === "xai") return <DotGrid opacity={0.25} color="#F5EDD6" />;
  if (brand === "deepseek") return <DotGrid opacity={0.25} color="#A78BFA" />;
  return <DotGrid opacity={0.22} color="#5EEAD4" />;
};
