import { Img, staticFile, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: mono } = loadMono();

// Safari/Chrome-style browser chrome: traffic-light dots + address bar + content slot.
// Used INSIDE other scenes (not a standalone scene). Can render an embedded image
// (screenshot) or any children.
export const MockBrowserFrame: React.FC<{
  url: string;
  screenshot?: string;
  tabs?: string[];
  activeTab?: number;
  children?: React.ReactNode;
  width?: string | number;
  height?: string | number;
}> = ({ url, screenshot, tabs, activeTab = 0, children, width = "88%", height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 15 } });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: 20,
      }}
    >
      <div
        style={{
          width,
          height,
          borderRadius: 18,
          background: "#0B0F17",
          border: "1px solid #1F2A3C",
          boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
          overflow: "hidden",
          opacity: entry,
          transform: `translateY(${(1 - entry) * 22}px)`,
        }}
      >
        {/* Chrome bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 18px",
            background: "#14181F",
            borderBottom: "1px solid #1F2A3C",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 7 }}>
            <span style={dot("#FF5F57")} />
            <span style={dot("#FEBC2E")} />
            <span style={dot("#28C940")} />
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#F3F4F6",
                borderRadius: 12,
                padding: "7px 20px",
                fontFamily: mono,
                fontSize: 19,
                color: "#1F2937",
                letterSpacing: 0.2,
                maxWidth: "86%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {url}
            </div>
          </div>
          {/* spacer for symmetry */}
          <div style={{ width: 49 }} />
        </div>

        {/* Content area */}
        <div
          style={{
            width: "100%",
            aspectRatio: screenshot ? "16 / 10" : undefined,
            background: "#06090F",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {screenshot && (
            <Img
              src={staticFile(screenshot)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          )}
          {children}
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {tabs.map((t, i) => (
            <div
              key={i}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: `1px solid ${i === activeTab ? "#60A5FA" : "#334155"}`,
                background: i === activeTab ? "rgba(96,165,250,0.15)" : "rgba(30,41,59,0.45)",
                color: i === activeTab ? "#BFDBFE" : "#94A3B8",
                fontFamily: mono,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: 0.3,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const dot = (bg: string): React.CSSProperties => ({
  width: 13,
  height: 13,
  borderRadius: 999,
  background: bg,
});
