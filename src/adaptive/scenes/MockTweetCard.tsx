import { Img, staticFile, spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { DocsPreviewCard } from "../components/DocsPreviewCard";

const { fontFamily: inter } = loadInter();

// Primary proof device per DIY Smart Code dissection.
// Renders a full-width X/Twitter dark-mode card with avatar, verified check,
// handle + timestamp, body text, nested embed (docs/image/none), and
// engagement bar (reply/retweet/like/views).
//
// Props carried on SceneProps.tweet via passthrough (see types.ts).

type TweetShape = {
  avatar: string; // image path under public/
  handle: string;
  display: string;
  name?: string; // optional, used for the avatar-letter fallback when no avatar image
  verified?: boolean;
  timestamp: string;
  body: string;
  embedType: "docs" | "image" | "none";
  embedData?: {
    section?: string;
    headline?: string;
    subtext?: string;
    sourceDomain?: string;
    imagePath?: string;
  };
  engagement?: {
    replies?: number | string;
    retweets?: number | string;
    likes?: number | string;
    views?: string;
  };
};

export const MockTweetCard: React.FC<{
  props: SceneProps;
  durationInFrames: number;
}> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tweet = (props as unknown as { tweet?: TweetShape }).tweet;

  const cardSpring = spring({ frame, fps, config: { damping: 16 } });
  const exitStart = durationInFrames - 10;
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = 1 - exitProgress * 0.04;
  const opacity = cardSpring * (1 - exitProgress);

  if (!tweet) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "160px 40px 120px",
      }}
    >
      <div
        style={{
          width: "92%",
          borderRadius: 20,
          background: "#16181C",
          border: "1px solid #2F3336",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          opacity,
          transform: `translateY(${(1 - cardSpring) * 30}px) scale(${scale})`,
        }}
      >
        {/* Header: avatar + name + verified + handle + timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              overflow: "hidden",
              background: "#1F2937",
              border: "1px solid #2F3336",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {tweet.avatar ? (
              <Img
                src={staticFile(tweet.avatar)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: "linear-gradient(135deg, #E2725B, #5EEAD4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#0a1020", fontFamily: "'Inter',sans-serif",
                fontSize: 28, fontWeight: 900,
              }}>
                {(tweet.name ?? tweet.handle ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#E7E9EA",
                  whiteSpace: "nowrap",
                }}
              >
                {tweet.display}
              </span>
              {tweet.verified && <VerifiedBadge />}
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 20,
                color: "#71767B",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              @{tweet.handle} · {tweet.timestamp}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 30,
            color: "#E7E9EA",
            lineHeight: 1.35,
            letterSpacing: 0.1,
            whiteSpace: "pre-wrap",
          }}
        >
          {tweet.body}
        </div>

        {/* Nested embed */}
        {tweet.embedType === "docs" && tweet.embedData && (
          <DocsPreviewCard
            section={tweet.embedData.section}
            headline={tweet.embedData.headline ?? ""}
            subtext={tweet.embedData.subtext}
            sourceDomain={tweet.embedData.sourceDomain ?? ""}
          />
        )}
        {tweet.embedType === "image" && tweet.embedData?.imagePath && (
          <div
            style={{
              marginTop: 10,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #2F3336",
              background: "#06090F",
            }}
          >
            <Img
              src={staticFile(tweet.embedData.imagePath)}
              style={{ width: "100%", display: "block", objectFit: "cover" }}
            />
          </div>
        )}

        {/* Engagement bar */}
        {tweet.engagement && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              paddingTop: 14,
              borderTop: "1px solid #2F3336",
              color: "#71767B",
              fontFamily: inter,
              fontSize: 22,
            }}
          >
            <EngagementItem icon="reply" value={tweet.engagement.replies} />
            <EngagementItem icon="retweet" value={tweet.engagement.retweets} />
            <EngagementItem icon="like" value={tweet.engagement.likes} />
            <EngagementItem icon="views" value={tweet.engagement.views} />
            <EngagementItem icon="bookmark" />
            <EngagementItem icon="share" />
          </div>
        )}
      </div>
    </div>
  );
};

const VerifiedBadge: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
    <path
      d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.97.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      fill="#1D9BF0"
    />
  </svg>
);

const iconPaths: Record<string, string> = {
  reply:
    "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z",
  retweet:
    "M4.5 3.88l4.432 4.44-1.42 1.414L5 7.2v13.7H3V7.2L.488 9.734.2 8.32l4.3-4.44zM7 19.88V4.2h2v15.68z",
  like:
    "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z",
  views:
    "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z",
  bookmark:
    "M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z",
  share:
    "M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z",
};

const EngagementItem: React.FC<{ icon: string; value?: number | string }> = ({ icon, value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#71767B">
      <path d={iconPaths[icon]} />
    </svg>
    {value !== undefined && <span>{formatCount(value)}</span>}
  </div>
);

const formatCount = (v: number | string): string => {
  if (typeof v === "string") return v;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return v.toString();
};
