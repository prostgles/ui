import {
  mdiAlert,
  mdiCodeJson,
  mdiContentCopy,
  mdiDownload,
  mdiLanguageTypescript,
  mdiText,
} from "@mdi/js";
import type { SQLHandler, ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { Label } from "../../components/Label";
import { PopupMenuList } from "../../components/PopupMenuList";
import { download } from "./W_SQL";
import type { Unpromise } from "./W_SQLMenu";
import { isObject } from "../../../../commonTypes/publishUtils";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { getPapa } from "../FileImporter/FileImporter";
import { sliceText } from "../../../../commonTypes/utils";
import { isDefined } from "../../utils";

const getValidPGColumnNames = async (
  v: string[],
  sql: SQLHandler,
): Promise<{ name: string; escaped: string }[]> => {
  return sql(
    "SELECT name, format('%I', name) as escaped FROM unnest($1::TEXT[]) as name",
    [v],
    { returnType: "rows" },
  ) as any;
};

type Outputs = {
  val: string;
  label: string;
  iconPath: string;
  fileName: string;
}[];
export const CopyResultBtn = (props: {
  queryEnded: boolean;
  sql: SQLHandler;
  rows: any[][];
  cols: Pick<ValidatedColumnInfo, "name" | "tsDataType" | "udt_name">[];
}) => {
  const { cols, rows: rawValues, sql, queryEnded } = props;
  const res = usePromise(async () => {
    try {
      const rows = rawValues.map((row) => getStringifiedObjects(row, cols));
      let escapedNames: Unpromise<ReturnType<typeof getValidPGColumnNames>> =
        [];
      if (!cols.length || !rows.length) return;
      try {
        escapedNames = await getValidPGColumnNames(
          cols.map((c) => c.name),
          sql,
        );
      } catch (err) {
        console.error(err, cols);
      }
      const _cols = await Promise.all(
        cols.map(async (c, ci) => {
          const name: string =
            escapedNames.find((en) => en.name === c.name)?.escaped ??
            JSON.stringify(c.name);

          const vals = rows.map((r) => r[ci]);
          return {
            ...c,
            name,
            nullable: vals.includes(null) ? " | null" : "",
            undef: vals.includes(undefined) ? " | undefined" : "",
          };
        }),
      );

      const ts = `type Result = { \n${_cols.map((c) => `  ${c.name}: ${c.tsDataType}${c.nullable}${c.undef};`).join("\n")} \n}`;
      const tsv = [cols.map((c) => JSON.stringify(c.name)), ...rows]
        .map((v) => v.join("\t"))
        .join("\n");

      const csv = await getSqlRowsAsCSV(
        rows,
        cols.map((c) => c.name),
      );
      const json = JSON.stringify(
        rows.map((r) =>
          r.reduce((a, v, ri) => ({ ...a, [cols[ri]!.name]: v }), {}),
        ),
      );
      const jsonArray =
        cols.length === 1 ?
          JSON.stringify(rows.map((row) => Object.values(row)).flat(), null, 2)
        : undefined;
      const sqlResult = [
        `SELECT ${cols.map((c) => `${JSON.stringify(c.name)}::${c.udt_name} as ${JSON.stringify(c.name)}`).join("\n, ")}`,
        `INTO new_table_name`,
        `FROM (`,
        `  VALUES `,
        rows
          .map((values) => {
            const rowStr =
              "    (" +
              values
                .map((v) => {
                  return (
                    v === null ? "null"
                    : typeof v === "string" ?
                      `'${v.replaceAll("'", "''").replaceAll("\n", "\\n")}'`
                    : v
                  );
                })
                .join(", ") +
              ")";
            return rowStr;
          })
          .join(",\n"),
        `) AS result(${cols.map((c) => JSON.stringify(c.name))}) `,
      ].join("\n");
      const outputs: Outputs = [
        {
          val: tsv,
          label: "Copy as TSV",
          iconPath: mdiText,
          fileName: "result.tsv",
        },
        {
          val: csv,
          label: "Copy as CSV",
          iconPath: mdiText,
          fileName: "result.csv",
        },
        {
          val: sqlResult,
          label: "Copy as SELECT INTO",
          iconPath: mdiText,
          fileName: "result.sql",
        },
        {
          val: json,
          label: "Copy as JSON",
          iconPath: mdiCodeJson,
          fileName: "result.json",
        },
        jsonArray ?
          {
            val: jsonArray,
            label: "Copy as JSON Array",
            iconPath: mdiCodeJson,
            fileName: "result.json",
          }
        : undefined,
        {
          val: ts,
          label: "Copy Typescript definition",
          iconPath: mdiLanguageTypescript,
          fileName: "result.d.ts",
        },
      ].filter(isDefined);
      return {
        outputs,
        error: undefined,
      };
    } catch (err) {
      return {
        outputs: undefined,
        error: err,
      };
    }
  }, [cols, rawValues, sql]);
  const { outputs, error } = res ?? {};

  if (error)
    return (
      <Label
        iconPath={mdiAlert}
        label=""
        popupTitle="Cannot copy result"
        info={<ErrorComponent error={error} />}
      />
    );

  return (
    <PopupMenuList
      button={
        <Btn
          title={`Copy result (${rawValues.length} rows)`}
          size="small"
          iconPath={mdiContentCopy}
          style={{
            visibility: queryEnded && outputs?.length ? "visible" : "hidden",
          }}
        />
      }
      listStyle={{
        flex: 1,
        display: "flex",
      }}
      items={(outputs ?? []).map((o) => ({
        leftIconPath: o.iconPath,
        label: o.label,
        title: sliceText(o.val, 100),
        // iconStyle: { color: "var(--gray-400)" },
        labelStyle: { width: "100%", flex: 1 },
        onPress: (e) => {
          e.stopPropagation();
          e.preventDefault();
          navigator.clipboard.writeText(o.val);
        },
        contentRight: (
          <Btn
            className="show-on-parent-hover"
            iconPath={mdiDownload}
            title="Download file"
            onClick={() => {
              download(o.val, o.fileName, "text");
            }}
          />
        ),
      }))}
    />
  );
};

const getStringifiedObjects = (
  values: any[],
  cols: Pick<ValidatedColumnInfo, "name" | "tsDataType" | "udt_name">[],
) => {
  return values.map((value, idx) => {
    const col = cols[idx];
    if (Array.isArray(value) && col?.udt_name.startsWith("_")) {
      return `{${value.map((v) => (v === null ? "null" : v)).join(",")}}`;
    }
    return isObject(value) || Array.isArray(value) ?
        JSON.stringify(value)
      : value;
  });
};

export const getSqlRowsAsCSV = async (rows: any[][], columnNames: string[]) => {
  const papa = await getPapa();
  return papa.unparse(
    [columnNames, ...rows.map((row) => getStringifiedObjects(row, []))],
    {
      quotes: true,
      header: false,
      columns: columnNames,
    },
  );
};
