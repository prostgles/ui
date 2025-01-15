import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { DBSchemaTable } from "prostgles-types";
import { isDefined } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../../../components/Btn";
import { FlexCol, FlexRow } from "../../../../components/Flex";
import type { CommonWindowProps } from "../../../Dashboard/Dashboard";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import { SQLSmartEditor } from "../../../SQLEditor/SQLSmartEditor";
import type { ColumnOptions } from "./ColumnEditor";
import { ColumnEditor } from "./ColumnEditor";
import { getAlterFkeyQuery } from "./ReferenceEditor";
import { colIs } from "../ColumnSelect";
import { t } from "../../../../i18n/i18nUtils";

export type CreateColumnProps = Pick<CommonWindowProps, "suggestions"> & {
  table: DBSchemaTable;
  field: string | undefined;
  db: DBHandlerClient;
  tables: DBSchemaTablesWJoins;
  onClose: VoidFunction;
};

export const CreateColumn = ({
  db,
  onClose,
  suggestions,
  table,
  tables,
}: CreateColumnProps) => {
  const [col, setCol] = useState<ColumnOptions>({ name: "" });
  const [query, setQuery] = useState("");

  return (
    <FlexCol className="CreateColumn gap-2">
      {!query ?
        <ColumnEditor
          {...col}
          tableName={table.name}
          suggestions={suggestions}
          isAlter={false}
          tables={tables}
          onChange={(k, v) => {
            setCol({ ...col, ...v });
          }}
          onAddReference={(newCol, reference) => {
            setCol({
              ...newCol,
              references: [...(col.references ?? []), reference],
            });
          }}
          onEditReference={(r, i) => {
            setCol({
              ...col,
              references: col
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
      : <SQLSmartEditor
          asPopup={false}
          query={query}
          sql={db.sql!}
          title={t.CreateColumn["Create column query"]}
          suggestions={suggestions}
          onCancel={() => {
            setQuery("");
          }}
          onSuccess={() => {
            setQuery("");
            setCol({});
            onClose();
          }}
        />
      }
      <FlexRow className={query ? "hidden" : ""}>
        <Btn onClick={onClose} variant="outline">
          {t.common.Cancel}
        </Btn>
        <Btn
          title={t.CreateColumn["Show create column query"]}
          className="ml-auto"
          disabledInfo={
            !col.name ? t.CreateColumn["New column name missing"]
            : !col.dataType ?
              t.CreateColumn["Data type missing"]
            : undefined
          }
          variant="filled"
          color="action"
          onClick={() => {
            const query = [
              `ALTER TABLE ${table.name}`,
              `ADD COLUMN ${getAddColumnDefinitionQuery(col, table.name)};`,
            ].join("\n");
            setQuery(query);
          }}
        >
          {t.common.Next}
        </Btn>
      </FlexRow>
    </FlexCol>
  );
};
export const getColumnDefinitionQuery = ({
  dataType,
  defaultValue,
  isPkey,
  name,
  notNull,
}: ColumnOptions) => {
  const defVal =
    colIs({ udt_name: dataType as any }, ["_PG_numbers", "_PG_bool"]) ?
      defaultValue
    : `'${defaultValue}'`;
  return `${JSON.stringify(name)} ${dataType ?? ""}${isPkey ? " PRIMARY KEY " : ""}${notNull ? " NOT NULL " : ""}${defaultValue ? ` DEFAULT ${defVal}` : ""}`;
};

export const getAddColumnDefinitionQuery = (
  col: ColumnOptions,
  tableName: string,
) => {
  return [
    `${getColumnDefinitionQuery(col)};`,
    ...(col.references ?? []).map(
      (r) =>
        getAlterFkeyQuery({
          ...r,
          col: col.name!,
          tableName,
        }) + "\n",
    ),
  ].join("\n");
};
