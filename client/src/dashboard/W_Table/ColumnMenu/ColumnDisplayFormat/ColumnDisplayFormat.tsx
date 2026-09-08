import { columnDisplayFormatSchema } from "@common/columnDisplayFormat.schema";
import { getConnectionPaths, type DeepWriteable } from "@common/utils";
import { FlexCol } from "@components/Flex";
import { JSONBSchema } from "@components/JSONBSchema/JSONBSchema";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { includes, type DBSchemaTable } from "prostgles-types";
import React, { useMemo } from "react";
import { Link } from "react-router";
import type { Prgl } from "src/App";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../../W_Table";
import { UpdateColumnGlobalConfig } from "../UpdateColumnGlobalConfig";
import type { ColumnFormat } from "./columnFormatUtils";
import { getFormatOptions } from "./columnFormatUtils";

type P = {
  db: Prgl["db"];
  column: ColumnConfigWInfo;
  table: DBSchemaTable;
  tables: DBSchemaTablesWJoins;
  onChange: (newFormat: ColumnFormat) => void;
};

export const ColumnDisplayFormat = ({
  column,
  table,
  tables,
  onChange,
  db,
}: P) => {
  const { connection } = usePrgl();
  const schema = useMemo(() => {
    const schemaWithoutAllowedValues = {
      ...columnDisplayFormatSchema,
    } as DeepWriteable<typeof columnDisplayFormatSchema>;
    const allowedRenderers = getFormatOptions(
      column.info ?? column.computedConfig,
    );
    const textCols = table.columns
      .filter((c) => c.tsDataType === "string")
      .map((c) => c.name);
    schemaWithoutAllowedValues.oneOfType = schemaWithoutAllowedValues.oneOfType
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
            // @ts-ignore
            t.params.type.contentType.oneOfType[2]!.contentTypeColumnName.allowedValues =
              textCols;
          }
        }

        return t;
      })
      .filter((t) =>
        allowedRenderers.find((df) => includes(t.type.enum, df.type)),
      ) as typeof schemaWithoutAllowedValues.oneOfType;
    return schemaWithoutAllowedValues;
  }, [column, table.columns]);

  return (
    <FlexCol>
      <JSONBSchema
        schema={schema}
        db={db}
        tables={tables}
        value={column.format}
        onChange={onChange}
      />
      {column.format?.type === "Media" && (
        <Link to={getConnectionPaths(connection, "security").config}>
          Content Security Policy settings
        </Link>
      )}
      <UpdateColumnGlobalConfig tableName={table.name} column={column} />
    </FlexCol>
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
    }
  }

  return data;
};
