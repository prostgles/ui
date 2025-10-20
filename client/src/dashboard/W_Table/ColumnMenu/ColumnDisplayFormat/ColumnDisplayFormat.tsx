import type { DBSchemaTable } from "prostgles-types";
import React from "react";
import { JSONBSchema } from "@components/JSONBSchema/JSONBSchema";
import type { ColumnConfigWInfo } from "../../W_Table";
import type { DeepWriteable } from "@common/utils";
import type { ColumnFormat } from "./columnFormatUtils";
import { ColumnFormatSchema, getFormatOptions } from "./columnFormatUtils";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import type { lab } from "d3";

type P = {
  column: ColumnConfigWInfo;
  table: DBSchemaTable;
  tables: DBSchemaTablesWJoins;
  onChange: (newFormat: ColumnFormat) => void;
};

export const ColumnDisplayFormat = ({ column, table, tables, onChange }: P) => {
  const s = { ...ColumnFormatSchema } as DeepWriteable<
    typeof ColumnFormatSchema
  >;
  const allowedRenderers = getFormatOptions(column.info);
  const textCols = table.columns
    .filter((c) => c.tsDataType === "string")
    .map((c) => c.name);
  s.oneOfType = s.oneOfType
    .map((t) => {
      if ("params" in t) {
        if (t.type.enum[0] === "Currency") {
          // @ts-ignore
          t.params.oneOfType[1].currencyCodeField.allowedValues = textCols;
          // @ts-ignore
          t.params.oneOfType[0].currencyCode.allowedValues =
            getCurrencyCodes().map((c) => ({
              label: c.symbol !== c.code ? `${c.code} (${c.symbol})` : c.code,
              value: c.code,
              subLabel: c.country,
            }));
        } else if (t.type.enum[0] === "Media") {
          //@ts-ignore
          t.params.oneOfType[2]!.contentTypeColumnName.allowedValues = textCols;
        }
      }

      return t;
    })
    .filter((t) =>
      allowedRenderers.find((df) => (t.type.enum as any).includes(df.type)),
    ) as any;

  // return <JSONBSchema
  //   schema={{ type: ColumnFormatSchema.oneOfType[7] }}
  //   tables={tables}
  //   value={column.format}
  //   onChange={onChange}
  //   />

  return (
    //@ts-ignore
    <JSONBSchema
      schema={s}
      tables={tables}
      value={column.format}
      onChange={onChange}
    />
  );
};

const getCurrencyCodes = () => {
  // Get all ISO currency codes
  const currencies = Intl.supportedValuesOf("currency");

  const data: {
    code: string;
    country: string;
    symbol: string;
  }[] = [];

  for (const code of currencies) {
    try {
      // Try to find a representative locale for each currency
      const locale = `en-${code.slice(0, 2)}`; // crude but works often
      const region = new Intl.DisplayNames(["en"], { type: "region" }).of(
        code.slice(0, 2).toUpperCase(),
      );
      const symbol = (0)
        .toLocaleString("en", { style: "currency", currency: code })
        .replace(/\d|[.,\s]/g, "")
        .trim();

      data.push({ code, country: region || "Unknown", symbol });
    } catch (e) {
      console.warn("Could not get currency for code", code, e);
      // data[code] = { country: "Unknown", symbol: "" };
    }
  }

  return data;
};
