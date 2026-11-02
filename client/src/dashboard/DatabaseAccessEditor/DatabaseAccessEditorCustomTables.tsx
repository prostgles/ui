import Btn from "@components/Btn";
import {
  SearchList,
  type SearchListItem,
} from "@components/SearchList/SearchList";
import { mdiTable, mdiTableEdit } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isDefined, isEmpty } from "prostgles-types";
import React, { useState } from "react";
import SmartTable from "../SmartTable";
import type { DatabaseAccessEditorProps } from "./DatabaseAccessEditor";
import { TableAccessDetails } from "./TableAccessDetails";
import { TableAccessEditor } from "./TableAccessEditor";
import { useDatabaseAccessEditorTables } from "./useDatabaseAccessEditorTables";

export const DatabaseAccessEditorCustomTables = ({
  value,
  onChange,
  newTables,
  showDetails,
  hideTablesWithoutAccess,
}: {
  value: Extract<DatabaseAccessEditorProps["value"], { mode: "custom" }>;
  showDetails: boolean;
} & Pick<
  DatabaseAccessEditorProps,
  "onChange" | "newTables" | "hideTablesWithoutAccess"
>) => {
  const { tables, db, sql, methods } = usePrgl();

  const [showTable, setShowTable] = useState<string>();
  const tableList = useDatabaseAccessEditorTables({
    value,
    newTables,
  });
  return (
    <div className="w-full" data-command="DatabaseAccessEditor.TableRules">
      {showTable && (
        <SmartTable
          db={db}
          methods={methods}
          sql={sql}
          tableName={showTable}
          tables={tables}
          positioning="center"
          onClosePopup={() => setShowTable(undefined)}
          clickCatchStyle={{ opacity: 1 }}
        />
      )}
      <SearchList
        id="custom-tables"
        style={{
          maxHeight: "min(400px, calc(100vh - 100px)",
          gap: "0.5em",
        }}
        placeholder={`Search ${tables.length} tables & views`}
        limit={200}
        listStyle={{
          display: "grid",
          // gridTemplateColumns: "max-content max-content 1fr",
          gridTemplateColumns: "max-content minmax(0, 1fr) max-content",
          gap: "0.5em",
          alignItems: "center",
        }}
        items={tableList
          .map((t) => {
            const tableRules = value.tablePermissions[t.name] ?? {};
            if ((!onChange || hideTablesWithoutAccess) && isEmpty(tableRules)) {
              return;
            }
            return {
              key: t.name,
              label: t.name,
              title: t.name,
              contentLeft: (
                <>
                  <Btn
                    iconPath={tableRules.update ? mdiTableEdit : mdiTable}
                    data-command="DatabaseAccessEditorCustomTables.openTable"
                    data-key={t.name}
                    variant="faded"
                    size="small"
                    onClick={() => setShowTable(t.name)}
                  />
                </>
              ),
              styles: {
                labelWrapper: {
                  minWidth: 0,
                  ...(!onChange && { flex: "unset" }),
                },
                label: {
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "16px",
                  userSelect: "text",
                },
                rowInner: {
                  display: "contents",
                  ...(window.isLowWidthScreen && {
                    flexDirection: "column",
                    gap: "1em",
                    alignItems: "start",
                    overflow: "auto",
                  }),
                },
              },
              rowStyle: {
                padding: "0.25em",
                ...(onChange ?
                  {}
                : {
                    /** Disable focus */
                    background: "unset",
                  }),
                display: "contents",
              },
              contentRight: (
                <>
                  {showDetails ?
                    <TableAccessDetails value={tableRules} table={t} />
                  : <TableAccessEditor
                      value={tableRules}
                      table={t}
                      onChange={
                        onChange &&
                        ((newTableRules) => {
                          const newTablePermissions = {
                            ...value.tablePermissions,
                            [t.name]: newTableRules,
                          } as const;
                          void onChange({
                            mode: "custom",
                            tablePermissions: newTablePermissions,
                          });
                        })
                      }
                    />
                  }
                </>
              ),
            } satisfies SearchListItem;
          })
          .filter(isDefined)}
      />
    </div>
  );
};
