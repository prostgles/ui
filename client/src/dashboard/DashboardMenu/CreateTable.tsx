import { mdiPlus } from "@mdi/js";
import React, { useMemo, useState } from "react";
import { SuccessMessage } from "../../components/Animations";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import Popup from "../../components/Popup/Popup";
import { isDefined } from "../../utils";
import { SQLSmartEditor } from "../SQLEditor/SQLSmartEditor";
import type { ColumnOptions } from "../W_Table/ColumnMenu/AlterColumn/ColumnEditor";
import { ColumnEditor } from "../W_Table/ColumnMenu/AlterColumn/ColumnEditor";
import { getColumnDefinitionQuery } from "../W_Table/ColumnMenu/AlterColumn/CreateColumn";
import { getReferencesQuery } from "../W_Table/ColumnMenu/AlterColumn/ReferenceEditor";
import { getColumnIconPath } from "../W_Table/ColumnMenu/ColumnsMenu";
import type { DashboardMenuProps } from "./DashboardMenu";

export const CreateTable = ({
  prgl: { db, tables },
  onClose,
  suggestions,
}: DashboardMenuProps & { onClose: VoidFunction }) => {
  const [tableOpts, setTableOpts] = useState<
    Partial<{
      name: string;
      cols: ColumnOptions[];
      finished: boolean;
    }>
  >({});

  const [success, setSuccess] = useState(false);

  const duplicateColumn = tableOpts.cols?.find((c, i) =>
    tableOpts.cols?.some(
      (_c, _i) => isDefined(c.name) && c.name === _c.name && i !== _i,
    ),
  );
  const duplicateTable = tables.find((t) => t.name === tableOpts.name);
  const error =
    success ? undefined
    : duplicateTable ? "A table with this name already exists"
    : duplicateColumn ?
      `Cannot have two columns with the same name ${JSON.stringify(duplicateColumn.name)}`
    : "";

  const getColSQL = (c: ColumnOptions) => {
    const [firstRef] = c.references ?? [];
    return (
      "  " +
      [
        getColumnDefinitionQuery(c),
        firstRef ?
          getReferencesQuery(firstRef)
            .filter((v) => v)
            .join(" ")
        : "",
        // c.check?.trim() ? `CHECK(${c.check})` : ""
      ]
        .filter((v) => v)
        .join(" ")
    );
  };
  const query = `CREATE TABLE ${JSON.stringify(tableOpts.name)} ( \n${tableOpts.cols?.map((c) => `  ${getColSQL(c)}`).join(", \n") ?? ""} \n);`;

  const updateColumn = (
    columnIndex: number,
    columnChanges: Partial<ColumnOptions> | undefined,
  ) => {
    const existingColumn = tableOpts.cols?.[columnIndex];
    if (!existingColumn) return;
    setTableOpts((topts) => ({
      ...topts,
      cols: (topts.cols ?? [])
        .map((c, i) =>
          i === columnIndex ?
            columnChanges && { ...existingColumn, ...columnChanges }
          : c,
        )
        .filter(isDefined),
    }));
  };

  const dataTypeSuggestions = useMemo(
    () => suggestions?.suggestions.map((s) => s.dataTypeInfo).filter(isDefined),
    [suggestions],
  );

  const [activeColumnInfo, setActiveColumnInfo] = useState<{
    index: number;
    anchor: HTMLElement;
    isAddingNew: boolean;
  }>();
  const activeColumn =
    activeColumnInfo && tableOpts.cols?.[activeColumnInfo.index];
  const activeColumnIndex = activeColumnInfo?.index;
  const displayedColumns = tableOpts.cols?.filter(
    (c, i) =>
      c.name &&
      !(activeColumnInfo?.isAddingNew && activeColumnInfo.index === i),
  );
  return (
    <Popup
      title="Create new table"
      positioning="top-center"
      clickCatchStyle={{ opacity: 0.3 }}
      contentClassName="flex-col gap-1 p-0"
      onClose={onClose}
    >
      {activeColumn && isDefined(activeColumnIndex) && tableOpts.name && (
        <Popup
          title={
            !activeColumnInfo.isAddingNew ?
              `Edit ${activeColumn.name}`
            : "Add new column"
          }
          anchorEl={activeColumnInfo.anchor}
          positioning="beneath-left"
          onClose={() => {
            if (activeColumnInfo.isAddingNew) {
              updateColumn(activeColumnIndex, undefined);
            }
            setActiveColumnInfo(undefined);
          }}
          footerButtons={[
            {
              label: "Remove column",
              variant: "faded",
              color: "danger",
              onClick: () => {
                updateColumn(activeColumnIndex, undefined);
              },
            },
            {
              label: !activeColumnInfo.isAddingNew ? "Done" : "Add column",
              variant: "filled",
              color: "action",
              "data-command": "dashboard.menu.createTable.addColumn.confirm",
              disabledInfo:
                !activeColumn.name ? "Name required"
                : !activeColumn.dataType ? "Data type required"
                : undefined,
              onClick: () => {
                setActiveColumnInfo(undefined);
              },
            },
          ]}
        >
          <ColumnEditor
            key={activeColumnIndex}
            {...activeColumn}
            suggestions={suggestions}
            isAlter={false}
            tables={tables}
            tableName={tableOpts.name}
            onChange={(k, v) => {
              updateColumn(activeColumnIndex, v);
            }}
            onAddReference={(newCol, reference) => {
              updateColumn(activeColumnIndex, {
                ...newCol,
                references: [...(activeColumn.references ?? []), reference],
              });
            }}
            onEditReference={(r, i) => {
              updateColumn(activeColumnIndex, {
                references: activeColumn
                  .references!.map((_r, _i) => {
                    if (i === _i) {
                      return r;
                    }

                    return _r;
                  })
                  .filter(isDefined),
              });
            }}
          />
        </Popup>
      )}
      {success ?
        <SuccessMessage message={`Created ${tableOpts.name}`} />
      : <>
          <FlexCol className="flex-col gap-1 p-1 pr-2 pb-2">
            <FormField
              className="ml-p5"
              label="Table name"
              data-command="dashboard.menu.createTable.tableName"
              value={tableOpts.name}
              error={duplicateTable ? error : undefined}
              onChange={(name) => setTableOpts((t) => ({ ...t, name }))}
            />

            {tableOpts.name && !!displayedColumns?.length && (
              <div className="flex-col pl-p5 gap-1">
                <h3 className="ta-left p-0 m-0 mt-1">Columns</h3>
                {displayedColumns.map((colOpt, colI) => {
                  const colDataType = dataTypeSuggestions?.find(
                    (dt) =>
                      dt.udt_name.toLowerCase() ===
                      colOpt.dataType?.toLowerCase(),
                  );
                  return (
                    <Btn
                      key={colI}
                      title="Press to edit"
                      variant="faded"
                      iconPath={getColumnIconPath({
                        is_pkey: colOpt.isPkey,
                        references: colOpt.references as any,
                        udt_name: colOpt.dataType as any,
                      })}
                      onClick={({ currentTarget }) =>
                        setActiveColumnInfo({
                          index: colI,
                          anchor: currentTarget,
                          isAddingNew: false,
                        })
                      }
                    >
                      {getColumnDefinitionQuery({
                        ...colOpt,
                        dataType:
                          colDataType?.udt_name ?? colOpt.dataType ?? "",
                      })}
                    </Btn>
                  );
                })}
              </div>
            )}

            {tableOpts.name && (
              <Btn
                data-command="dashboard.menu.createTable.addColumn"
                variant="faded"
                color="action"
                iconPath={mdiPlus}
                className="ml-p5 mt-1"
                onClick={({ currentTarget }) => {
                  setTableOpts((topts) => ({
                    ...topts,
                    cols: (topts.cols ?? []).concat([{}]),
                  }));
                  setActiveColumnInfo({
                    anchor: currentTarget,
                    index: tableOpts.cols?.length ?? 0,
                    isAddingNew: true,
                  });
                }}
              >
                Add column
              </Btn>
            )}
          </FlexCol>

          <FlexRow className="p-1">
            {/* <Btn
        disabledInfo={!tableOpts.name?.trim().length? "Table name cannot be empty" : undefined}
        onClick={onClose}
      >
        Cancel
      </Btn> */}
            {error ?
              <InfoRow color="danger" className="mx-2 mb-1">
                {error}
              </InfoRow>
            : tableOpts.finished ?
              <SQLSmartEditor
                asPopup={false}
                title=""
                onCancel={() =>
                  setTableOpts((topts) => ({ ...topts, finished: false }))
                }
                key={query}
                sql={db.sql!}
                query={query}
                suggestions={suggestions}
                onSuccess={() => {
                  setSuccess(true);
                  setTimeout(() => {
                    onClose();
                  }, 1000);
                }}
              />
            : <Btn
                variant="filled"
                color="action"
                className="ml-auto"
                data-command="dashboard.menu.createTable.confirm"
                disabledInfo={
                  !tableOpts.name?.trim().length ?
                    "Table name cannot be empty"
                  : undefined
                }
                onClick={() =>
                  setTableOpts((opts) => ({ ...opts, finished: true }))
                }
              >
                Create table...
              </Btn>
            }
          </FlexRow>
        </>
      }
    </Popup>
  );
};
