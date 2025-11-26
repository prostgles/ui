import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { SearchList } from "@components/SearchList/SearchList";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { _PG_date } from "prostgles-types";
import React, { useEffect } from "react";
import type { Prgl } from "src/App";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import type { ColumnConfig } from "../ColumnMenu";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";

export type FuncArgs = NonNullable<
  Required<ColumnConfig>["computedConfig"]["args"]
>;

type P = {
  argName: keyof FuncArgs;
  args: FuncArgs | undefined;
  onChange: (newArgs: FuncArgs) => void;
  db: Prgl["db"];
  columnName: string | undefined;
  table: DBSchemaTableWJoins;
};
export const FunctionExtraArguments = ({
  argName,
  args,
  db,
  table,
  onChange,
  columnName,
}: P) => {
  const tableHandler = db[table.name];

  useEffect(() => {
    if (argName === "$string_agg" && !args?.$string_agg) {
      onChange({
        $string_agg: { separator: ", " },
      });
    }
  }, [argName, args, tableHandler, onChange]);

  const { $template_string } = args ?? {};
  const templateStringInfo = usePromise(async () => {
    let template_string_error: any = undefined;
    let template_string_hint: string | undefined = undefined;
    if (!$template_string) {
      // No value yet
    } else if (!$template_string.includes("{")) {
      template_string_error =
        "Template string must include at least one column in curly braces, e.g. {FirstName}";
    } else if (tableHandler && tableHandler.find) {
      try {
        template_string_hint = (await tableHandler.find(
          {},
          {
            returnType: "value",
            limit: 1,
            select: {
              val: { $template_string: [$template_string] },
            },
          },
        )) as unknown as string;
      } catch (error) {
        template_string_error = error;
      }
    }
    return { template_string_hint, template_string_error };
  }, [$template_string, tableHandler]);

  if (argName === "$template_string") {
    return (
      <>
        <FormFieldDebounced
          value={args?.$template_string ?? ""}
          label="Template string"
          hint={
            templateStringInfo?.template_string_hint ??
            "Use column names. E.g.: Dear {FirstName} {LastName}"
          }
          inputProps={{ autoFocus: true }}
          error={templateStringInfo?.template_string_error}
          onChange={($template_string: string) => {
            onChange({ $template_string });
          }}
        />
        <div className="flex-row-wrap">
          {table.columns.map((c, i) => (
            <div key={i} className="p-p25">{`{${c.name}}`}</div>
          ))}
        </div>
      </>
    );
  }

  if (argName === "$duration") {
    return args?.$duration?.otherColumn ?
        <FlexCol className="gap-p5 mt-1">
          <label className="noselect f-0 text-1p5 ta-left">Compare to</label>
          <Btn
            variant="filled"
            style={{
              backgroundColor: "rgb(0, 183, 255)",
            }}
            onClick={() => {
              onChange({});
            }}
          >
            {args.$duration.otherColumn}
          </Btn>
        </FlexCol>
      : <SearchList
          id="duration_othercolumn"
          label="Compare to column"
          items={table.columns
            .filter(
              (c) =>
                c.name !== columnName && _PG_date.some((v) => v === c.udt_name),
            )
            .map((c) => ({
              key: c.name,
              label: c.label,
              onPress: () => {
                onChange({
                  $duration: { otherColumn: c.name },
                });
              },
            }))}
        />;
  }

  return (
    <FormField
      label="Separator"
      hint="Defaults to ', '"
      value={args?.$string_agg?.separator}
      onChange={(separator) => onChange({ $string_agg: { separator } })}
    />
  );
};
