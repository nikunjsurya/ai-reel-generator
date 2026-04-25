import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadInter();
const { fontFamily: mono } = loadMono();

// Nested inside MockTweetCard when a tweet links to documentation.
// Mirrors real X link-card previews: section label, bold headline, muted subtext,
// "From <sourceDomain>" footer.
export const DocsPreviewCard: React.FC<{
  section?: string;
  headline: string;
  subtext?: string;
  sourceDomain: string;
}> = ({ section, headline, subtext, sourceDomain }) => {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "18px 20px",
        borderRadius: 16,
        background: "#0E1419",
        border: "1px solid #2F3336",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {section && (
        <div
          style={{
            fontFamily: mono,
            fontSize: 18,
            color: "#71767B",
            textTransform: "uppercase",
            letterSpacing: 1.5,
            fontWeight: 600,
          }}
        >
          {section}
        </div>
      )}
      <div
        style={{
          fontFamily: inter,
          fontSize: 30,
          fontWeight: 700,
          color: "#E7E9EA",
          lineHeight: 1.2,
        }}
      >
        {headline}
      </div>
      {subtext && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 22,
            color: "#8B98A5",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {subtext}
        </div>
      )}
      <div
        style={{
          fontFamily: inter,
          fontSize: 18,
          color: "#71767B",
          marginTop: 4,
        }}
      >
        From {sourceDomain}
      </div>
    </div>
  );
};
