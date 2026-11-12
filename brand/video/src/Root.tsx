import { Composition } from "remotion";
import { FPS, Film, TOTAL } from "./Film";

export const Root = () => (
  <>
    <Composition id="Streets16x9" component={Film} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
  </>
);
