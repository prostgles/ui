import React from "react";
import ErrorComponent from "../../../components/ErrorComponent";

import type {
  SyncRule,
  TableRules,
} from "../../../../../commonTypes/publishUtils";
import Select from "../../../components/Select/Select";
import type { ContextDataSchema } from "../OptionControllers/FilterControl";
import type { TablePermissionControlsProps } from "../TableRules/TablePermissionControls";
import { RuleToggle } from "./RuleToggle";
import { InfoRow } from "../../../components/InfoRow";
// import { _PG_date, _PG_numbers, _PG_strings } from "prostgles-types";

type P = Pick<
  Required<TablePermissionControlsProps>,
  "prgl" | "table" | "userTypes"
> & {
  rule: TableRules["sync"];
  tableRules: TableRules;
  onChange: (rule: SyncRule | undefined) => void;
  contextDataSchema: ContextDataSchema;
};

export const SyncRuleControl = ({
  rule: rawRule,
  onChange,
  table,
  tableRules,
}: P) => {
  const rule = rawRule;

  const allowedSyncedFieldUdtNames = [
    // "timestamp", "timestamptz", "int4",
    "int8",
  ];
  const syncFields = table.columns.filter((c) =>
    allowedSyncedFieldUdtNames.includes(c.udt_name),
  );
  const allowedIdFieldsUdtNames = [
    "int2",
    "int4",
    "float4",
    "float8",
    "int8",
    "varchar",
    "text",
    "uuid",
  ];
  const idFields = table.columns.filter((c) =>
    allowedIdFieldsUdtNames.includes(c.udt_name),
  );

  const error =
    !rule ? undefined
    : !syncFields.length ?
      `No fields that can be used as last updated field. Allowed data types: ${allowedSyncedFieldUdtNames.join(", ")}`
    : !idFields.length ?
      `No fields that can be used as ID fields. Allowed data types: ${allowedIdFieldsUdtNames.join(", ")}`
    : !rule.id_fields.length ? "Must select at least one id field"
    : !rule.synced_field ? "Must select a last updated field"
    : rule.id_fields.some((f) => f === rule.synced_field) ?
      "ID fields cannot include the last updated field"
    : undefined;

  const cannotEnableError =
    table.info.isView ? "Only tables can be synced"
    : !tableRules.select ? "Cannot enable sync without select rule"
    : !(tableRules.update || tableRules.insert || tableRules.delete) ?
      "Cannot enable sync without at least one of the following rules: insert, update, delete"
    : undefined;

  return (
    <div className="flex-col gap-2">
      <RuleToggle
        checked={!!rule}
        onChange={(v) => {
          onChange(
            v ?
              { id_fields: [], synced_field: "", allow_delete: false }
            : undefined,
          );
        }}
        disabledInfo={cannotEnableError}
      />
      <InfoRow color="info" variant="naked">
        Real-time synchronization between server and API clients.
        <br></br>
        Exposes a "sync" method for the table which allows the client to make
        instant optimistic changes to their local data which are then synced
        with the server.
      </InfoRow>
      {rule && (
        <>
          <Select
            label={{
              label: "ID fields",
              info: "Fields that uniquely identify a record",
            }}
            fullOptions={idFields.map((c) => ({
              key: c.name,
              subLabel: c.udt_name,
            }))}
            value={rule.id_fields}
            multiSelect={true}
            onChange={(id_fields) => {
              const newUniqueFields = Array.from(
                new Set([...rule.id_fields, ...id_fields]),
              );
              onChange({ ...rule, id_fields: newUniqueFields });
            }}
          />
          <Select
            label={{
              label: "Sync/Last updated field",
              info: "Field that shows the UNIX time when the record was last updated/created",
            }}
            fullOptions={syncFields.map((c) => ({
              key: c.name,
              subLabel: c.udt_name,
              disabledInfo:
                rule.id_fields.includes(c.name) ?
                  "Cannot be an ID field"
                : undefined,
            }))}
            value={rule.synced_field}
            onChange={(synced_field) => {
              onChange({ ...rule, synced_field });
            }}
          />
        </>
      )}
      <ErrorComponent error={error} />
    </div>
  );
};
