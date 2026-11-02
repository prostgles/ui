import Btn, { type BtnProps } from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { getSearchRanking } from "@components/SearchList/searchMatchUtils/getSearchRanking";
import type { FullOption } from "@components/Select/Select";
import { Select } from "@components/Select/Select";
import type { ParsedJoinPath } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { isDefined } from "../../../utils/utils";
import CodeExample from "../../CodeExample";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import type { TargetPath } from "../tableUtils/getJoinPaths";
import {
  getJoinOption,
  getJoinPathStr,
  getJoinPaths,
} from "../tableUtils/getJoinPaths";
import type { SvgIconName } from "@components/SearchList/SearchList";
import { JoinPathParameters } from "./JoinPathParameters";
export type JoinPathSelectorV2Props = {
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
  { tableName, tables }: Pick<JoinPathSelectorV2Props, "tableName" | "tables">,
) => {
  const labels = j.path.map((p, pIdx) => {
    const prevPath = j.path[pIdx - 1];
    const hasMultipleFkeyConstraints =
      typeof p.on === "string" ?
        undefined
      : hasMultiFkeys(tables, prevPath?.table ?? tableName, p.table);
    let label =
      typeof p.on === "string" ?
        `${p.table} (${p.on}${p.reversed ? ", reversed" : ""})`
      : p.table;
    if (hasMultipleFkeyConstraints && Array.isArray(p.on)) {
      label = `(${Object.entries(p.on[0]!)
        .map(([l, r]) => `${l} = ${r}`)
        .join(" AND ")}) ${p.table}`;
    }
    return {
      label,
      multiJoin:
        hasMultipleFkeyConstraints && Array.isArray(p.on) ?
          {
            value: hasMultipleFkeyConstraints,
            chosen: Object.entries(p.on[0]!),
          }
        : undefined,
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
}: Pick<JoinPathSelectorV2Props, "tableName" | "tables" | "value">) => {
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

export const JoinPathSelectorV2 = (props: JoinPathSelectorV2Props) => {
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
  const [pendingPath, setPendingPath] = useState<TargetPath>();
  const parameterPath =
    pendingPath ??
    (isDefined(targetPathIdx) ? allJoins[targetPathIdx] : undefined);
  const parameterSchema =
    parameterPath?.path[0] &&
    getJoinOption(tables, tableName, parameterPath.path[0])?.paramsSchema;
  const applyPath = (targetPath: TargetPath) => {
    const { labels } = getJoinPathLabel(targetPath, { tableName, tables });
    onChange(targetPath, labels.at(-1)?.multiJoin);
    setPendingPath(undefined);
  };
  const hasComputedJoin = value?.some((path) => typeof path.on === "string");

  const nestedColumnQuery = useMemo(() => {
    if (!value?.length) return;
    if (hasComputedJoin) return JSON.stringify(value, null, 2);
    const asName = (v) => JSON.stringify(v);
    const rootTable = asName(tableName);
    return [
      `SELECT ${rootTable}.*, ${asName(value.at(-1)!.table)}.*`,
      `FROM ${rootTable}`,
      ...value.map(
        (path, index) =>
          `JOIN ${asName(path.table)} \n  ON ${(Array.isArray(path.on) ?
            path.on
          : []
          )
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
  }, [value, tableName, hasComputedJoin]);

  const fullOptions = useMemo(
    () =>
      allJoins.map((j) => {
        return {
          ...getFullOption?.(j.path),
          key: j.label,
          iconLeft: {
            type: "SvgIcon",
            pathName: (j.table.icon as SvgIconName | undefined) || "Table",
          },
          ranking: (searchTerm) =>
            getSearchRanking(
              searchTerm,
              j.labels.map((l) => l.label),
            ),
          subLabel: j.table.columns.map((c) => c.name).join(", "),
        } satisfies FullOption<string>;
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
          language={hasComputedJoin ? "json" : "sql"}
          value={nestedColumnQuery}
          style={{
            minWidth: "400px",
            minHeight: "250px",
          }}
        />
      </FlexCol>
    );

  const selector = (
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
      noSearchLimit={0}
      variant={!targetValue?.key || variant ? "search-list-only" : undefined}
      onChange={(key) => {
        const idx = fullOptions.findIndex((d) => d.key === key);
        const targetPath = allJoins[idx];
        const fullOpt = fullOptions[idx];
        if (!targetPath || !fullOpt) {
          console.error("Path not found");
          return;
        }
        const schema =
          targetPath.path[0] &&
          getJoinOption(tables, tableName, targetPath.path[0])?.paramsSchema;
        if (schema && Object.keys(schema).length) {
          setPendingPath({
            ...targetPath,
            path:
              value && targetPath.pathStr === getJoinPathStr(value) ?
                value
              : targetPath.path,
          });
        } else {
          applyPath(targetPath);
        }
      }}
    />
  );
  return (
    <FlexCol className="gap-1">
      {selector}
      {!pendingPath &&
        parameterPath &&
        parameterSchema &&
        Object.keys(parameterSchema).length > 0 && (
          <Btn
            onClick={() =>
              setPendingPath({
                ...parameterPath,
                path: value ?? parameterPath.path,
              })
            }
          >
            Edit parameters
          </Btn>
        )}
      {pendingPath && parameterSchema && (
        <JoinPathParameters
          key={pendingPath.pathStr}
          targetPath={pendingPath}
          schema={parameterSchema}
          onApply={applyPath}
          onCancel={() => setPendingPath(undefined)}
        />
      )}
    </FlexCol>
  );
};

const hasMultiFkeys = (
  tables: DBSchemaTablesWJoins,
  t1: string,
  t2: string,
) => {
  const table = tables.find((t) => t.name === t1);
  if (table) {
    const conditions = table.joinOptions
      .filter((join) => join.table === t2)
      .flatMap((join) =>
        typeof join.on === "string" ?
          []
        : join.on.map((on) => Object.entries(on)),
      );
    return conditions.length > 1 ? conditions : undefined;
  }

  return undefined;
};
