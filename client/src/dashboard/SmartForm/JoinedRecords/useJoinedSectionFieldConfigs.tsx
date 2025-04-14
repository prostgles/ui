import { isDefined, type AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import { MediaViewer } from "../../../components/MediaViewer";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { FieldConfig } from "../../SmartCard/SmartCard";
import { getBestTextColumns } from "../SmartFormField/fetchForeignKeyOptions";
import type { JoinedRecordsProps } from "./JoinedRecords";
import { RenderValue } from "../SmartFormField/RenderValue";
import { SmartCardColumn } from "../../SmartCard/SmartCardColumn";

export const useJoinedSectionFieldConfigs = ({
  sectionTable,
  tables,
  tableName,
}: {
  sectionTable: DBSchemaTableWJoins;
} & Pick<JoinedRecordsProps, "tables" | "tableName">):
  | FieldConfig[]
  | undefined => {
  const fileTable = useMemo(
    () => tables.find((t) => t.info.isFileTable),
    [tables],
  );
  const rootTable = useMemo(
    () => tables.find((t) => t.name === tableName),
    [tables, tableName],
  );
  return useMemo(() => {
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

    if (!rootTable) return;

    const nonJoinColumnsToShow = sectionTable.columns.filter(
      (c) => !c.references?.some((r) => r.ftable === rootTable.name),
    );
    const extraColumnsToShow: FieldConfig[] = sectionTable.joinsV2
      .filter((j) => j.tableName !== rootTable.name)
      .map((joinInfo) => {
        const fTable = tables.find((t) => t.name === joinInfo.tableName);
        if (!fTable) return;

        const joinColumns = joinInfo.on.flatMap((conditions) =>
          conditions.map(([col1, col2]) => col2),
        );
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
                  renderMode={undefined}
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
  }, [fileTable, sectionTable, rootTable, tables]);
};
