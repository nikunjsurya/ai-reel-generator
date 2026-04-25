import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { SceneProps } from "../types";
import { BRAND, ACCENT_HEX } from "../brand";
import { CommandPill } from "../components/CommandPill";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

type OutroStyle = "subscribe" | "follow" | "pick" | "comment" | "version";

// CTAOutro variants (derived from DIY Smart Code dissection, each Short rotates
// the outro so viewers don't habituate):
//   - subscribe: red SUBSCRIBE button + video thumbnail style (V1)
//   - follow:    orange-bordered "Follow for more" pill, pure text (V2)
//   - pick:      "Drop your pick below ↓" + navy follow pill (V3)
//   - comment:   URL pill + green CLI pill + orange comment pill (V4)
//   - version:   legacy V5 style, label + big version + pills + CTA + source
export const CTAOutro: React.FC<{ props: SceneProps }> = ({ props }) => {
  const style = ((props as unknown as { outroStyle?: OutroStyle }).outroStyle) ?? "version";

  if (style === "follow") return <FollowOutro props={props} />;
  if (style === "subscribe") return <SubscribeOutro props={props} />;
  if (style === "pick") return <PickOutro props={props} />;
  if (style === "comment") return <CommentOutro props={props} />;
  return <VersionOutro props={props} />;
};

// -----------------------------------------------------------------------------
// Legacy V5 version-reveal-style outro (default).
// -----------------------------------------------------------------------------
const VersionOutro: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? theme.accent];
  const boxFade = spring({ frame, fps, config: { damping: 15 } });
  const ctaFade = spring({ frame: frame - 26, fps, config: { damping: 15 } });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      <div
        style={{
          width: "82%",
          padding: "28px 34px",
          borderRadius: 20,
          background: "rgba(15,23,41,0.8)",
          border: `2px solid ${accent}`,
          boxShadow: `0 0 60px ${accent}44`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: boxFade,
          transform: `translateY(${(1 - boxFade) * 16}px)`,
        }}
      >
        <div
          style={{
            fontFamily: inter,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 6,
            color: theme.textHeader,
            textTransform: "uppercase",
          }}
        >
          {props.label ?? "Both land in"}
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 140,
            fontWeight: 900,
            color: accent,
            letterSpacing: -2,
            lineHeight: 1,
            textShadow: `0 0 60px ${accent}55`,
          }}
        >
          {props.version ?? "v—"}
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          {props.pills?.map((p, i) => (
            <CommandPill key={i} text={p.text} accent={p.accent} size="sm" delay={12 + i * 8} />
          ))}
        </div>
      </div>
      {props.cta && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 50,
            fontWeight: 900,
            color: theme.textHeader,
            opacity: ctaFade,
          }}
        >
          {props.cta}
        </div>
      )}
      {props.source && (
        <div
          style={{
            fontFamily: mono,
            fontSize: 22,
            color: "#94a3b8",
            opacity: ctaFade * 0.7,
          }}
        >
          Source: {props.source}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// DIY V2-style: pure text + orange "Follow for more" pill. Minimalist.
// -----------------------------------------------------------------------------
const FollowOutro: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? "orange"];
  const topFade = spring({ frame, fps, config: { damping: 15 } });
  const headlineFade = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const subFade = spring({ frame: frame - 18, fps, config: { damping: 15 } });
  const pillFade = spring({ frame: frame - 28, fps, config: { damping: 14 } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "0 60px",
      }}
    >
      {props.label && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#94A3B8",
            opacity: topFade,
          }}
        >
          {props.label}
        </div>
      )}
      <div
        style={{
          fontFamily: inter,
          fontSize: 92,
          fontWeight: 900,
          color: accent,
          letterSpacing: -1.5,
          lineHeight: 1.05,
          textAlign: "center",
          textShadow: `0 0 48px ${accent}44`,
          opacity: headlineFade,
          transform: `translateY(${(1 - headlineFade) * 18}px)`,
        }}
      >
        {props.headline ?? "Try it."}
      </div>
      {props.subhead && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 34,
            color: "#CBD5E1",
            fontStyle: "italic",
            textAlign: "center",
            opacity: subFade,
          }}
        >
          {props.subhead}
        </div>
      )}
      <div
        style={{
          marginTop: 18,
          padding: "18px 38px",
          borderRadius: 999,
          border: `2px solid ${accent}`,
          background: "rgba(15,23,41,0.6)",
          boxShadow: `0 0 36px ${accent}44`,
          fontFamily: inter,
          fontSize: 34,
          fontWeight: 800,
          color: accent,
          opacity: pillFade,
          transform: `scale(${0.92 + pillFade * 0.08})`,
        }}
      >
        {props.cta ?? `Follow for more ${theme.display}`}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// DIY V1-style: red SUBSCRIBE button + hint of a video card.
