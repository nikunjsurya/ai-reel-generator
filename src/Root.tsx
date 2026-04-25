import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { AdaptiveShort } from "./adaptive/AdaptiveShort";
import { adaptiveShortSchema, type AdaptiveShortProps } from "./adaptive/types";

// AdaptiveReelDynamic is the single composition the ai-reel-generator
// pipeline renders. Duration is derived at render time from the narration
// MP3 itself (+ 0.3s tail pad), so reels of any length render exactly to
// their narration without hard-coding frame counts.
//
// The n8n WF2 workflow invokes this via:
//   npx remotion render AdaptiveReelDynamic out/<jobId>.mp4
//     --props=content/<jobId>.json
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AdaptiveReelDynamic"
      component={AdaptiveShort}
      fps={30}
      width={1080}
      height={1920}
      schema={adaptiveShortSchema}
      defaultProps={{
        id: "adaptive-reel-default",
        title: "Adaptive Reel",
        language: "english",
        voice: "nikunj",
        brand: "generic",
        channel: "reel-generator",
        format: "short",
        targetDurationSec: 70,
        audioSrc: "narration-adaptive-reel-default.mp3",
        captionsSrc: "captions-adaptive-reel-default.json",
        beats: [],
        captionsMode: "always",
        channelLabel: "",
        captionWordEffect: "magnify",
      } as AdaptiveShortProps}
      calculateMetadata={async ({ props }) => {
        // Probe the narration MP3 for its actual duration. If the file isn't
        // there yet (e.g. opening Remotion Studio with default props before
        // any reel has been rendered), fall back to targetDurationSec so the
        // composition still loads and renders blank.
        try {
          const audioDuration = await getAudioDurationInSeconds(
            staticFile(props.audioSrc),
          );
          return {
            durationInFrames: Math.max(60, Math.round((audioDuration + 0.3) * 30)),
          };
        } catch {
          const fallbackSec = props.targetDurationSec || 70;
          return {
            durationInFrames: Math.max(60, Math.round(fallbackSec * 30)),
          };
        }
      }}
    />
  );
};
