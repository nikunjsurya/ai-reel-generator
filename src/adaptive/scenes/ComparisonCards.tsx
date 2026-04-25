import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../types";
import { ACCENT_HEX } from "../brand";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

type Card = {
  title: string;
  price?: string;
  tagline?: string;
  features: string[];
  accent?: string;
  glyph?: string;
};

type ComparisonData = {
  left?: Card;
  right?: Card;
  cards?: Card[];
  layout?: "2-up" | "3-up" | "4-up";
  winner?: "left" | "right" | null;
  winnerLabel?: string;
  ribbon?: { cardIndex: number; label: string; color?: string };
};

export const ComparisonCards: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = (props as unknown as { comparison?: ComparisonData }).comparison;
  if (!data) return null;

  const layout: "2-up" | "3-up" | "4-up" =
    data.layout ?? (data.cards && data.cards.length >= 3 ? `${data.cards.length}-up` as "3-up" | "4-up" : "2-up");

  const cards: Card[] =
    data.cards && data.cards.length
      ? data.cards
      : [data.left, data.right].filter(Boolean) as Card[];

  const headlineFade = spring({ frame, fps, config: { damping: 15 } });
  const winnerSpring = spring({ frame: frame - 36, fps, config: { damping: 15 } });
  const ribbonSpring = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  const accentPalette = ["blue", "purple", "green", "coral", "yellow", "cyan"];
  const cardMaxWidth = layout === "2-up" ? 440 : layout === "3-up" ? 360 : 300;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "200px 40px 160px",
        gap: 36,
      }}
    >
      {props.headline && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 52,
            fontWeight: 900,
            color: "#F5EDD6",
            textAlign: "center",
            letterSpacing: -0.5,
            lineHeight: 1.1,
            opacity: headlineFade,
            transform: `translateY(${(1 - headlineFade) * 14}px)`,
          }}
        >
          {props.headline}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: layout === "4-up" ? 16 : 24,
          width: "100%",
          position: "relative",
          justifyContent: "center",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {cards.map((card, i) => {
          const accentKey = (card.accent as keyof typeof ACCENT_HEX) ??
            (accentPalette[i % accentPalette.length] as keyof typeof ACCENT_HEX);
          const accent = ACCENT_HEX[accentKey];
          const entry = spring({ frame: frame - (6 + i * 6), fps, config: { damping: 16 } });
          const isRibboned = data.ribbon?.cardIndex === i;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                paddingTop: isRibboned ? 28 : 0,
                maxWidth: cardMaxWidth,
                flex: `1 1 ${cardMaxWidth - 40}px`,
                minWidth: 240,
              }}
            >
              {isRibboned && data.ribbon ? (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: `translate(-50%, ${(1 - ribbonSpring) * -10}px) scale(${0.9 + ribbonSpring * 0.1})`,
                    padding: "6px 18px",
                    background: data.ribbon.color ?? "#22C55E",
                    color: "#0a1020",
                    fontFamily: inter,
                    fontSize: 16,
                    fontWeight: 900,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    borderRadius: 999,
                    opacity: ribbonSpring,
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
                    zIndex: 3,
                  }}
                >
                  {data.ribbon.label}
                </div>
              ) : null}
              <ProductCard data={card} accent={accent} entry={entry} compact={layout !== "2-up"} />
            </div>
          );
        })}
      </div>

      {data.winner && data.winnerLabel && layout === "2-up" && (
        <WinnerBanner
          label={data.winnerLabel}
          side={data.winner}
          color="#22C55E"
          spring={winnerSpring}
        />
      )}
    </div>
  );
};

const WinnerBanner: React.FC<{
  label: string;
  side: "left" | "right";
  color: string;
  spring: number;
}> = ({ label, side, color, spring }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      transform: `translateY(${(1 - spring) * 18}px) scale(${0.92 + spring * 0.08})`,
      padding: "12px 26px",
      background: "#0A1020",
      border: `2px solid ${color}`,
      borderRadius: 999,
      boxShadow: `0 0 28px ${color}66`,
      fontFamily: inter,
      fontSize: 26,
      fontWeight: 900,
      color: "#86EFAC",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      opacity: spring,
      marginTop: 8,
    }}
  >
    <span style={{ fontSize: 20 }}>{side === "left" ? "◀" : ""}</span>
    <span style={{ fontSize: 22 }}>★</span>
    <span>{label}</span>
    <span style={{ fontSize: 20 }}>{side === "right" ? "▶" : ""}</span>
  </div>
);

const ProductCard: React.FC<{
  data: Card;
  accent: string;
  entry: number;
  compact?: boolean;
}> = ({ data, accent, entry, compact }) => {
  return (
    <div
      style={{
        padding: compact ? "22px 20px" : "28px 24px",
        borderRadius: 20,
        background: `linear-gradient(150deg, ${accent}20, ${accent}08)`,
        border: `1px solid ${accent}55`,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 10 : 14,
        opacity: entry,
        transform: `translateY(${(1 - entry) * 24}px)`,
      }}
    >
      {data.glyph ? (
        <div style={{
          fontSize: compact ? 30 : 36, color: accent, marginBottom: 2,
          textAlign: "center",
        }}>{data.glyph}</div>
      ) : null}
      <div
        style={{
          fontFamily: inter,
          fontSize: compact ? 26 : 32,
          fontWeight: 900,
          color: accent,
          letterSpacing: -0.3,
          textAlign: compact ? "center" : "left",
        }}
      >
        {data.title}
      </div>
      {data.tagline && (
        <div
          style={{
            fontFamily: inter,
            fontSize: compact ? 15 : 17,
            color: "#cbd5e1",
            lineHeight: 1.35,
            textAlign: compact ? "center" : "left",
          }}
        >
          {data.tagline}
        </div>
      )}
      {data.price && (
        <div
          style={{
            fontFamily: mono,
            fontSize: compact ? 20 : 24,
            color: "#F5EDD6",
            fontWeight: 700,
          }}
        >
          {data.price}
        </div>
      )}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: compact ? 8 : 10,
        }}
      >
        {data.features.map((f, i) => (
          <li
            key={i}
            style={{
              fontFamily: inter,
              fontSize: compact ? 18 : 22,
              color: "#E2E8F0",
              lineHeight: 1.35,
              display: "flex",
              gap: 10,
            }}
          >
            <span style={{ color: accent, fontWeight: 900, flexShrink: 0 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
