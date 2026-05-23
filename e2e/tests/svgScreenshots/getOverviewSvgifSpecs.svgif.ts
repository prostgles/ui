import { readFile } from "fs/promises";
import type { SVG_SCREENSHOT_DETAILS } from "./SVG_SCREENSHOT_DETAILS";
import { SVGIF_SCENES_SPECS_PATH, type SVGifScene } from "./utils/constants";

export const getOverviewSvgifSpecs = async () => {
  const svgifSpecsObj: Record<
    keyof typeof SVG_SCREENSHOT_DETAILS,
    SVGifScene[]
  > = JSON.parse(await readFile(SVGIF_SCENES_SPECS_PATH, "utf-8"));

  const sliceScenes = (
    fileName: keyof typeof SVG_SCREENSHOT_DETAILS,
    start: number,
    end = svgifSpecsObj[fileName].length,
  ) => {
    const scenes = structuredClone(svgifSpecsObj[fileName].slice(start, end));
    if (scenes.length !== end - start) {
      throw new Error(
        `Not enough scenes in ${fileName}: expected ${end - start}, got ${scenes.length}`,
      );
    }

    return scenes;
  };
  const overviewSvgifSpecs = [
    {
      fileName: "overview",
      scenes: [
        ...sliceScenes("sql_editor", 5, 7),
        ...sliceScenes("schema_diagram", 1, 3),
        ...sliceScenes("ai_assistant_agentic_workflow", 0, 1),
        ...sliceScenes("ai_assistant_agentic_workflow", 12, 15),
        ...sliceScenes("table_timechart", 6),
      ],
    },
    /** Overview section */
    {
      fileName: "linked_data",
      usedExternally: true,
      scenes: [...sliceScenes("table_timechart", 1)],
    },
    {
      fileName: "smart_form",
      usedExternally: true,
      scenes: [...sliceScenes("table", 2, 6)],
    },
    {
      fileName: "interactive_dashboards",
      usedExternally: true,
      scenes: [...sliceScenes("dashboard", 15)],
    },
    {
      fileName: "ai_assistant_overview",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 1)],
    },
    {
      fileName: "sql_editor_overview",
      usedExternally: true,
      scenes: [
        ...sliceScenes("sql_editor", 1, 10),
        ...sliceScenes("sql_editor", 12),
      ],
    },

    {
      fileName: "ai_assistant_access_request",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 6, 11)],
    },

    {
      fileName: "ai_assistant_generated_dashboard",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 0, 6)],
    },

    {
      fileName: "ai_assistant_data_analysis",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 20, 23)],
    },

    {
      fileName: "table_timechart_1",
      usedExternally: true,
      scenes: [...sliceScenes("table_timechart", 0, 3)],
    },
    {
      fileName: "table_timechart_2",
      usedExternally: true,
      scenes: [...sliceScenes("table_timechart", 3)],
    },

    {
      fileName: "schema_diagram_1",
      usedExternally: true,
      scenes: [...sliceScenes("schema_diagram", 0, 3)],
    },
    {
      fileName: "schema_diagram_2",
      usedExternally: true,
      scenes: [...sliceScenes("schema_diagram", 3)],
    },

    {
      fileName: "agentic_workflow_1",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant_agentic_workflow", 0, 10)],
    },
    {
      fileName: "agentic_workflow_2",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant_agentic_workflow", 10, 16)],
    },
    {
      fileName: "agentic_workflow_3",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant_agentic_workflow", 17)],
    },

    {
      fileName: "table_1",
      usedExternally: true,
      scenes: [...sliceScenes("table", 0, 8)],
    },
    {
      fileName: "table_2",
      usedExternally: true,
      scenes: [...sliceScenes("table", 8, 16)],
    },
    {
      fileName: "table_3",
      usedExternally: true,
      scenes: [...sliceScenes("table", 16)],
    },

    {
      fileName: "ai_assistant_questions",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 20, 25)],
    },

    {
      fileName: "ai_assistant_dashboards",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 1, 6)],
    },
    {
      fileName: "ai_assistant_mcp_tools",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 6, 13)],
    },
    {
      fileName: "ai_assistant_stt",
      usedExternally: true,
      scenes: [...sliceScenes("ai_assistant", 24)],
    },

    /** SQL section */
    {
      fileName: "sql_editor_suggestions",
      usedExternally: true,
      scenes: [...sliceScenes("sql_editor", 1, 8)],
    },
    {
      fileName: "sql_editor_charts",
      usedExternally: true,
      scenes: [...sliceScenes("sql_editor", 12)],
    },
    {
      fileName: "sql_editor_jsonb",
      usedExternally: true,
      scenes: [...sliceScenes("sql_editor", 7, 10)],
    },

    /** Backup and restore section */
    {
      fileName: "backup_and_restore_overview",
      usedExternally: true,
      scenes: [...sliceScenes("backup_and_restore", 2)],
    },
  ].map((sceneInfo) => {
    return {
      ...sceneInfo,
      // scenes: sceneInfo.scenes.map((scene, index) => ({
      //   ...scene,
      //   animations:
      //     index === sceneInfo.scenes.length - 1 ?
      //       [...scene.animations]
      //     : [...scene.animations, { type: "wait", duration: 4000 }],
      // })),
    } as typeof sceneInfo;
  });

  const svgifCovers: { fileName: string; svgSceneFileName: string }[] = [
    {
      fileName: "linked_data",
      svgSceneFileName: svgifSpecsObj.dashboard[10]!.svgFileName,
    },
    {
      fileName: "sql_editor",
      svgSceneFileName: svgifSpecsObj.sql_editor[13]!.svgFileName,
    },
    {
      fileName: "sql_editor1",
      svgSceneFileName: svgifSpecsObj.sql_editor[12]!.svgFileName,
    },
    {
      fileName: "backups",
      svgSceneFileName: svgifSpecsObj.backup_and_restore[14]!.svgFileName,
    },

    {
      fileName: "ai_assistant",
      svgSceneFileName: svgifSpecsObj.ai_assistant[4]!.svgFileName,
    },

    {
      fileName: "timechart_cover",
      /** Request tool access */
      svgSceneFileName: svgifSpecsObj.ai_assistant[8]!.svgFileName, // or 32 with tooltip
    },
  ];

  return { svgifSpecsObj, svgifCovers, overviewSvgifSpecs };
};
