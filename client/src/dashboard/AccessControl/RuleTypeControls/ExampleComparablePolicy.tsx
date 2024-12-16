import { mdiShieldLockOutline } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import type {
  DeleteRule,
  InsertRule,
  SelectRule,
  UpdateRule,
} from "../../../../../commonTypes/publishUtils";
import { FlexCol } from "../../../components/Flex";
import { Label } from "../../../components/Label";
import CodeExample from "../../CodeExample";
import type { SelectRuleControlProps } from "./SelectRuleControl";
import { getComparablePGPolicy } from "./getComparablePGPolicy";

type P = Pick<SelectRuleControlProps, "table" | "userTypes" | "prgl"> &
  (
    | {
        rule: SelectRule;
        command: "SELECT";
      }
    | {
        rule: InsertRule;
        command: "INSERT";
      }
    | {
        rule: UpdateRule;
        command: "UPDATE";
      }
    | {
        rule: DeleteRule;
        command: "DELETE";
      }
  ) & {
    excludeRLSStatement?: boolean;
  };

export const ExampleComparablePolicy = (p: P) => {
  const policy = usePromise(
    async () =>
      getComparablePGPolicy({
        forcedFilterDetailed: undefined,
        checkFilterDetailed: undefined,
        forcedDataDetail: undefined,
        ...p.rule,
        ...p,
      }),
    [p],
  );

  return (
    <FlexCol>
      <Label
        iconPath={mdiShieldLockOutline}
        label={"Comparable postgres policy"}
        info={
          "Policy that may be used in postgres to replicate some of these rules"
        }
        popupTitle={"Comparable postgres policy"}
      />
      {policy && (
        <FlexCol className="gap-p5 ml-3 p-1">
          <div className="text-2 ai-start">
            Policy that may be used in postgres to replicate some of the rules
            above
          </div>
          <CodeExample
            language="sql"
            style={{ minWidth: "500px", minHeight: "200px" }}
            value={policy}
          />
        </FlexCol>
      )}
    </FlexCol>
  );
};

// const getComparableSelectPolicy = async (rule: SelectRule, table: P["table"], userTypes: string[], prgl: Prgl) => {
//   let query = "";
//   let viewName = "";
//   if(rule.fields !== "*"){
//     viewName = table.name + "_view";
//     query += [
//       `/** Comparable postgres view to limite select fields */`,
//       `CREATE VIEW ${JSON.stringify(viewName)} AS`,
//       `SELECT ${parseFieldFilter({
//         fieldFilter: rule.fields,
//         columns: table.columns.map(c => c.name)
//       }).join(", ")}`,
//       `FROM ${JSON.stringify(table.name)};`,
//       `ALTER TABLE ${JSON.stringify(viewName)}`,
//       `ENABLE ROW LEVEL SECURITY;`,
//       `\n\n`
//     ].join("\n");
//   }

//   query += (await getPGPolicy({
//     table: viewName? {
//       ...table,
//       name: viewName
//     } : table,
//     action: "SELECT",
//     forcedFilterDetailed: rule.forcedFilterDetailed,
//     userTypes,
//     prgl,
//   }));

//   return query;
// }
