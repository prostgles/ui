import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { MenuList } from "@components/MenuList";
import PopupMenu from "@components/PopupMenu";
import {
  mdiArrowLeft,
  mdiDelete,
  mdiDotsVertical,
  mdiFormatColorFill,
  mdiFormatText,
  mdiFunction,
  mdiLink,
  mdiPencil,
} from "@mdi/js";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { omitKeys } from "prostgles-types";
import React, { useState } from "react";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type {
  DBSchemaTablesWJoins,
  WindowData,
} from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWithInfo } from "../W_Table";
import { AlterColumn } from "./AlterColumn/AlterColumn";
import { QuickAddComputedColumn } from "./AddComputedColumn/QuickAddComputedColumn";
import type { ColumnConfig } from "./ColumnConfig";
import { ColumnDisplayFormat } from "./ColumnDisplayFormat/ColumnDisplayFormat";
import { getFormatOptions } from "./ColumnDisplayFormat/columnFormatUtils";
import { ColumnStyleMenu } from "./ColumnStyleControls/ColumnStyleMenu";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";

type P = {
  column: ColumnConfigWithInfo;
  isNested?: boolean;
  columns: ColumnConfigWithInfo[];
  onChange: (newCols: ColumnConfig[]) => void;
  onClose: VoidFunction;
  table: DBSchemaTablesWJoins[number];
  w: SyncDataItem<Required<WindowData<"table">>, { handlesOnData: true }>;
};

type ColumnListAction = "alter" | "computed" | "format" | "linked" | "style";

export const ColumnListItemOptions = ({
  column,
  isNested,
  columns,
  onChange,
  onClose,
  table,
  w,
}: P) => {
  const prgl = usePrgl();
  const [action, setAction] = useState<ColumnListAction>();
  const nestedColumn = column.nested;
  const removeAction =
    column.format ? "Remove formatting"
    : column.computedConfig?.isColumn ? "Remove Function"
    : column.computedConfig || column.nested ? "Remove computed field"
    : undefined;

  const updateColumn = (update: Partial<ColumnConfig>) => {
    onChange(
      columns.map((c) => (c.name === column.name ? { ...c, ...update } : c)),
    );
  };

  const remove = () => {
    if (!removeAction) return;
    if (
      removeAction === "Remove formatting" ||
      removeAction === "Remove Function"
    ) {
      onChange(
        columns.map((c) =>
          c.name === column.name ?
            omitKeys(
              c,
              removeAction === "Remove formatting" ?
                ["format"]
              : ["computedConfig"],
            )
          : c,
        ),
      );
      return;
    }
    onChange(columns.filter((c) => c.name !== column.name));
  };

  return (
    <PopupMenu
      positioning="beneath-center"
      clickCatchStyle={{ opacity: 0.1 }}
      data-command="W_TableMenu_ColumnList.options"
      button={
        <Btn iconPath={mdiDotsVertical} title="Column options" color="action" />
      }
      onClose={() => setAction(undefined)}
      contentClassName={action ? "p-1" : "p-0"}
      render={(popupClose) => {
        const close = () => {
          setAction(undefined);
          popupClose();
        };
        if (action) {
          return (
            <FlexCol className="gap-1">
              <Btn
                iconPath={mdiArrowLeft}
                variant="text"
                onClick={() => setAction(undefined)}
              >
                Column options
              </Btn>
              {action === "alter" && (
                <AlterColumn
                  table={table}
                  onClose={() => {
                    close();
                    onClose();
                  }}
                  prgl={prgl}
                  suggestions={undefined}
                  field={column.name}
                />
              )}
              {action === "format" && (
                <ColumnDisplayFormat
                  db={prgl.db}
                  column={column}
                  tables={prgl.tables}
                  table={table}
                  onChange={(format) => updateColumn({ format })}
                />
              )}
              {action === "style" && (
                <ColumnStyleMenu
                  isNested={isNested}
                  db={prgl.db}
                  tableName={table.name}
                  tables={prgl.tables}
                  column={column}
                  onUpdate={updateColumn}
                />
              )}
              {action === "linked" && (
                <LinkedColumn w={w} column={column} onClose={close} />
              )}
              {action === "computed" && (
                <QuickAddComputedColumn
                  tableName={table.name}
                  existingColumn={column}
                  onAddColumn={(newColumn) => {
                    if (newColumn) updateColumn(newColumn);
                    close();
                  }}
                />
              )}
            </FlexCol>
          );
        }

        return (
          <MenuList
            style={{ minWidth: "220px", borderRadius: 0 }}
            items={[
              {
                key: "format",
                label: "Format",
                leftIconPath: mdiFormatText,
                hide: !!nestedColumn,
                disabledText:
                  (
                    getFormatOptions(column.info ?? column.computedConfig)
                      .length <= 1
                  ) ?
                    "No custom formats available"
                  : undefined,
                listProps: {
                  "data-command": "W_TableMenu_ColumnList.format",
                },
                onPress: () => setAction("format"),
              },
              {
                key: "style",
                label: "Style",
                leftIconPath: mdiFormatColorFill,
                disabledText:
                  column.format?.type === "Media" ?
                    "Cannot style a media format column"
                  : nestedColumn?.display?.type === "timechart" ?
                    "Cannot style a time chart column"
                  : undefined,
                listProps: {
                  "data-command": "W_TableMenu_ColumnList.style",
                },
                onPress: () => setAction("style"),
              },
              {
                key: "alter",
                label: "Alter column",
                leftIconPath: mdiPencil,
                hide: !prgl.sql || !!column.computedConfig || !!nestedColumn,
                listProps: {
                  "data-command": "W_TableMenu_ColumnList.alter",
                },
                onPress: () => setAction("alter"),
              },
              {
                key: "computed",
                label: "Edit computed column",
                leftIconPath: mdiFunction,
                hide: !column.computedConfig,
                listProps: {
                  "data-command": "W_TableMenu_ColumnList.editComputedColumn",
                },
                onPress: () => setAction("computed"),
              },
              {
                key: "linked",
                label: "Edit linked field",
                leftIconPath: mdiLink,
                hide: !nestedColumn,
                listProps: {
                  "data-command": "W_TableMenu_ColumnList.linkedColumnOptions",
                },
                onPress: () => setAction("linked"),
              },
              {
                key: "remove",
                label: removeAction ?? "Remove",
                leftIconPath:
                  removeAction === "Remove Function" ? mdiFunction : mdiDelete,
                hide: !removeAction,
                style: { color: "var(--text-warning)" },
                listProps: {
                  "data-command": "W_TableMenu_ColumnList.removeComputedColumn",
                },
                onPress: () => {
                  remove();
                  close();
                },
              },
            ]}
          />
        );
      }}
    />
  );
};
