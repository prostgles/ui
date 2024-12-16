import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiDelete,
  mdiPencilOutline,
} from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { SmartGroupFilter } from "../../../../commonTypes/filterUtils";
import { getFinalFilterInfo } from "../../../../commonTypes/filterUtils";
import Btn from "../../components/Btn";
import { ExpandSection } from "../../components/ExpandSection";
import { Footer } from "../../components/Popup/Popup";
import PopupMenu from "../../components/PopupMenu";
import { pluralise } from "../../pages/Connections/Connection";
import { CodeConfirmation } from "../Backup/CodeConfirmation";
import { getSmartGroupFilter } from "../SmartFilter/SmartFilter";
import { InsertButton } from "../SmartForm/InsertButton";
import SmartForm from "../SmartForm/SmartForm";
import type { SmartFilterBarProps } from "./SmartFilterBar";
import { SmartFilterBarSort } from "./SmartFilterBarSort";

export const SmartFilterBarRightActions = (props: SmartFilterBarProps) => {
  const {
    db,
    tables,
    rightContent,
    hideSort,
    showInsertUpdateDelete = {},
    rowCount,
    methods: dbMethods,
    theme,
    fixedData,
  } = props;

  const { filter: _fltr = [] } = "w" in props ? props.w : props;

  const { table_name } = "w" in props ? props.w : props;

  const [updateAllRow, setUpdateAllRow] = useState<AnyObject | undefined>(
    undefined,
  );
  const table = tables.find((t) => t.name === table_name);

  const filter: SmartGroupFilter = _fltr.map((f) => ({ ...f }));
  const finalFilter = getSmartGroupFilter(filter);

  if (!table_name || !table) return null;

  const commonBtnProps = {
    variant: "outline",
    // size: "small",
    className: "shadow w-fit h-fit bg-color-0",
  } as const;

  const tableHandler = db[table_name];
  const filterAsString = filter.map((f) => getFinalFilterInfo(f));

  const {
    showdelete = true,
    showinsert = true,
    showupdate = true,
  } = showInsertUpdateDelete;
  const hideUpdateDelete = [showdelete, showupdate].every((v) => v === false);
  const canUpdateOrDelete =
    !hideUpdateDelete && (tableHandler?.delete || tableHandler?.update);

  if (hideSort && rightContent && !showdelete && !showinsert && !showupdate)
    return <></>;

  return (
    <div className="ml-auto pl-1 flex-row ai-center">
      {!hideSort && <SmartFilterBarSort {...props} table={table} />}
      {rightContent}

      <div className="flex-row ai-center gap-p5 ml-1">
        {!!canUpdateOrDelete && (
          <ExpandSection
            label={""}
            className=""
            iconPath={(collapsed) =>
              collapsed ? mdiChevronLeft : mdiChevronRight
            }
            buttonProps={{
              "data-command": "SmartFilterBar.rightOptions.show",
            }}
            collapsible={true}
          >
            {!!tableHandler.delete && showdelete && (
              <CodeConfirmation
                positioning="beneath-right"
                button={
                  <Btn
                    iconPath={mdiDelete}
                    title="Delete rows..."
                    {...commonBtnProps}
                    color="danger"
                    data-command="SmartFilterBar.rightOptions.delete"
                  >
                    Delete
                  </Btn>
                }
                message={async () => {
                  const count = await tableHandler.count?.(finalFilter);
                  return (
                    <div
                      className="flex-col gap-1"
                      style={{ maxWidth: "100%" }}
                    >
                      <div className="font-20 bold ">
                        Delete {count?.toLocaleString()}{" "}
                        {pluralise(count ?? 0, "record")}{" "}
                        {filterAsString.length ?
                          "matching the current filter"
                        : ""}
                      </div>
                    </div>
                  );
                }}
                confirmButton={(pCLose) => (
                  <Btn
                    iconPath={mdiDelete}
                    {...commonBtnProps}
                    color="danger"
                    title="Delete rows"
                    onClickPromise={async () => {
                      await tableHandler.delete!(finalFilter);
                      showInsertUpdateDelete.onSuccess?.();
                      pCLose();
                    }}
                  >
                    Delete rows
                  </Btn>
                )}
              />
            )}

            {!!tableHandler.update && showupdate && (
              <PopupMenu
                positioning="right-panel"
                button={
                  <Btn
                    {...commonBtnProps}
                    iconPath={mdiPencilOutline}
                    title="Update rows"
                    color="action"
                    data-command="SmartFilterBar.rightOptions.update"
                  >
                    Update
                  </Btn>
                }
                contentStyle={{
                  padding: 0,
                }}
                render={(pClose) => (
                  <>
                    <SmartForm
                      theme={theme}
                      label={`Update ${rowCount} rows`}
                      db={db}
                      rowFilter={[]}
                      tableName={table_name}
                      tables={tables}
                      methods={props.methods}
                      onChange={setUpdateAllRow}
                      fixedData={fixedData}
                      showJoinedTables={false}
                      columnFilter={(c) =>
                        !c.is_pkey && !(!c.is_nullable && c.references?.length)
                      }
                    />
                    {updateAllRow && (
                      <Footer>
                        <Btn onClick={() => setUpdateAllRow(undefined)}>
                          Cancel
                        </Btn>
                        <Btn
                          color="action"
                          variant="filled"
                          onClickPromise={async () => {
                            await tableHandler.update!(
                              finalFilter,
                              updateAllRow,
                            );
                            setUpdateAllRow(undefined);
                            showInsertUpdateDelete.onSuccess?.();
                          }}
                        >
                          Update
                        </Btn>
                      </Footer>
                    )}
                  </>
                )}
              />
            )}
          </ExpandSection>
        )}

        {showinsert && (
          <InsertButton
            theme={theme}
            buttonProps={commonBtnProps}
            db={db}
            methods={dbMethods}
            tables={tables}
            tableName={table_name}
            onSuccess={showInsertUpdateDelete.onSuccess}
          />
        )}
      </div>
    </div>
  );
};
