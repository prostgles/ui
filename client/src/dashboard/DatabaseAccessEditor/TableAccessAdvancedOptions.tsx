import { isObject } from "@common/publishUtils";
import { useAlert } from "@components/AlertProvider";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { mdiTextBoxSearchOutline } from "@mdi/js";
import React, { useMemo } from "react";
import { FieldFilterControl } from "../AccessControl/OptionControllers/FieldFilterControl";
import {
  FilterControl,
  type SingleGroupFilter,
} from "../AccessControl/OptionControllers/FilterControl";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type {
  TableAccessPermissions,
  TableRuleType,
} from "./TableAccessEditor";

type P = {
  ruleType: TableRuleType;
  tableRules: TableAccessPermissions;
  table: DBSchemaTableWJoins;
  onChange: (newRule: TableAccessPermissions) => void;
};
export const TableAccessAdvancedOptions = ({
  ruleType,
  tableRules,
  table,
  onChange,
}: P) => {
  const ruleValue = tableRules[ruleType];
  const { addAlert } = useAlert();

  const fieldsOptions = useMemo(() => {
    if (ruleType === "delete") {
      return null;
    }
    const ruleValue = tableRules[ruleType];
    const fields =
      ruleValue === true ? ("*" as const) : (ruleValue?.fields ?? "*");

    const selectedColumns = table.columns
      .map((c) => c.name)
      .filter((c) => {
        if (fields === "*") return true;
        if (Object.values(fields)[0] === 0) {
          return !(c in fields);
        }
        return c in fields;
      });
    return {
      fields,
      ruleValue,
      selectedColumns,
    };
  }, [ruleType, table.columns, tableRules]);

  const filterOptions = useMemo(() => {
    if (ruleType === "insert") {
      return null;
    }
    const ruleValue = tableRules[ruleType];
    const forcedFilter =
      isObject(ruleValue) ? ruleValue.forcedFilter : undefined;
    return {
      forcedFilter,
      ruleValue,
    };
  }, [ruleType, tableRules]);

  return (
    <>
      {fieldsOptions && (
        <FieldFilterControl
          iconPath={mdiTextBoxSearchOutline}
          title={"Columns"}
          label={"Can " + ruleType}
          info={
            <FlexCol>
              <div>Columns available for {ruleType}</div>
            </FlexCol>
          }
          operator="int"
          columns={table.columns}
          value={fieldsOptions.fields}
          onChange={(fields) => {
            onChange({
              ...tableRules,
              [ruleType]: {
                ...(ruleValue !== true ? ruleValue : {}),
                fields,
              },
            });
          }}
        />
      )}
      {filterOptions && (
        <FilterControl
          label="From"
          selectedColumns={fieldsOptions?.selectedColumns}
          onSetError={(error) => {
            if (!error) return;
            addAlert({
              children: <ErrorComponent error={error} findMsg={true} />,
            });
          }}
          title="Filter"
          info={
            <FlexCol>
              <div>Filter applied to all queries on this table</div>
            </FlexCol>
          }
          detailedFilter={filterOptions.forcedFilter}
          tableName={table.name}
          contextData={[]}
          onChange={(forcedFilterDetailed) => {
            onChange({
              ...tableRules,
              [ruleType]: {
                ...(ruleValue !== true ? ruleValue : {}),
                forcedFilter: forcedFilterDetailed,
              },
            });
          }}
        />
      )}
    </>
  );
};
