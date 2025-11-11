import { MediaViewer } from "@components/MediaViewer";
import { isDefined, isObject, type AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { FieldConfig } from "../../SmartCard/SmartCard";
import { SmartCardColumn } from "../../SmartCard/SmartCardColumn";
import { getBestTextColumns } from "../SmartFormField/fetchForeignKeyOptions";
import { RenderValue } from "../SmartFormField/RenderValue";
import type { JoinedRecordsProps } from "./JoinedRecords";

export const useJoinedSectionFieldConfigs = ({
  sectionTable,
  tables,
  tableName,
  tablesToShow,
}: {
  sectionTable: DBSchemaTableWJoins;
  tableName: string | undefined;
} & Pick<JoinedRecordsProps, "tables" | "tablesToShow">):
  | FieldConfig[]
  | undefined => {
  return useMemo(() => {
    const tableInfo = tablesToShow?.[sectionTable.name];
    if (isObject(tableInfo) && tableInfo.fieldConfigs) {
      return tableInfo.fieldConfigs;
    }
    const fileTable = tables.find((t) => t.info.isFileTable);
    if (fileTable?.name === sectionTable.name) {
      return [
        {
          name: "url",
          render: (url, row) => (
            <MediaViewer style={{ maxWidth: "300px" }} url={url} />
          ),
        },
      ];
    }

    const rootTable =
      !tableName ? undefined : tables.find((t) => t.name === tableName);
    if (!rootTable) return;

    const nonJoinColumnsToShow = sectionTable.columns.filter(
      (c) =>
        c.select && !c.references?.some((r) => r.ftable === rootTable.name),
    );

    /** We want to add one-to-one joins that have text fields */
    const extraColumnsToShow: FieldConfig[] = sectionTable.joinsV2
      .filter((j) => j.tableName !== rootTable.name)
      .map((joinInfo) => {
        const fTable = tables.find((t) => t.name === joinInfo.tableName);
        if (!fTable) return;

        const joinColumns = joinInfo.on.flatMap((conditions) =>
          conditions.map(([col1, col2]) => col2),
        );
        const isOneToOneJoin = fTable.info.uniqueColumnGroups?.some(
          (groupCols) => groupCols.every((col) => joinColumns.includes(col)),
        );
        if (!isOneToOneJoin) return;
        const textCols = getBestTextColumns(fTable, joinColumns);
        if (!textCols.length) return;

        return {
          name: fTable.name,
          select: textCols.reduce(
            (a, v) => ({
              ...a,
              [v.name]: 1,
            }),
            {},
          ),
          renderMode: "full",
          render: (ftableRows) => {
            const ftableRow = ftableRows[0] as AnyObject | undefined;
            if (!ftableRow) return null;
            return textCols.map((c) => {
              const value = ftableRow[c.name];
              return (
                <SmartCardColumn
                  key={fTable.name + c.name}
                  labelText={[fTable.label, c.label || c.name].join(".")}
                  info={undefined}
                  labelTitle={c.label || c.name}
                  renderMode={"value"}
                  valueNode={
                    <RenderValue
                      key={fTable.name + c.name}
                      value={value}
                      column={c}
                    />
                  }
                />
              );
            });
          },
        } satisfies FieldConfig;
      })
      .filter(isDefined);
    if (extraColumnsToShow.length) {
      return [
        ...nonJoinColumnsToShow.map(
          (c) =>
            ({
              name: c.name,
            }) satisfies FieldConfig,
        ),
        ...extraColumnsToShow,
      ] satisfies FieldConfig[];
    }
  }, [
    sectionTable.columns,
    sectionTable.joinsV2,
    sectionTable.name,
    tableName,
    tables,
    tablesToShow,
  ]);
};
