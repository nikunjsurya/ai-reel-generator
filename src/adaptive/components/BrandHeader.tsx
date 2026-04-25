import { BRAND } from "../brand";
import type { BrandKey } from "../types";

// Brand logo lockup pinned top-center. Serif "Claude Code" style, but each brand
// renders its own wordmark + glyph. For V1, all brands use a simple text logo
// with a small colored glyph; can be swapped to SVG per brand later.

const Glyph: Record<BrandKey, React.FC<{ color: string }>> = {
  anthropic: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <g fill={color}>
        <rect x="48" y="8" width="4" height="84" transform="rotate(0 50 50)" />
        <rect x="48" y="8" width="4" height="84" transform="rotate(45 50 50)" />
        <rect x="48" y="8" width="4" height="84" transform="rotate(90 50 50)" />
        <rect x="48" y="8" width="4" height="84" transform="rotate(135 50 50)" />
      </g>
    </svg>
  ),
  openai: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" stroke={color} strokeWidth="4" fill="none" />
    </svg>
  ),
  gemini: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <path d="M50 10 L60 45 L90 50 L60 55 L50 90 L40 55 L10 50 L40 45 Z" fill={color} />
    </svg>
  ),
  google: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="32" stroke={color} strokeWidth="6" fill="none" />
      <rect x="50" y="45" width="40" height="10" fill={color} />
    </svg>
  ),
  meta: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <path d="M15 60 Q30 25 50 50 Q70 75 85 40" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  ),
  xai: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <path d="M20 20 L80 80 M80 20 L20 80" stroke={color} strokeWidth="8" strokeLinecap="round" />
    </svg>
  ),
  deepseek: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <ellipse cx="50" cy="55" rx="32" ry="22" fill={color} />
      <circle cx="62" cy="50" r="3" fill="#0a0e1c" />
    </svg>
  ),
  mistral: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <rect x="20" y="20" width="15" height="15" fill={color} />
      <rect x="40" y="20" width="15" height="15" fill={color} />
      <rect x="60" y="20" width="15" height="15" fill={color} />
      <rect x="20" y="45" width="15" height="15" fill={color} />
      <rect x="60" y="45" width="15" height="15" fill={color} />
      <rect x="20" y="70" width="15" height="15" fill={color} />
      <rect x="60" y="70" width="15" height="15" fill={color} />
    </svg>
  ),
  huggingface: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="55" r="32" fill={color} />
      <circle cx="38" cy="48" r="4" fill="#0a0a14" />
      <circle cx="62" cy="48" r="4" fill="#0a0a14" />
      <path d="M35 65 Q50 78 65 65" stroke="#0a0a14" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  ),
  github: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <path d="M50 15 C30 15 15 32 15 52 C15 68 25 81 40 86 L40 78 C33 79 31 74 31 74 C29 70 27 69 27 69 C24 67 27 67 27 67 C30 67 32 70 32 70 C35 75 40 73 42 72 C42 70 43 68 44 67 C33 66 23 62 23 48 C23 44 25 41 27 39 C27 38 25 34 28 30 C28 30 32 29 40 34 C43 33 47 32 51 32 C55 32 59 33 62 34 C70 29 74 30 74 30 C77 34 75 38 75 39 C77 41 79 44 79 48 C79 62 69 66 58 67 C59 68 60 70 60 73 L60 86 C75 81 85 68 85 52 C85 32 70 15 50 15 Z" fill={color} />
    </svg>
  ),
  generic: ({ color }) => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="32" fill={color} />
    </svg>
  ),
};

type BrandHeaderProps = {
  brand: BrandKey;
  size?: number;
  format?: "short" | "longform";
  label?: string;
};

// Long-form: BrandHeader sits top-right (not top-center) at a smaller size,
// because the video is ABOUT the product being reviewed, so the brand glyph
// belongs where a watermark goes. Short: centered lockup as before.
// `label` overrides the theme's default display name per-video (e.g. the
// anthropic theme says "Claude Code" but a Claude Design video needs its own).
export const BrandHeader: React.FC<BrandHeaderProps> = ({ brand, size, format = "short", label }) => {
  const theme = BRAND[brand];
  const GlyphComp = Glyph[brand];
  const isLongform = format === "longform";
  const fontSize = size ?? (isLongform ? 26 : 38);

  return (
    <div
      style={{
        position: "absolute",
        top: isLongform ? 32 : 48,
        left: isLongform ? "auto" : 0,
        right: isLongform ? 36 : 0,
        display: "flex",
        justifyContent: isLongform ? "flex-end" : "center",
        alignItems: "center",
        gap: isLongform ? 10 : 14,
        pointerEvents: "none",
        zIndex: 10,
        transform: isLongform ? "scale(0.78)" : "none",
        transformOrigin: "top right",
      }}
    >
      <GlyphComp color={theme.textHeader} />
      <div
        style={{
          fontFamily: "'Playfair Display', 'Times New Roman', serif",
          fontSize,
          fontWeight: 500,
          color: theme.textHeader,
          letterSpacing: 0.3,
        }}
      >
        {label ?? theme.display}
      </div>
    </div>
  );
};
