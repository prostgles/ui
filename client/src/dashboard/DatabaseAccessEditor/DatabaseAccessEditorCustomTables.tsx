import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import {
  SearchList,
  type SearchListItem,
} from "@components/SearchList/SearchList";
import { mdiTable, mdiTableEdit } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isDefined, isEmpty } from "prostgles-types";
import React from "react";
import SmartTable from "../SmartTable";
import type { DatabaseAccessEditorProps } from "./DatabaseAccessEditor";
import { TableAccessEditor } from "./TableAccessEditor";
import { useDatabaseAccessEditorTables } from "./useDatabaseAccessEditorTables";
import { TableAccessDetails } from "./TableAccessDetails";

export const DatabaseAccessEditorCustomTables = ({
  value,
  onChange,
  newTables,
  showDetails,
}: {
  value: Extract<DatabaseAccessEditorProps["value"], { mode: "custom" }>;
  showDetails: boolean;
} & Pick<DatabaseAccessEditorProps, "onChange" | "newTables">) => {
  const { tables, db, sql, methods } = usePrgl();

  const tableList = useDatabaseAccessEditorTables({ value, newTables });
  return (
    <div className="w-full" data-command="DatabaseAccessEditor.TableRules">
      <SearchList
        id="custom-tables"
        style={{
          maxHeight: "min(400px, calc(100vh - 100px)",
        }}
        placeholder={`Search ${tables.length} tables & views`}
        limit={200}
        listStyle={{
          display: "grid",
          gridTemplateColumns: "max-content max-content 1fr",
          gap: "0.5em",
          alignItems: "center",
        }}
        items={tableList
          .map((t) => {
            const tableRules = value.tablePermissions[t.name] ?? {};
            if (!onChange && isEmpty(tableRules)) {
              return;
            }
            return {
              key: t.name,
              label: t.name,
              title: t.name,
              contentLeft: (
                <PopupMenu
                  button={
                    <Btn
                      iconPath={tableRules.update ? mdiTableEdit : mdiTable}
                      variant="faded"
                      size="small"
                    />
                  }
                  positioning="center"
                  contentClassName=""
                  clickCatchStyle={{ opacity: 1 }}
                >
                  <SmartTable
                    db={db}
                    methods={methods}
                    sql={sql}
                    tableName={t.name}
                    tables={tables}
                  />
                </PopupMenu>
              ),
              styles: {
                labelWrapper: {
                  fontWeight: 700,
                  ...(!onChange && { flex: "unset" }),
                },
                label: {
                  fontWeight: 700,
                  fontSize: "16px",
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
                  {
                    border: "1px solid var(--b-default)",
                  }
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
