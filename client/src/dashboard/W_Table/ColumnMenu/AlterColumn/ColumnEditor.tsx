import {
  _PG_bool,
  _PG_date,
  _PG_geometric,
  _PG_interval,
  _PG_json,
  _PG_numbers,
  _PG_postgis,
  _PG_strings,
} from "prostgles-types";
import React, { useMemo } from "react";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../../components/Flex";
import { FormFieldDebounced } from "../../../../components/FormField/FormFieldDebounced";
import Select from "../../../../components/Select/Select";
import { SwitchToggle } from "../../../../components/SwitchToggle";
import type { CommonWindowProps } from "../../../Dashboard/Dashboard";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnReference } from "./ReferenceEditor";
import { AddColumnReference, References } from "./ReferenceEditor";
import type { PG_DataType } from "../../../SQLEditor/SQLCompletion/getPGObjects";

export type ColumnOptions = {
  name?: string;
  isPkey?: boolean;
  dataType?: string;
  notNull?: boolean;
  defaultValue?: string;
  references?: ColumnReference[];
};

type P = Pick<CommonWindowProps, "suggestions"> &
  ColumnOptions & {
    tables: DBSchemaTablesWJoins;
    tableName: string;
    onChange: (key: keyof ColumnOptions, change: ColumnOptions) => void;
    onAddReference: (
      c: ColumnOptions,
      r: Required<ColumnOptions>["references"][number],
    ) => void;
    onEditReference: (c: ColumnReference | undefined, index: number) => void;
    isAlter: boolean;
  };

export const ColumnEditorTestSelectors = {
  columnName: "",
} as const;

export const ColumnEditor = ({
  onChange,
  onAddReference,
  tables,
  onEditReference,
  isAlter,
  suggestions,
  tableName,
  ...colOpts
}: P) => {
  const {
    dataType,
    defaultValue,
    isPkey,
    name,
    notNull,
    references = [],
  } = colOpts;

  const DATA_TYPES = useMemo(() => {
    type Item = { key: string; label: string; subLabel?: string };
    const pgDataTypes: PG_DataType[] | undefined = suggestions?.suggestions
      /** Must exclude arrays */
      .filter((s) => s.dataTypeInfo && s.name.startsWith("_"))
      .map((dt) => dt.dataTypeInfo!)
      .sort((a, b) => a.priority.localeCompare(b.priority));

    const _dataTypes: Item[] =
      pgDataTypes?.map(
        (di) =>
          ({
            key:
              ["serial", "bigserial"].includes(di.name.toLowerCase()) ?
                di.name.toLowerCase()
              : di.udt_name,
            label: di.name,
            subLabel: di.desc,
          }) as Item,
      ) ??
      dataTypes
        .concat(["SERIAL", "BIGSERIAL"].map((key) => ({ key })))
        .map((dt) => ({ label: dt.key, ...dt }));

    return _dataTypes.concat(
      _dataTypes.map((dt) => ({
        key: `_${dt.key}`,
        label: `${dt.label}[]`,
        subLabel: dt.subLabel,
      })),
    );
  }, [suggestions]);

  return (
    <FlexCol className="ColumnEditor gap-2">
      <FlexRowWrap className="ai-end">
        <FormFieldDebounced
          label="Column name"
          type="text"
          data-command="ColumnEditor.name"
          value={name}
          onChange={(newName) => {
            onChange("name", { name: newName });
          }}
        />
        {!name && (
          <>
            <div className="px-p25 py-1">OR</div>
            <AddColumnReference
              existingReferences={references}
              dataType={dataType}
              tableName={tableName}
              columnName={name}
              tables={tables}
              onAdd={(refCol, newRef) => {
                onAddReference(
                  {
                    name: `${refCol.table.name}_id`,
                    dataType: refCol.column.udt_name.toUpperCase(),
                    references: [newRef],
                  },
                  newRef,
                );
              }}
            />
          </>
        )}
        <FlexRow className={!name ? "hidden" : ""}>
          <Select
            label="Data type"
            data-command="ColumnEditor.dataType"
            value={dataType}
            fullOptions={DATA_TYPES}
            btnProps={{ color: "action" }}
            onChange={(dataType) => onChange("dataType", { dataType })}
          />
          {!!dataType && (
            <>
              <SwitchToggle
                variant="col"
                label={{
                  label: "Primary key",
                  info: `A primary key constraint indicates that a column, or group of columns, can be used as a unique identifier for rows in the table. This requires that the values be both unique and not null`,
                }}
                checked={!!isPkey}
                onChange={(isPkey) => {
                  onChange("isPkey", { isPkey });
                }}
              />
              <SwitchToggle
                variant="col"
                label={{
                  label: "Not null",
                  info: "If true then NULL values will not be accepted",
                }}
                disabledInfo={
                  isPkey ? "Primary key constraint overrides this" : undefined
                }
                checked={!!notNull}
                onChange={(notNull) => {
                  onChange("notNull", { notNull });
                }}
              />
            </>
          )}
        </FlexRow>
      </FlexRowWrap>
      <FlexCol className={!dataType ? "hidden" : ""}>
        <FormFieldDebounced
          id={"defval"}
          label={{
            label: "Default value",
            info: "Will be added to all new records if no other value is specified",
          }}
          type="text"
          autoComplete="off"
          // asJSON={!col?.udt_name.startsWith("json")? undefined :
          //   {
          //     schemas: [
          //       {
          //         id : `wsp.${col.name}`,
          //         schema: getJSONBSchemaAsJSONSchema(tableName, col.name, col.jsonbSchema ?? {} )
          //       }
          //     ]
          //   }
          // }
          value={defaultValue}
          optional={true}
          onChange={(defaultValue) => {
            onChange("defaultValue", { defaultValue });
          }}
        />
        {((colOpts.references?.length ?? 0) > 0 || isAlter) && (
          <References
            {...colOpts}
            tableName={tableName}
            tables={tables}
            onAdd={(newRef) => {
              onAddReference(colOpts, newRef);
            }}
            onChange={(r, i) => {
              onEditReference(r, i);
            }}
          />
        )}
      </FlexCol>
    </FlexCol>
  );
};

const dataTypeRename = {
  INT2: "SMALLINT",
  INT4: "INTEGER",
  INT: "INTEGER",
  INT8: "BIGINT",
  FLOAT4: "REAL",
  BOOL: "BOOLEAN",
  SERIAL8: "BIGSERIAL",
};
export const dataTypes = [
  ...[
    ..._PG_strings,
    ..._PG_numbers,
    ..._PG_json,
    ..._PG_bool,
    ..._PG_date,
    ..._PG_interval,
    ..._PG_postgis,
    ..._PG_geometric,
  ].map((key) => ({
    key: dataTypeRename[key.toUpperCase()] ?? key.toUpperCase(),
  })),
] as const;
