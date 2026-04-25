import { BRAND, ACCENT_HEX } from "../brand";
import type { BrandKey } from "../types";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

// Persistent top-of-screen "[Logo A] vs [Logo B]" row used across an
// entire comparison-type short. Replaces BrandHeader at root when
// headerStyle === "comparison".
export const ComparisonHeader: React.FC<{
  left: { brand: BrandKey; label: string };
  right: { brand: BrandKey; label: string };
}> = ({ left, right }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 36,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 22,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <LogoCard brand={left.brand} label={left.label} bg="#FFFFFF" />
      <span
        style={{
          fontFamily: inter,
          fontSize: 22,
          color: "#94A3B8",
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        vs
      </span>
      <LogoCard brand={right.brand} label={right.label} bg="#0B0F17" />
    </div>
  );
};

const LogoCard: React.FC<{ brand: BrandKey; label: string; bg: string }> = ({
  brand,
  label,
  bg,
}) => {
  const theme = BRAND[brand];
  const isDark = bg === "#0B0F17" || bg === "#000000";
  const fg = isDark ? "#F5EDD6" : "#0B0F17";
  const accent = ACCENT_HEX[theme.accent];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 14,
        background: bg,
        border: `1px solid ${isDark ? "#2F3336" : "#E2E8F0"}`,
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: accent,
          opacity: 0.85,
        }}
      />
      <span
        style={{
          fontFamily: inter,
          fontSize: 22,
          fontWeight: 800,
          color: fg,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
    </div>
  );
};
