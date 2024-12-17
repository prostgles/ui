import { mdiDelete, mdiLinkPlus } from "@mdi/js";
import React, { useMemo } from "react";
import Btn from "../../../../components/Btn";
import Chip from "../../../../components/Chip";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../../components/Flex";
import { InfoRow } from "../../../../components/InfoRow";
import { Label } from "../../../../components/Label";
import Select from "../../../../components/Select/Select";
import { REFERENCES_COL_OPTS } from "../../../SQLEditor/SQLCompletion/TableKWDs";
import type { ColumnOptions } from "./ColumnEditor";
import { isDefined } from "../../../../utils";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";

const FKEY_DOCS =
  "Constraint to ensure that every value from this column has a coresponding record in another table. The column in the other table must have unique values";

export type ColumnReference = {
  ftable: string;
  fCol: string;
  onDelete?: string;
  onUpdate?: string;
};
type ReferenceEditorProps = ColumnReference & {
  notNullErr: "u" | "d" | undefined;
  onChange: (newRef: ColumnReference | undefined) => void;
};

export const onDeleteOptions = REFERENCES_COL_OPTS.filter((d) =>
  d.kwd.startsWith("ON DELETE"),
).map((d) => ({ key: d.kwd.split(" ").slice(2).join(" "), subLabel: d.docs }));
export const onUpdateOptions = REFERENCES_COL_OPTS.filter((d) =>
  d.kwd.startsWith("ON UPDATE"),
).map((d) => ({ key: d.kwd.split(" ").slice(2).join(" "), subLabel: d.docs }));

export const ReferenceEditor = ({
  onChange,
  notNullErr,
  ...colOpts
}: ReferenceEditorProps) => {
  const { fCol, ftable, onDelete, onUpdate } = colOpts;
  return (
    <FlexRowWrap className="rounded b b-color p-p5">
      <Chip variant="header" label={"Foreign table"} value={ftable} />
      <Chip variant="header" label={"Foreign column"} value={fCol} />
      <Select
        label="ON DELETE"
        className={
          notNullErr === "d" ? "b-2 b-danger p-p25 rounded" : undefined
        }
        value={onDelete || "NO ACTION"}
        fullOptions={onDeleteOptions}
        onChange={(onDelete) => {
          onChange({ ...colOpts, onDelete });
        }}
      />
      <Select
        label="ON UPDATE"
        className={
          notNullErr === "u" ? "b-2 b-danger p-p25 rounded" : undefined
        }
        value={onUpdate || "NO ACTION"}
        fullOptions={onUpdateOptions}
        onChange={(onUpdate) => {
          onChange({ ...colOpts, onUpdate });
        }}
      />
      <Btn
        iconPath={mdiDelete}
        className="mb-auto"
        onClick={() => {
          onChange(undefined);
        }}
      />
    </FlexRowWrap>
  );
};

type P = ColumnOptions & {
  onChange: (newRef: ColumnReference | undefined, index: number) => void;
  onAdd: (newRef: ColumnReference) => void;
  tables: DBSchemaTablesWJoins;
  tableName: string;
};
export const References = ({
  onChange,
  tables,
  onAdd,
  tableName,
  ...opts
}: P) => {
  const references = opts.references?.map((r) => {
    return {
      ...r,
      notNullErr:
        opts.notNull ?
          r.onDelete?.includes("SET NULL") ? ("d" as const)
          : r.onUpdate?.includes("SET NULL") ? ("u" as const)
          : undefined
        : undefined,
    };
  });

  return (
    <FlexCol className="References gap-p25">
      <Label label="References" variant="normal" info={FKEY_DOCS} />
      {references?.some((c) => c.notNullErr) && (
        <InfoRow color="danger">
          Some foreign keys contain a SET NULL option and this column is not
          nullable. This will lead to error
        </InfoRow>
      )}
      {references?.map((r, index) => (
        <ReferenceEditor
          key={index}
          {...r}
          onChange={(newRef) => onChange(newRef, index)}
        />
      ))}
      <AddColumnReference
        tableName={tableName}
        columnName={opts.name}
        dataType={opts.dataType}
        existingReferences={opts.references ?? []}
        tables={tables}
        variant="without-label"
        onAdd={(rcol, ref) => {
          onAdd(ref);
        }}
      />
    </FlexCol>
  );
};

type ReferencedColumn = {
  table: DBSchemaTablesWJoins[number];
  column: DBSchemaTablesWJoins[number]["columns"][number];
};
type AddColumnReferenceProps = {
  variant?: "without-label";
  tables: DBSchemaTablesWJoins;
  existingReferences: ColumnReference[];
  tableName: string;
  columnName: string | undefined;
  dataType: string | undefined;
  onAdd: (referencedColumn: ReferencedColumn, newRef: ColumnReference) => void;
};
export const AddColumnReference = ({
  tables,
  variant,
  onAdd,
  tableName,
  columnName,
  dataType,
  existingReferences,
}: AddColumnReferenceProps) => {
  const referenceableColumns = useMemo(
    () =>
      tables.flatMap((table) => {
        return table.columns
          .filter(
            (c) =>
              c.is_pkey && !(table.name === tableName && columnName === c.name),
          )
          .map((column) => ({
            key: `${table.name}.${column.name}`,
            label: `${table.name} (${column.name})`,
            subLabel: column.udt_name,
            disabledInfo:
              (
                existingReferences.some(
                  (r) => r.ftable === table.name && r.fCol === column.name,
                )
              ) ?
                "Already referenced by this column"
              : (
                dataType &&
                column.udt_name.toUpperCase() !== dataType.toUpperCase()
              ) ?
                "Column is not of same data type"
              : undefined,
            table,
            column,
          }));
      }),
    [tables, existingReferences, dataType, tableName, columnName],
  );

  return (
    <Select
      className="AddColumnReference mt-1"
      label={
        variant === "without-label" ? undefined : (
          {
            label: "References",
            info: FKEY_DOCS,
          }
        )
      }
      btnProps={{
        children: "Add reference",
        iconPath: mdiLinkPlus,
        color: "action",
      }}
      data-command="AddColumnReference"
      fullOptions={referenceableColumns}
      onChange={(cKey) => {
        const rCol = referenceableColumns.find((c) => c.key === cKey);
        if (rCol) {
          onAdd(rCol, {
            ftable: rCol.table.name,
            fCol: rCol.column.name,
          });
        }
      }}
    />
  );
};

export const getReferencesQuery = ({
  ftable,
  fCol,
  onDelete = "",
  onUpdate = "",
}: ColumnReference) => {
  return [
    `REFERENCES ${JSON.stringify(ftable)} (${JSON.stringify(fCol)})`,
    onDelete ? `ON DELETE ${onDelete}` : undefined,
    onUpdate ? `ON UPDATE ${onUpdate}` : undefined,
  ];
};

export const getAlterFkeyQuery = (
  arg: ColumnReference & { col: string; tableName: string },
) => {
  const { col, tableName } = arg;
  return [
    `ALTER TABLE ${JSON.stringify(tableName)}`,
    `ADD FOREIGN KEY (${JSON.stringify(col)})`,
    ...getReferencesQuery(arg),
  ]
    .filter(isDefined)
    .join("\n");
};
