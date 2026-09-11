import type { PracticeLibrary } from "./types";
import { experienceLibraries } from "./experienceData";
import { userLyricsLibraries } from "./userLyrics";

export const sampleLibraries: PracticeLibrary[] = [
  ...experienceLibraries,
  ...userLyricsLibraries,
];
