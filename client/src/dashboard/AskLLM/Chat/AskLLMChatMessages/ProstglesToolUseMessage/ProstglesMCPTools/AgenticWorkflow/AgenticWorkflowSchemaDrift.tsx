import type { DBSSchema } from "@common/publishUtils";
import { fixIndent } from "@common/utils";
import { FlexCol } from "@components/Flex";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import Popup from "@components/Popup/Popup";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { mdiDelta, mdiScriptTextOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { useDatabaseAccessEditorTables } from "src/dashboard/DatabaseAccessEditor/useDatabaseAccessEditorTables";

export const AgenticWorkflowSchemaDrift = ({
  ddlPatches,
  tablesWithSchemaDrift,
  ddlStatements,
  onClose,
}: NonNullable<ReturnType<typeof useAgenticWorkflowSchemaDrift>> & {
  onClose: () => void;
}) => {
  const { sql } = usePrgl();
  const [view, setView] = useState<"patch" | "workflow-schema">("patch");
  return (
    <Popup
      title="Schema drift detected"
      onClickClose={false}
      data-command="AgenticWorkflowSchemaDrift"
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
      footerButtons={[
        {
          label: "Close",
          onClickClose: true,
          className: "mr-auto",
        },
        {
          label: "Apply patches",
          color: "warn",
          variant: "filled",
          "data-command": "AgenticWorkflowSchemaDrift.applyPatches",
          disabledInfo: !sql ? "SQL client not available" : undefined,
          clickConfirmation: {
            buttonText: "Apply",
            message:
              "Applying the patches will update the live table schemas to match this workflow's definition. This may cause data loss if columns are being removed or changed. Are you sure you want to apply the patches?",
            color: "danger",
          },
          onClickPromise: async () => {
            await sql!(ddlPatches);
            onClose();
          },
        },
        {
          label: "Drop workflow created tables",
          color: "danger",
          variant: "filled",
          "data-command": "AgenticWorkflowSchemaDrift.dropWorkflowTables",
          disabledInfo: !sql ? "SQL client not available" : undefined,
          clickConfirmation: {
            buttonText: "Drop and recreate",
            message:
              "Dropping tables will permanently delete all data in those tables. Are you sure you want to drop and recreate the tables?",
            color: "danger",
          },
          onClickPromise: async () => {
            await sql!(
              `DROP TABLE IF EXISTS ${tablesWithSchemaDrift
                .map((t) => t.name)
                .join(", ")} CASCADE;`,
            );
            onClose();
          },
        },
      ]}
    >
      <FlexCol>
        <div className="ta-start">
          There are tables created in this worflow that have since changed.
          Please review and resolve the schema drift before starting the
          workflow.
        </div>
        <SegmentedToggle
          className="w-fit"
          options={{
            patch: {
              title: "View schema patch",
              children: "Patch",
              iconPath: mdiDelta,
            },
            "workflow-schema": {
              title: "View full DDL",
              children: "Workflow schema",
              iconPath: mdiScriptTextOutline,
            },
          }}
          value={view}
          onChange={setView}
        />
        <MonacoEditor
          className="b b-color rounded o-hidden"
          language="sql"
          loadedSuggestions={undefined}
          options={MONACO_READONLY_DEFAULT_OPTIONS}
          value={view === "patch" ? ddlPatches : ddlStatements}
        />
      </FlexCol>
    </Popup>
  );
};

export const useAgenticWorkflowSchemaDrift = ({
  newTables,
  databaseAccessDefinitions: dbAccess,
}: DBSSchema["agentic_workflows"]["definition_data"]) => {
  const tableAccess =
    dbAccess?.mode === "custom" ?
      dbAccess
    : ({ mode: "custom", tablePermissions: {}, ddlStatements: "" } as const);
  const tables = useDatabaseAccessEditorTables({
    value: tableAccess,
    newTables,
  });
  const tablesWithSchemaDrift = useMemo(() => {
    return tables
      .map(({ ddlState, ...table }) => {
        if (ddlState?.state === "drifted") {
          return { ...table, ddlState };
        }
      })
      .filter(isDefined);
  }, [tables]);
  const ddlPatches = tablesWithSchemaDrift
    .map((t) => t.ddlState.patchDdl)
    .join("\n\n");

  const { ddlStatements } = tableAccess;
  if (!ddlPatches || !ddlStatements) return undefined;
  return {
    tablesWithSchemaDrift,
    ddlPatches,
    ddlStatements: fixIndent(ddlStatements),
  };
};
