import { getKeys, isObject } from "prostgles-types";
import React from "react";
import ErrorComponent from "../../../components/ErrorComponent";

import type {
  DeleteRule,
  TableRules,
} from "../../../../../commonTypes/publishUtils";
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
  "prgl" | "table" | "userTypes"
> & {
  rule: TableRules["delete"];
  onChange: (rule: DeleteRule | undefined) => void;
  contextDataSchema: ContextDataSchema;
};

export const DeleteRuleControl = ({
  rule: rawRule,
  onChange,
  table,
  prgl,
  contextDataSchema: contextData,
  userTypes,
}: P) => {
  const rule: DeleteRule | undefined =
    rawRule === true ? { filterFields: "*" }
    : isObject(rawRule) ? rawRule
    : undefined;
  const error =
    rule && isObject(rule.filterFields) && !getKeys(rule.filterFields).length ?
      "Must select at least one field"
    : undefined;

  return (
    <div className="flex-col gap-2">
      <RuleToggle
        checked={!!rule}
        onChange={(v) => {
          onChange(v ? { filterFields: "*" } : undefined);
        }}
      />
      {rule && (
        <>
          <FilterControl
            title={"DELETE required condition"}
            label="Records from"
            info={
              <div className="flex-col gap-1">
                <div>
                  If specified, a filter is added to each delete to ensure no
                  other records can be deleted
                </div>
              </div>
            }
            db={prgl.db}
            methods={prgl.methods}
            tables={prgl.tables}
            contextData={contextData}
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
          <RuleExpandSection>
            <FieldFilterControl
              title={"DELETE filter fields"}
              label="Can filter by"
              info={"Fields that can be used in the delete filter"}
              columns={table.columns}
              value={rule.filterFields}
              onChange={(filterFields) => {
                onChange({ ...rule, filterFields });
              }}
            />
            <ExampleComparablePolicy
              command="DELETE"
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
