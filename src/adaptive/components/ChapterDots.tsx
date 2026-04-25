import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Chapter, CaptionsFile } from "../types";

type Props = {
  chapters: Chapter[];
  captions: CaptionsFile;
  activeColor: string;
  totalFrames: number;
};

// Compute per-chapter start/end time from the constituent beats.
function computeChapterWindows(chapters: Chapter[], captions: CaptionsFile) {
  return chapters.map((ch) => {
    const beatTimes = ch.beatIds
      .map((id) => captions.beats.find((b) => b.id === id))
      .filter(Boolean) as CaptionsFile["beats"];
    const startSec = beatTimes.length ? Math.min(...beatTimes.map((b) => b.startSec)) : 0;
    const endSec = beatTimes.length ? Math.max(...beatTimes.map((b) => b.endSec)) : 0;
    return { id: ch.id, title: ch.title, startSec, endSec };
  });
}

export const ChapterDots: React.FC<Props> = ({ chapters, captions, activeColor, totalFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;

  const windows = computeChapterWindows(chapters, captions);
  const activeIndex = windows.findIndex((w) => nowSec >= w.startSec && nowSec < w.endSec);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: 32,
        display: "flex",
        gap: 10,
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 9,
      }}
    >
      {windows.map((_, i) => {
        const isActive = i === activeIndex;
        const isPast = activeIndex >= 0 && i < activeIndex;
        const opacity = isActive ? 1 : isPast ? 0.6 : 0.22;
        const size = isActive ? 10 : 7;
        const bg = isActive ? activeColor : isPast ? "#F5EDD6" : "#F5EDD6";
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: bg,
              opacity,
              boxShadow: isActive ? `0 0 10px ${activeColor}` : "none",
              transition: "all 120ms ease-out",
            }}
          />
        );
      })}
    </div>
  );
};
