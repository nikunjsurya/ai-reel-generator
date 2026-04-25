import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

// Wraps a scene with a short opacity fade-in and fade-out so Sequence
// boundaries don't look like hard cuts. Keeps content static between.
export const SceneFade: React.FC<{
  durationInFrames: number;
  inFrames?: number;
  outFrames?: number;
  children: React.ReactNode;
}> = ({ durationInFrames, inFrames = 7, outFrames = 5, children }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, inFrames], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [Math.max(0, durationInFrames - outFrames), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};
