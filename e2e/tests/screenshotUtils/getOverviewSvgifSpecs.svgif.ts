import { fileName } from "utils/utils";
import type { SVGifScene } from "./utils/constants";
import type { SVGIfSpec } from "./utils/saveSVGifs";

export const getOverviewSvgifSpecs = async (
  existing: Record<string, SVGifScene[]>,
): Promise<SVGIfSpec> => {
  const sliceScenes = (fileName: string, start: number, end: number) => {
    const scenes = existing[fileName].slice(start, end);
    if (scenes.length !== end - start) {
      throw new Error(
        `Not enough scenes in ${fileName}: expected ${end - start}, got ${scenes.length}`,
      );
    }
    return scenes;
  };
  return {
    fileName: "overview",
    scenes: [
      ...sliceScenes("sql_editor", 0, 4),
      ...sliceScenes("dashboard", 0, 3),
      ...sliceScenes("command_palette", 0, 2),
      ...sliceScenes("ai_assistant", 0, 2),
      ...sliceScenes("schema_diagram", 0, 2),
      ...sliceScenes("file_importer", 0, 2),
    ],
  };
};
