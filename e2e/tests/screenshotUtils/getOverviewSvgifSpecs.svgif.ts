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
      ...sliceScenes("command_palette", 1, 4),
      ...sliceScenes("schema_diagram", 1, 4),

      ...sliceScenes("sql_editor", 8, 10),
      ...sliceScenes("sql_editor", 18, 19),
      ...sliceScenes("dashboard", 0, 3),
      ...sliceScenes("ai_assistant", 0, 2),
      ...sliceScenes("file_importer", 0, 2),
    ],
  };
};
