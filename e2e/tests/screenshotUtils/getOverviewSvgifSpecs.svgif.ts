import type { SVG_SCREENSHOT_DETAILS } from "./SVG_SCREENSHOT_DETAILS";
import type { SVGifScene } from "./utils/constants";
import type { SVGIfSpec } from "./utils/saveSVGifs";

export const getOverviewSvgifSpecs = async (
  existing: Record<string, SVGifScene[]>,
): Promise<(SVGIfSpec & { usedExternally?: boolean })[]> => {
  const sliceScenes = (
    fileName: keyof typeof SVG_SCREENSHOT_DETAILS,
    start: number,
    end = existing[fileName].length,
  ) => {
    const scenes = existing[fileName].slice(start, end);
    if (scenes.length !== end - start) {
      throw new Error(
        `Not enough scenes in ${fileName}: expected ${end - start}, got ${scenes.length}`,
      );
    }
    return scenes;
  };
  return [
    {
      fileName: "overview",
      scenes: [
        ...sliceScenes("command_palette", 1, 8),
        ...sliceScenes("schema_diagram", 1, 6),
        ...sliceScenes("dashboard", 6),
        ...sliceScenes("ai_assistant", 0),

        ...sliceScenes("sql_editor", 8, 10),
        ...sliceScenes("sql_editor", 18, 19),
        ...sliceScenes("file_importer", 0),
      ],
    },
    {
      fileName: "linked_data",
      usedExternally: true,
      scenes: [
        ...sliceScenes("table", 2),
        ...sliceScenes("schema_diagram", 1, 6),
        ...sliceScenes("dashboard", 6),
        ...sliceScenes("ai_assistant", 0),

        ...sliceScenes("sql_editor", 8, 10),
        ...sliceScenes("sql_editor", 18, 19),
        ...sliceScenes("file_importer", 0),
      ],
    },
  ];
};
