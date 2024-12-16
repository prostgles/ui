import { mdiFileDocumentEditOutline } from "@mdi/js";
import { getKeys, isObject } from "prostgles-types";
import React from "react";
import type {
  ContextDataObject,
  TableRules,
  UpdateRule,
} from "../../../../../commonTypes/publishUtils";
import { parseFieldFilter } from "../../../../../commonTypes/publishUtils";
import ErrorComponent from "../../../components/ErrorComponent";

import { DynamicFields } from "../OptionControllers/DynamicFields";
import { FieldFilterControl } from "../OptionControllers/FieldFilterControl";
import type {
  ContextDataSchema,
  SingleGroupFilter,
} from "../OptionControllers/FilterControl";
import { FilterControl } from "../OptionControllers/FilterControl";
import type { TablePermissionControlsProps } from "../TableRules/TablePermissionControls";
import { ExampleComparablePolicy } from "./ExampleComparablePolicy";
import { RuleToggle } from "./RuleToggle";
import { RuleExpandSection } from "./SelectRuleControl";

type P = Pick<
  Required<TablePermissionControlsProps>,
  "prgl" | "table" | "tableRules" | "userTypes"
> & {
  rule: TableRules["update"];
  onChange: (rule: UpdateRule | undefined) => void;
  contextDataSchema: ContextDataSchema;
  contextData: ContextDataObject;
};

export const UpdateRuleControl = (props: P) => {
  const {
    rule: rawRule,
    onChange,
    table,
    contextDataSchema,
    contextData,
    prgl,
    userTypes,
  } = props;
  const rule: UpdateRule | undefined =
    rawRule === true ? { fields: "*" }
    : isObject(rawRule) ? rawRule
    : undefined;
  const error = !rawRule ? undefined : getUpdateRuleError(props);

  return (
    <div className="flex-col gap-2 min-h-0">
      <RuleToggle
        checked={!!rule}
        onChange={(v) => {
          onChange(v ? { fields: "*" } : undefined);
        }}
      />
      {rule && (
        <>
          <FieldFilterControl
            iconPath={mdiFileDocumentEditOutline}
            label={"Can update"}
            info={
              "List of fields that can be edited/updated. \nIf the Check condition specifies only one possible value for a field then it will be pre-populated and hidden from user"
            }
            columns={table.columns}
            value={rule.fields}
            onChange={(fields) => {
              onChange({ ...rule, fields });
            }}
          />

          <FilterControl
            label="From"
            info={
              <div className="flex-col gap-1">
                <div>
                  Filter added to each update to ensure other records cannot be
                  updated
                </div>
              </div>
            }
            db={prgl.db}
            methods={prgl.methods}
            tables={prgl.tables}
            contextData={contextDataSchema}
            detailedFilter={rule.forcedFilterDetailed as SingleGroupFilter}
            tableName={table.name}
            onSetError={console.error}
            onChange={(forcedFilterDetailed) => {
              onChange({
                ...rule,
                forcedFilterDetailed,
              });
            }}
          />
          {/* 
      <ForcedDataControl 
        info={
          <div className="flex-col gap-1">
            <div>Data added to each update. These fields cannot be updated by the user</div>
          </div>
        }
        table={table}
        prgl={prgl} 
        tableRules={tableRules} 
        contextData={contextDataSchema}
        forcedDataDetail={rule.forcedDataDetail}
        onChange={forcedDataDetail => onChange({ ...rule, forcedDataDetail })}
      /> */}

          <FilterControl
            label="Check"
            mode="checkFilter"
            info={
              <div className="flex-col gap-1">
                <div>New records must satisfy a condition</div>
              </div>
            }
            db={prgl.db}
            methods={prgl.methods}
            tables={prgl.tables}
            contextData={contextDataSchema}
            detailedFilter={rule.checkFilterDetailed as SingleGroupFilter}
            tableName={table.name}
            onSetError={console.error}
            onChange={(checkFilterDetailed) => {
              onChange({
                ...rule,
                checkFilterDetailed,
              });
            }}
          />

          <DynamicFields
            {...props}
            contextDataSchema={contextDataSchema}
            contextData={contextData}
          />
          <RuleExpandSection>
            <ExampleComparablePolicy
              command="UPDATE"
              rule={rule}
              table={table}
              userTypes={userTypes}
              prgl={prgl}
            />
          </RuleExpandSection>
        </>
      )}
      <ErrorComponent error={error} />
    </div>
  );
};

export const getUpdateRuleError = ({
  rule: rawRule,
  table,
  tableRules,
}: Pick<P, "rule" | "table" | "tableRules">): string | undefined => {
  const rule: UpdateRule = isObject(rawRule) ? rawRule : { fields: "*" };

  let error =
    isObject(rule.fields) && !getKeys(rule.fields).length ?
      "Must select at least one field"
    : undefined;

  if (!error) {
    const pkeyCols = table.columns.filter((c) => c.is_pkey).map((c) => c.name);
    const notAllPkeysSelected =
      pkeyCols.length &&
      (!tableRules.select ||
        (isObject(tableRules.select) &&
          tableRules.select.fields !== "*" &&
          parseFieldFilter({
            columns: pkeyCols,
            fieldFilter: tableRules.select.fields,
          }).length !== pkeyCols.length));

    if (notAllPkeysSelected) {
      error = `Primary key fields must be allowed in Select to allow Update through the dashboard. Primary key fields: ${pkeyCols}`;
    } else {
      const err = `Filter fields must be allowed in Select to allow Update through the dashboard`;
      if (
        !tableRules.select ||
        (isObject(tableRules.select) &&
          tableRules.select.fields !== "*" &&
          tableRules.select.filterFields !== "*")
      ) {
        if (tableRules.select && isObject(tableRules.select)) {
          const columns = table.columns.map((c) => c.name);
          const selectFields = parseFieldFilter({
            columns,
            fieldFilter: tableRules.select.fields,
          });
          const selectFilterFields = parseFieldFilter({
            columns,
            fieldFilter: tableRules.select.filterFields ?? "*",
          });
          const noFilterFields = !selectFilterFields.filter((f) =>
            selectFields.includes(f),
          ).length;
          if (noFilterFields) {
            error = err;
          }
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (!tableRules.select) {
          error = err;
        }
      }
    }
  }

  return error;
};
