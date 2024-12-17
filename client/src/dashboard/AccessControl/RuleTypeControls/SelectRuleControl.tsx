import {
  mdiDotsHorizontal,
  mdiFilter,
  mdiSortReverseVariant,
  mdiTextBoxSearchOutline,
} from "@mdi/js";
import { getKeys, isObject } from "prostgles-types";
import React, { useState } from "react";
import ErrorComponent from "../../../components/ErrorComponent";

import type {
  SelectRule,
  TableRules,
} from "../../../../../commonTypes/publishUtils";
import { ExpandSection } from "../../../components/ExpandSection";
import { FlexCol } from "../../../components/Flex";
import { FieldFilterControl } from "../OptionControllers/FieldFilterControl";
import type {
  ContextDataSchema,
  SingleGroupFilter,
} from "../OptionControllers/FilterControl";
import { FilterControl } from "../OptionControllers/FilterControl";
import type { TablePermissionControlsProps } from "../TableRules/TablePermissionControls";
import { ExampleComparablePolicy } from "./ExampleComparablePolicy";
import { RuleToggle } from "./RuleToggle";
import { SwitchToggle } from "../../../components/SwitchToggle";

export type SelectRuleControlProps = Pick<
  Required<TablePermissionControlsProps>,
  "prgl" | "table"
> & {
  tableRules: TableRules;
  onChange: (rule: SelectRule | undefined) => void;
  contextDataSchema: ContextDataSchema;
  userTypes: string[];
};

export const SelectRuleControl = ({
  tableRules,
  onChange,
  table,
  prgl,
  contextDataSchema: contextData,
  userTypes,
}: SelectRuleControlProps) => {
  const { db, methods: dbMethods, tables } = prgl;
  const rawRule = tableRules["select"];
  const rule: SelectRule | undefined =
    rawRule === true ? { fields: "*", subscribe: {} }
    : isObject(rawRule) ? rawRule
    : undefined;
  const [filterErr, setFilterError] = useState<string | undefined>();
  const error = getSelectRuleError({ table, tableRules, prgl }) ?? filterErr;

  return (
    <FlexCol className="gap-2">
      <RuleToggle
        checked={!!rule}
        onChange={(v) => {
          onChange(v ? { fields: "*" } : undefined);
        }}
      />
      {rule && (
        <FlexCol className="gap-2">
          <SwitchToggle
            label={{ label: "Allow subscribe", variant: "header" }}
            checked={!!rule.subscribe}
            onChange={(allowSubscribe) => {
              onChange({ ...rule, subscribe: allowSubscribe ? {} : undefined });
            }}
          />
          <FieldFilterControl
            iconPath={mdiTextBoxSearchOutline}
            title="SELECT fields"
            label="Can view/select"
            info={
              <div className="flex-col gap-1">
                <div>List of fields that can be viewed/selected</div>
              </div>
            }
            columns={table.columns}
            value={rule.fields}
            onChange={(fields) => {
              onChange({ ...rule, fields });
            }}
          />
          <FilterControl
            label="From"
            onSetError={setFilterError}
            title="SELECT filter"
            info={
              <FlexCol>
                <div>
                  Filter used in each select to ensure other records cannot be
                  viewed
                </div>
              </FlexCol>
            }
            db={db}
            methods={dbMethods}
            tables={tables}
            detailedFilter={rule.forcedFilterDetailed as SingleGroupFilter}
            tableName={table.name}
            contextData={contextData}
            onChange={(forcedFilterDetailed) => {
              onChange({
                ...rule,
                forcedFilterDetailed,
              });
            }}
          />
          <RuleExpandSection
            expanded={!!(rule.orderByFields || rule.filterFields)}
          >
            <>
              <FieldFilterControl
                title="SELECT order by fields"
                label="Can order by"
                info="List of fields allowed to be used in the ORDER BY"
                expectAtLeastOne={false}
                iconPath={mdiSortReverseVariant}
                columns={table.columns}
                value={rule.orderByFields ?? rule.fields}
                onChange={(orderByFields) => {
                  onChange({ ...rule, orderByFields });
                }}
              />
              <FieldFilterControl
                iconPath={mdiFilter}
                title="SELECT filter by fields"
                label="Can filter by"
                info="List of fields allowed to be used in the filter condition"
                expectAtLeastOne={false}
                columns={table.columns}
                value={rule.filterFields ?? rule.fields}
                onChange={(filterFields) => {
                  onChange({ ...rule, filterFields });
                }}
              />
              <ExampleComparablePolicy
                command="SELECT"
                rule={rule}
                table={table}
                userTypes={userTypes}
                prgl={prgl}
              />
            </>
          </RuleExpandSection>
          <ErrorComponent error={error} />
        </FlexCol>
      )}
    </FlexCol>
  );
};

export const getSelectRuleError = ({
  tableRules,
}: Pick<SelectRuleControlProps, "table" | "prgl" | "tableRules">):
  | string
  | undefined => {
  if (tableRules.select) {
    const rule = tableRules.select;
    if (
      isObject(rule) &&
      isObject(rule.fields) &&
      !getKeys(rule.fields).length
    ) {
      return "Must select at least one field";
    }
  }

  return undefined;
};

export const RuleExpandSection = ({
  children,
  expanded,
}: {
  children: React.ReactNode;
  expanded?: boolean;
}) => {
  return (
    <ExpandSection
      buttonProps={{
        className: "ml-p5",
        style: { opacity: 0.75 },
        children: <div className="ml-1">More options</div>,
      }}
      iconPath={mdiDotsHorizontal}
      expanded={expanded}
    >
      {children}
    </ExpandSection>
  );
};
