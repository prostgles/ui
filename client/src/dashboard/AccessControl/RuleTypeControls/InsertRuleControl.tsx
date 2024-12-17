import { mdiFileDocumentPlusOutline } from "@mdi/js";
import { isObject } from "prostgles-types";
import React from "react";
import type {
  InsertRule,
  TableRules,
} from "../../../../../commonTypes/publishUtils";
import ErrorComponent from "../../../components/ErrorComponent";
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
  rule: TableRules["insert"];
  onChange: (rule: InsertRule | undefined) => void;
  contextDataSchema: ContextDataSchema;
};

export const InsertRuleControl = ({
  rule: rawRule,
  onChange,
  table,
  prgl,
  tableRules,
  contextDataSchema: contextData,
  userTypes,
}: P) => {
  const rule: InsertRule | undefined =
    rawRule === true ? { fields: "*" }
    : isObject(rawRule) ? rawRule
    : undefined;
  const error = null;

  return (
    <div className="flex-col gap-2">
      <RuleToggle
        checked={!!rule}
        onChange={(v) => {
          onChange(v ? { fields: "*" } : undefined);
        }}
      />
      {rule && (
        <>
          <FieldFilterControl
            iconPath={mdiFileDocumentPlusOutline}
            label="Fields"
            title="INSERT fields"
            info={
              "Fields that can be used in inserting data. \nCannot insert fields that are found in the forced data rule"
            }
            columns={table.columns}
            excluded={{
              fields: rule.forcedDataDetail?.map((fd) => fd.fieldName),
              message: "Cannot insert a field that has forced data",
            }}
            value={rule.fields}
            onChange={(fields) => {
              onChange({ ...rule, fields });
            }}
          />

          {/* <ForcedDataControl
        title="INSERT forced data"
        info={<div className="flex-col gap-1">
          <div>Data added to each insert. These fields cannot be inserted by the user</div>
        </div>}
        table={table}
        prgl={prgl}
        tableRules={tableRules}
        contextData={contextData}
        forcedDataDetail={rule.forcedDataDetail}
        onChange={forcedDataDetail => {
          onChange({ ...rule, forcedDataDetail, })
        }}
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
            contextData={contextData}
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
          <RuleExpandSection>
            <ExampleComparablePolicy
              command="INSERT"
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
