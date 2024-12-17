import { getKeys } from "prostgles-types";
import React from "react";
import {
  getBasicPermissions,
  TablePermissionControls,
} from "../TableRules/TablePermissionControls";
import type { DBPermissionEditorProps } from "./PCustomTables";

export const PAllTables = ({
  dbPermissions,
  onChange,
  contextData,
  prgl,
  userTypes,
  tablesWithRules,
}: DBPermissionEditorProps<"All views/tables">) => {
  const { tables } = prgl;
  return (
    <div className="flex-col gap-1">
      <h4 className="my-1">Allowed on {tables.length} tables:</h4>
      <TablePermissionControls
        prgl={prgl}
        userTypes={userTypes}
        contextData={contextData}
        tablesWithRules={tablesWithRules}
        errors={{}}
        tableRules={getBasicPermissions(
          dbPermissions.allowAllTables.reduce(
            (a, v) => ({ ...a, [v]: true }),
            {},
          ),
        )}
        onChange={(newRules) => {
          let allowAllTables = [...dbPermissions.allowAllTables];
          const newRule = getKeys(newRules)[0];

          if (newRule) {
            allowAllTables =
              !newRules[newRule] ?
                allowAllTables.filter((v) => v !== newRule)
              : Array.from(new Set(allowAllTables.concat(newRule)));
          }
          onChange({
            type: "All views/tables",
            allowAllTables,
          });
        }}
      />
    </div>
  );
};
