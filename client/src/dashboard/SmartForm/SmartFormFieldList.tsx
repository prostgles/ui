import {
  getPossibleNestedInsert,
  isObject,
  type AnyObject,
} from "prostgles-types";
import React, { useMemo } from "react";
import { classOverride, FlexCol } from "@components/Flex";
import { Label } from "@components/Label";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { SmartFormProps } from "./SmartForm";
import {
  SmartFormField,
  type SmartColumnInfo,
} from "./SmartFormField/SmartFormField";
import { SmartFormFileSection } from "./SmartFormFileSection";
import type { NewRow, NewRowDataHandler } from "./SmartFormNewRowDataHandler";
import type { SmartFormState } from "./useSmartForm";
import type { SmartFormModeState } from "./useSmartFormMode";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { includes } from "../W_SQL/W_SQLBottomBar/W_SQLBottomBar";

type P = Pick<
  SmartFormProps,
  | "tableName"
  | "tables"
  | "db"
  | "label"
  | "contentClassname"
  | "asPopup"
  | "enableInsert"
  | "jsonbSchemaWithControls"
  | "hideNullBtn"
  | "methods"
> &
  SmartFormModeState &
  Pick<SmartFormState, "error" | "errors"> & {
    newRowDataHandler: NewRowDataHandler;
    newRowData: NewRow | undefined;
    row: AnyObject;
    table: DBSchemaTablesWJoins[number];
    displayedColumns: SmartColumnInfo[];
  };

export const SmartFormFieldList = (props: P) => {
  const {
    tableName,
    jsonbSchemaWithControls,
    enableInsert = true,
    db,
    tables,
    contentClassname,
    newRowDataHandler,
    table,
    row,
    mode,
    displayedColumns,
    error,
    errors,
    modeType,
    methods,
    newRowData,
  } = props;

  const hideNullBtn = mode.type === "view" || props.hideNullBtn;

  const tableInfo = table.info;

  const someColumnsHaveIcons = useMemo(() => {
    return displayedColumns.some((c) => {
      if (c.icon) return true;
      const ref = getPossibleNestedInsert(c, tables);
      return Boolean(
        ref && tables.some((t) => t.name === ref.ftable && t.icon),
      );
    });
  }, [displayedColumns, tables]);

  return (
    <ScrollFade
      className={classOverride(
        "SmartFormFieldList flex-col f-1 o-auto min-h-0 min-w-0 pb-1 gap-1 px-2",
        contentClassname,
      )}
    >
      {/* {!!geographyData.length && (
        <DeckGLMap
          geoJsonLayers={geographyData.map((d) => {
            return {
              features: d.value,
              id: d.column.name,
              label: d.column.name,
            };
          })}
          basemapDesaturate={0}
          basemapOpacity={1}
          dataOpacity={1}
          edit={undefined}
          geoJsonLayersDataFilterSignature=""
        />
      )} */}
      {tableInfo.isFileTable && tableInfo.fileTableName && (
        <SmartFormFileSection
          {...props}
          table={table}
          newRowDataHandler={newRowDataHandler}
          row={row}
          mode={mode}
          mediaTableName={tableInfo.fileTableName}
        />
      )}
      {displayedColumns.map((c, i) => {
        const rawValue = row[c.name];
        const newValue = newRowData?.[c.name];
        const formFieldStyle: React.CSSProperties =
          !c.sectionHeader ? {} : { marginTop: "1em" };

        if (c.onRender) {
          const columnNode = c.onRender(rawValue, (newVal) =>
            newRowDataHandler.setColumnData(c.name, {
              type: "column",
              value: newVal,
            }),
          );
          return (
            <FlexCol key={c.name} style={formFieldStyle} className="gap-p25">
              <Label variant="normal">{c.label}</Label>
              {columnNode}
            </FlexCol>
          );
        }

        return (
          <SmartFormField
            key={i}
            tables={tables}
            db={db}
            tableName={tableName}
            table={table}
            action={modeType}
            loading={
              mode.type === "update" || mode.type === "view" ?
                mode.loading
              : undefined
            }
            column={c}
            value={rawValue}
            newValue={newValue}
            row={row}
            jsonbSchemaWithControls={jsonbSchemaWithControls}
            error={
              errors[c.name] ??
              (isObject(error) && error.column === c.name ? error : undefined)
            }
            rightContentAlwaysShow={false}
            methods={methods}
            hideNullBtn={hideNullBtn}
            sectionHeader={c.sectionHeader}
            style={formFieldStyle}
            enableInsert={enableInsert}
            newRowDataHandler={newRowDataHandler}
            someColumnsHaveIcons={someColumnsHaveIcons}
          />
        );
      })}
    </ScrollFade>
  );
};
