import type { BtnProps } from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { getSearchRanking } from "@components/SearchList/searchMatchUtils/getSearchRanking";
import type { FullOption } from "@components/Select/Select";
import { Select } from "@components/Select/Select";
import type { ParsedJoinPath } from "prostgles-types";
import React, { useMemo } from "react";
import { isDefined } from "../../../utils/utils";
import CodeExample from "../../CodeExample";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import type { TargetPath } from "../tableUtils/getJoinPaths";
import { getJoinPathStr, getJoinPaths } from "../tableUtils/getJoinPaths";
type P = {
  tables: DBSchemaTablesWJoins;
  tableName: string;
  btnProps?: BtnProps<void>;
  onChange: (
    targetPath: TargetPath,
    multiJoin:
      | {
          value: [string, string][][];
          chosen: [string, string][];
        }
      | undefined,
  ) => void;
  value: ParsedJoinPath[] | undefined;
  getFullOption?: (
    path: ParsedJoinPath[],
  ) => Pick<FullOption<string>, "disabledInfo"> | undefined;
  variant?: "expanded";
};

export const getJoinPathLabel = (
  j: TargetPath,
  { tableName, tables }: Pick<P, "tableName" | "tables">,
) => {
  const labels = j.path.map((p, pIdx) => {
    const prevPath = j.path[pIdx - 1];
    const hasMultipleFkeyConstraints =
      !prevPath ?
        hasMultiFkeys(tables, tableName, p.table)
      : hasMultiFkeys(tables, p.table, prevPath.table);
    let label = p.table;
    if (hasMultipleFkeyConstraints) {
      label = `(${Object.entries(p.on[0]!)
        .map(([l, r]) => `${l} = ${r}`)
        .join(" AND ")}) ${p.table}`;
    }
    return {
      label,
      multiJoin: hasMultipleFkeyConstraints && {
        value: hasMultipleFkeyConstraints,
        chosen: Object.entries(p.on[0]!),
      },
    };
  });

  return {
    labels,
    label: labels.map((d) => d.label).join(" > "),
  };
};

export const getAllJoins = ({
  tableName,
  tables,
  value,
}: Pick<P, "tableName" | "tables" | "value">) => {
  const allJoins = getJoinPaths(tableName, tables);
  const valueStr = value && getJoinPathStr(value);
  const targetPathIdx = allJoins.findIndex((j) => j.pathStr === valueStr);
  const targetPath = allJoins[targetPathIdx];
  const allJoinsWithLabels = allJoins.map((j) => {
    const { label, labels } = getJoinPathLabel(j, { tableName, tables });

    return {
      ...j,
      label,
      labels,
    };
  });
  return {
    allJoins: allJoinsWithLabels,
    targetPath,
    targetPathIdx: targetPath && targetPathIdx,
  };
};

export const JoinPathSelectorV2 = (props: P) => {
  const {
    tables,
    tableName,
    value,
    onChange,
    variant,
    getFullOption,
    btnProps,
  } = props;

  const { allJoins, targetPathIdx } = useMemo(
    () => getAllJoins({ tableName, tables, value }),
    [tableName, tables, value],
  );

  const nestedColumnQuery = useMemo(() => {
    if (!value) return;
    const asName = (v) => JSON.stringify(v);
    const rootTable = asName(tableName);
    return [
      `SELECT ${rootTable}.*, ${asName(value.at(-1)!.table)}.*`,
      `FROM ${rootTable}`,
      ...value.map(
        (path, index) =>
          `JOIN ${asName(path.table)} \n  ON ${path.on
            .map((on) =>
              Object.entries(on).map(([k, v]) => {
                const prevTable =
                  !index ? rootTable : asName(value[index - 1]?.table);
                return `${prevTable}.${k} = ${asName(path.table)}.${v}`;
              }),
            )
            .join(" AND ")}`,
      ),
    ].join("\n");
  }, [value, tableName]);

  const fullOptions = useMemo(
    () =>
      allJoins.map((j) => {
        return {
          ...getFullOption?.(j.path),
          key: j.label,
          lastJoinLabel: j.labels.at(-1),
          ranking: (searchTerm) =>
            getSearchRanking(
              searchTerm,
              j.labels.map((l) => l.label),
            ),
          subLabel: j.table.columns.map((c) => c.name).join(", "),
        };
      }),
    [allJoins, getFullOption],
  );

  const targetValue =
    isDefined(targetPathIdx) ? fullOptions[targetPathIdx] : undefined;

  const infoNode =
    !nestedColumnQuery ? undefined : (
      <FlexCol>
        <div>Join path details</div>
        <CodeExample
          language="sql"
          value={nestedColumnQuery}
          style={{
            minWidth: "400px",
            minHeight: "250px",
          }}
        />
      </FlexCol>
    );

  return (
    <Select
      label={
        btnProps ? undefined : (
          {
            label: "Target table",
            info: infoNode,
          }
        )
      }
      btnProps={btnProps}
      value={targetValue?.key}
      data-command="JoinPathSelectorV2"
      fullOptions={fullOptions}
      variant={variant ? "search-list-only" : undefined}
      onChange={(key) => {
        const idx = fullOptions.findIndex((d) => d.key === key);
        const targetPath = allJoins[idx];
        const fullOpt = fullOptions[idx];
        if (!targetPath || !fullOpt) {
          console.error("Path not found");
          return;
        }
        onChange(targetPath, fullOpt.lastJoinLabel?.multiJoin);
      }}
    />
  );
};

const hasMultiFkeys = (
  tables: DBSchemaTablesWJoins,
  t1: string,
  t2: string,
) => {
  const table = tables.find((t) => t.name === t1);
  if (table) {
    const join = table.joinsV2.find(
      (j) => j.tableName === t2 && j.on.length > 1,
    );
    return join?.on;
  }

  return undefined;
};