// -----------------------------------------------------------------------------
const SubscribeOutro: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const cardFade = spring({ frame, fps, config: { damping: 15 } });
  const btnFade = spring({ frame: frame - 24, fps, config: { damping: 12 } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        padding: "0 60px",
      }}
    >
      <div
        style={{
          fontFamily: inter,
          fontSize: 68,
          fontWeight: 900,
          color: theme.textHeader,
          letterSpacing: -0.5,
          textAlign: "center",
          lineHeight: 1.1,
          opacity: cardFade,
          transform: `translateY(${(1 - cardFade) * 16}px)`,
        }}
      >
        {props.headline ?? "▶ FULL VIDEO"}
      </div>
      {props.subhead && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 30,
            color: "#CBD5E1",
            textAlign: "center",
            maxWidth: 680,
            opacity: cardFade * 0.9,
          }}
        >
          {props.subhead}
        </div>
      )}
      <div
        style={{
          padding: "20px 46px",
          borderRadius: 14,
          background: "#EF4444",
          boxShadow: "0 0 44px rgba(239,68,68,0.55)",
          fontFamily: inter,
          fontSize: 42,
          fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: 2,
          opacity: btnFade,
          transform: `scale(${0.9 + btnFade * 0.1})`,
        }}
      >
        SUBSCRIBE ↓
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// DIY V3-style: minimalist logo reset + "Pick below" + navy follow pill.
// -----------------------------------------------------------------------------
const PickOutro: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? "orange"];
  const headlineFade = spring({ frame, fps, config: { damping: 15 } });
  const arrowFade = spring({ frame: frame - 14, fps, config: { damping: 15 } });
  const pillFade = spring({ frame: frame - 26, fps, config: { damping: 14 } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "0 60px",
      }}
    >
      <div
        style={{
          fontFamily: inter,
          fontSize: 78,
          fontWeight: 900,
          color: theme.textHeader,
          letterSpacing: -1,
          lineHeight: 1.05,
          textAlign: "center",
          opacity: headlineFade,
          transform: `translateY(${(1 - headlineFade) * 16}px)`,
        }}
      >
        {props.headline ?? "Pick below"}
      </div>
      {props.subhead && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 32,
            color: accent,
            fontWeight: 700,
            textAlign: "center",
            opacity: arrowFade,
          }}
        >
          {props.subhead}
        </div>
      )}
      <div
        style={{
          fontFamily: inter,
          fontSize: 72,
          color: accent,
          opacity: arrowFade,
          lineHeight: 1,
        }}
      >
        ↓
      </div>
      <div
        style={{
          marginTop: 10,
          padding: "16px 34px",
          borderRadius: 999,
          background: "#172554",
          border: "2px solid #3B82F6",
          boxShadow: "0 0 28px rgba(59,130,246,0.45)",
          fontFamily: inter,
          fontSize: 30,
          fontWeight: 800,
          color: "#DBEAFE",
          opacity: pillFade,
          transform: `scale(${0.92 + pillFade * 0.08})`,
        }}
      >
        {props.cta ?? "Follow @hindi-ai"}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// DIY V4-style: URL pill + green CLI pill + orange comment pill.
// -----------------------------------------------------------------------------
const CommentOutro: React.FC<{ props: SceneProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = BRAND[props.brand];
  const accent = ACCENT_HEX[props.accent ?? "orange"];
  const urlFade = spring({ frame, fps, config: { damping: 15 } });
  const cliFade = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const questionFade = spring({ frame: frame - 22, fps, config: { damping: 15 } });
  const btnFade = spring({ frame: frame - 32, fps, config: { damping: 14 } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: "0 60px",
      }}
    >
      {props.source && (
        <div
          style={{
            padding: "14px 28px",
            borderRadius: 14,
            border: `2px solid ${accent}`,
            background: "rgba(10,16,32,0.6)",
            boxShadow: `0 0 22px ${accent}33`,
            fontFamily: mono,
            fontSize: 26,
            color: accent,
            fontWeight: 700,
            opacity: urlFade,
          }}
        >
          {props.source}
        </div>
      )}
      {props.command && (
        <div
          style={{
            padding: "12px 24px",
            borderRadius: 14,
            border: "2px solid #22C55E",
            background: "rgba(6,12,8,0.7)",
            boxShadow: "0 0 22px rgba(34,197,94,0.35)",
            fontFamily: mono,
            fontSize: 26,
            color: "#86EFAC",
            fontWeight: 700,
            opacity: cliFade,
          }}
        >
          &gt; {props.command}
        </div>
      )}
      <div
        style={{
          fontFamily: inter,
          fontSize: 60,
          fontWeight: 900,
          color: theme.textHeader,
          letterSpacing: -0.5,
          lineHeight: 1.1,
          textAlign: "center",
          opacity: questionFade,
          transform: `translateY(${(1 - questionFade) * 14}px)`,
          marginTop: 8,
        }}
      >
        {props.headline ?? "What do you think?"}
      </div>
      <div
        style={{
          marginTop: 8,
          padding: "16px 32px",
          borderRadius: 999,
          border: `2px solid ${accent}`,
          background: "rgba(10,16,32,0.6)",
          boxShadow: `0 0 30px ${accent}44`,
          fontFamily: inter,
          fontSize: 30,
          fontWeight: 800,
          color: accent,
          opacity: btnFade,
          transform: `scale(${0.92 + btnFade * 0.08})`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span>💬</span>
        {props.cta ?? "Tell me in the comments"}
      </div>
    </div>
  );
};
