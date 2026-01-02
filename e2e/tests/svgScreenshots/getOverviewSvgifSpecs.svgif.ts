import type { SVG_SCREENSHOT_DETAILS } from "./SVG_SCREENSHOT_DETAILS";
import type { SVGifScene } from "./utils/constants";

export const getOverviewSvgifSpecs = async (
  existing: Record<keyof typeof SVG_SCREENSHOT_DETAILS, SVGifScene[]>,
) => {
  const sliceScenes = (
    fileName: keyof typeof SVG_SCREENSHOT_DETAILS,
    start: number,
    end = existing[fileName].length,
  ) => {
    const scenes = structuredClone(existing[fileName].slice(start, end));
    if (scenes.length !== end - start) {
      throw new Error(
        `Not enough scenes in ${fileName}: expected ${end - start}, got ${scenes.length}`,
      );
    }
    const lastScene = scenes[scenes.length - 1];
    lastScene.animations.push({ type: "wait", duration: 4000 });
    return scenes;
  };
  const overviewSvgifSpecs = [
    /** Overview section */
    {
      fileName: "linked_data",
      usedExternally: true,
      scenes: [...sliceScenes("table", 2)],
    },
    {
      fileName: "interactive_dashboards",
      usedExternally: true,
      scenes: [
        ...sliceScenes("dashboard", 15),
        ...sliceScenes("ai_assistant", 0),

        ...sliceScenes("sql_editor", 8, 10),
        ...sliceScenes("sql_editor", 18, 19),
        ...sliceScenes("file_importer", 0),
      ],
    },
    {
      fileName: "ai_assistant_overview",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 0)],
    },
    {
      fileName: "sql_editor_overview",
      usedExternally: true,
      scenes: [
        ...sliceScenes("sql_editor", 8, 10),
        ...sliceScenes("sql_editor", 18, 19),
      ],
    },

    {
      fileName: "ai_assistant_questions",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 20)],
    },

    {
      fileName: "ai_assistant_dashboards",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 1, 5)],
    },
    {
      fileName: "ai_assistant_mcp_tools",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 6, 13)],
    },

    /** SQL section */
    {
      fileName: "sql_editor_suggestions",
      usedExternally: true,
      scenes: [...sliceScenes("sql_editor", 7, 8)],
    },
    {
      fileName: "sql_editor_charts",
      usedExternally: true,
      scenes: [...sliceScenes("sql_editor", 14)],
    },
    {
      fileName: "sql_editor_jsonb",
      usedExternally: true,
      scenes: [...sliceScenes("sql_editor", 8, 10)],
    },

    /** Backup and restore section */
    {
      fileName: "backup_and_restore_overview",
      usedExternally: true,
      scenes: [...sliceScenes("backup_and_restore", 2)],
    },

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
  ];

  const svgifCovers: { fileName: string; svgSceneFileName: string }[] = [
    {
      fileName: "linked_data",
      svgSceneFileName: existing.dashboard[20]!.svgFileName,
    },
    {
      fileName: "sql_editor",
      svgSceneFileName: existing.sql_editor[13]!.svgFileName,
    },
    {
      fileName: "sql_editor1",
      svgSceneFileName: existing.sql_editor[18]!.svgFileName,
    },
    {
      fileName: "backups",
      svgSceneFileName: existing.backup_and_restore[16]!.svgFileName,
    },

    {
      fileName: "ai_assistant",
      svgSceneFileName: existing.ai_assistant[4]!.svgFileName,
    },
  ];

  return { svgifCovers, overviewSvgifSpecs };
};
