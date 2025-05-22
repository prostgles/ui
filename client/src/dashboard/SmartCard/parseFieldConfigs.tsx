import {
  isDefined,
  isObject,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import type {
  FieldConfigNested,
  ParsedFieldConfig,
  ParsedNestedFieldConfig,
} from "./SmartCard";
import React from "react";
import { RenderValue } from "../SmartForm/SmartFormField/RenderValue";
import Checkbox from "../../components/Checkbox";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { SvgIconFromURL } from "../../components/SvgIcon";
export const parseFieldConfigs = (
  configs?: FieldConfigNested[],
  cols?: ValidatedColumnInfo[],
  tables: DBSchemaTableWJoins[] = [],
  // table: DBSchemaTableWJoins,
): undefined | ParsedFieldConfig[] | ParsedNestedFieldConfig[] => {
  if (configs) {
    if ((configs as any) === "*") configs = ["*"];
    if (!Array.isArray(configs)) throw "Expecting an array of fieldConfigs";
    const result: ParsedFieldConfig[] | ParsedNestedFieldConfig[] = configs
      .slice(0)
      .flatMap((fc) => {
        if (typeof fc === "string") {
          if (cols) {
            return getDefaultFieldConfig(cols, [fc]);
          } else {
            return { name: fc };
          }
        } else {
          const { select, hide, render, ...restdw } = fc;
          if (!hide && !render && isObject(select) && tables.length) {
            const ftable = tables.find((t) => t.name === fc.name);
            if (ftable) {
              const { rowIconColumn } = ftable;
              if (rowIconColumn && select[rowIconColumn] === 1) {
                return {
                  ...(fc as ParsedFieldConfig),
                  render: (ftableRows: AnyObject[]) => {
                    const logo_url = ftableRows[0]?.[rowIconColumn];
                    if (!logo_url) return null;
                    return (
                      <SvgIconFromURL
                        url={logo_url}
                        style={{ width: "32px", height: "32px" }}
                      />
                    );
                  },
                };
              }
            }
          }
          return fc as ParsedFieldConfig;
        }
      })
      .filter(isDefined);
    const duplicate = result.find((f, i) =>
      result.find((_f, _i) => f.name === _f.name && i !== _i),
    );
    if (duplicate) {
      console.log("Duplicate field config name found: " + duplicate.name);
    }
    return result;
  } else {
    /** Show all ? */
  }

  return undefined;
};

export const getDefaultFieldConfig = (
  cols: Pick<
    ValidatedColumnInfo,
    "name" | "label" | "udt_name" | "tsDataType" | "references"
  >[] = [],
  colNames?: string[],
): ParsedNestedFieldConfig[] => {
  let _fieldConfigs: FieldConfigNested[] | string[] | undefined = colNames;
  /** Select utils */
  if (colNames) {
    _fieldConfigs = colNames.slice(0);

    const allFieldsIndex = _fieldConfigs.findIndex((c) => c === "*");
    if (allFieldsIndex > -1) {
      _fieldConfigs.splice(allFieldsIndex, 0, ...cols.map((c) => c.name));
    }
    const allTablesIndex = _fieldConfigs.findIndex((c) => c === "**");
    if (allTablesIndex > -1) {
      _fieldConfigs.splice(
        allTablesIndex,
        0,
        ...cols
          .filter((c) => c.references?.length)
          .flatMap((c) =>
            c.references!.map((r) => ({
              name: r.ftable!,
              fieldConfigs: ["*"],
            })),
          ),
      );
    }
    _fieldConfigs = _fieldConfigs.filter(
      (c) => !["*", "**"].includes(c as string),
    );
  }

  const getColConfig = (c: (typeof cols)[number]) => ({
    name: c.name,
    label: c.label,
    render:
      ["postcode", "post_code"].includes(c.name) ?
        (addr: string) =>
          !addr ?
            <RenderValue column={c} value={addr} />
          : <a
              className="flex-col"
              target="_blank"
              href={`https://www.google.com/maps/search/${addr}`}
              rel="noreferrer"
            >
              <span>
                <RenderValue column={c} value={addr} />
              </span>
            </a>
      : c.tsDataType === "boolean" ?
        (val: boolean | null) => (
          <Checkbox
            title={(val || "NULL").toString()}
            checked={!!val}
            className="no-pointer-events"
            readOnly={true}
          />
        )
      : undefined,
  });

  const result =
    _fieldConfigs ?
      _fieldConfigs
        .map((fc: any) => {
          /** Is nested config. Return as is */
          if (typeof fc !== "string") {
            return fc;
            /** Is colname. Find column info and prepare */
          } else {
            const c = cols.find((c) => c.name === fc);
            if (!c) {
              console.error(
                `Could not find column ${fc}. Incorrect name or not allowed`,
              );
            } else {
              return getColConfig(c);
            }
          }
        })
        .filter((c) => c)
    : cols.map((c) => getColConfig(c));

  return result;
};
