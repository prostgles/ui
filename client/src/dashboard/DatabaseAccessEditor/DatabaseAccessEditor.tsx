import type { DBSSchema } from "@common/publishUtils";
import { fromEntries } from "@common/utils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { HeaderSection } from "@components/HeaderSection";
import { Select } from "@components/Select/Select";
import {
  mdiDatabaseEdit,
  mdiDatabaseOff,
  mdiDotsHorizontal,
  mdiTable,
  mdiTableSearch,
} from "@mdi/js";
import { getKeys } from "prostgles-types";
import React, { useState } from "react";
import { DatabaseAccessEditorCustomTables } from "./DatabaseAccessEditorCustomTables";

export type DatabaseAccessPermission = NonNullable<
  DBSSchema["agentic_workflows"]["definition_data"]["databaseAccessDefinitions"]
>;

export type DatabaseAccessEditorProps = {
  value: DatabaseAccessPermission | undefined;
  onChange:
    | undefined
    | ((newValue: DatabaseAccessPermission | undefined) => void);
  contentRight?: React.ReactNode;
  newTables: DBSSchema["agentic_workflows"]["definition_data"]["newTables"];
};

export const DatabaseAccessEditor = ({
  value,
  onChange,
  contentRight,
  newTables,
}: DatabaseAccessEditorProps) => {
  const showSelect = value?.mode !== "custom" || onChange;
  const [showDetails, setShowDetails] = useState(false);
  return (
    <HeaderSection
      className="gap-p5 ai-start"
      data-command="DatabaseAccessEditor"
      title={showSelect ? "" : "Database access"}
      titleEndContent={
        <Btn
          iconPath={mdiDotsHorizontal}
          variant="faded"
          color={showDetails ? "action" : undefined}
          onClick={() => setShowDetails(!showDetails)}
          size="micro"
        />
      }
    >
      {(showSelect || contentRight) && (
        <FlexRow>
          {showSelect && (
            <>
              <Select
                value={value?.mode ?? "none"}
                data-command="DatabaseAccessEditor.Mode"
                btnProps={{
                  color:
                    !value ? undefined
                    : value.mode === "execute_sql" ? "danger"
                    : "action",
                }}
                label={"Database access"}
                fullOptions={MODES}
                onChange={
                  !onChange ? undefined : (
                    (dataAccess) => {
                      void onChange(
                        dataAccess === "none" ? undefined
                        : dataAccess === "custom" ?
                          {
                            mode: dataAccess,
                            tablePermissions: {},
                          }
                        : {
                            mode: dataAccess,
                          },
                      );
                    }
                  )
                }
              />
              {value?.mode === "execute_sql" && (
                <Select
                  value={getKeys(value.allowedCommands ?? {})}
                  label={"Allowed commands"}
                  emptyLabel="All"
                  fullOptions={(
                    ["select", "insert", "update", "delete"] as const
                  ).map((key) => ({ key }))}
                  multiSelect={true}
                  optional={true}
                  onChange={(allowedCommands) => {
                    if (!onChange) return;
                    void onChange({
                      mode: "execute_sql",
                      allowedCommands:
                        allowedCommands &&
                        fromEntries(
                          allowedCommands.map((command) => [command, 1]),
                        ),
                    });
                  }}
                />
              )}
            </>
          )}
          {contentRight}
        </FlexRow>
      )}
      {value?.mode === "custom" && (
        <DatabaseAccessEditorCustomTables
          newTables={newTables}
          onChange={onChange}
          value={value}
          showDetails={showDetails}
        />
      )}
    </HeaderSection>
  );
};

const MODES = [
  {
    key: "none",
    label: "None",
    subLabel: "Cannot interact with the database.",
    iconPath: mdiDatabaseOff,
  },
  {
    key: "execute_readonly_sql",
    label: "Run readonly SQL",
    subLabel: "Can run readonly SQL queries",
    iconPath: mdiTableSearch,
  },
  {
    key: "execute_sql",
    label: "Run commited SQL",
    subLabel: "Can run SQL queries that will be commited. Use with caution",
    iconPath: mdiDatabaseEdit,
  },
  {
    key: "custom",
    label: "Custom",
    subLabel: "Can only access specific tables, rows and columns",
    iconPath: mdiTable,
  },
] as const;
