import { getTableFilterFromDetailedGroupFilter } from "@common/filterUtils";
import { FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { Select, type FullOption } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { getProperty } from "prostgles-types";
import React from "react";
import type { SingleGroupFilter } from "src/dashboard/AccessControl/OptionControllers/FilterControl";
import { RenderFilter } from "src/dashboard/RenderFilter";
import type { useValidatedWorkflowJson } from "./useValidatedWorkflowJson";

export const LoadSuggestedWorkflowUserInput = ({
  validatedWorkflowJson,
  setUserInputValue,
  userInputValue,
}: {
  validatedWorkflowJson: ReturnType<typeof useValidatedWorkflowJson>;
  userInputValue: Record<string, unknown>;
  setUserInputValue: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
}) => {
  const { db, tables } = usePrgl();

  const [localFilter, setLocalFilter] = React.useState<
    Record<string, SingleGroupFilter>
  >({});

  const validatedWorkflow =
    validatedWorkflowJson?.result?.isValid ?
      validatedWorkflowJson.result
    : undefined;
  const userInput = validatedWorkflow?.userInput;
  return (
    <>
      {userInput && (
        <FlexRowWrap>
          {Object.entries(userInput).map(([inputKey, inputItem]) => {
            const currentValue = userInputValue[inputKey];
            const title =
              (inputItem.title || inputKey) +
              (inputItem.optional ? " (optional)" : "");
            if (inputItem.type === "custom") {
              return (
                <FormField
                  key={inputKey}
                  value={currentValue}
                  labelStyle={{ lineHeight: "1em" }}
                  label={title}
                  title={title}
                  data-key={inputKey}
                  type={getProperty(
                    InputDataTypeToFormFieldTypeMap,
                    inputItem.dataType,
                  )}
                  onChange={(newValue) =>
                    setUserInputValue((prev) => ({
                      ...prev,
                      [inputKey]: newValue,
                    }))
                  }
                />
              );
            }
            if (inputItem.type === "table-filter") {
              // const detailedFilter = getDetailedGroupFilterFromTableFilter(
              //   currentValue || {},
              // );
              const detailedFilter = localFilter[inputKey];
              return (
                <RenderFilter
                  key={inputKey}
                  title={title}
                  data-key={inputKey}
                  tableName={inputItem.tableName}
                  selectedColumns={undefined}
                  itemName={"filter"}
                  contextData={[]}
                  db={db}
                  mode={{
                    children: "Edit filters",
                    variant: "faded",
                    label: { label: title, variant: "normal" },
                  }}
                  filter={detailedFilter}
                  tables={tables}
                  onChange={(newValue) => {
                    setLocalFilter((prev) => ({
                      ...prev,
                      [inputKey]: newValue,
                    }));
                    const newFilter =
                      getTableFilterFromDetailedGroupFilter(newValue);
                    setUserInputValue((prev) => ({
                      ...prev,
                      [inputKey]: newFilter,
                    }));
                  }}
                />
              );
            }

            if (inputItem.type === "table-name") {
              return (
                <Select
                  key={inputKey}
                  label={title}
                  title={title}
                  data-key={inputKey}
                  options={tables.map((t) => t.name)}
                  value={currentValue}
                  onChange={(newValue) =>
                    setUserInputValue((prev) => ({
                      ...prev,
                      [inputKey]: newValue,
                    }))
                  }
                />
              );
            }

            if (inputItem.type === "table-column") {
              const table = tables.find((t) => t.name === inputItem.tableName);
              if (!table) {
                return (
                  <div key={inputKey}>
                    Table {inputItem.tableName} not found
                  </div>
                );
              }
              return (
                <Select
                  key={inputKey}
                  label={title}
                  title={title}
                  data-key={inputKey}
                  options={table.columns.map((c) => c.name)}
                  value={currentValue}
                  onChange={(newValue) =>
                    setUserInputValue((prev) => ({
                      ...prev,
                      [inputKey]: newValue,
                    }))
                  }
                />
              );
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (inputItem.type === "table-and-column") {
              const separator = "&^%.";
              const fullOptions = tables.flatMap((t) =>
                t.columns.map(
                  (c) =>
                    ({
                      key: [t.name, c.name].join(separator),
                      label: `${t.name}.${c.name}`,
                    }) satisfies FullOption,
                ),
              );
              return (
                <Select
                  key={inputKey}
                  label={title}
                  title={title}
                  data-key={inputKey}
                  fullOptions={fullOptions}
                  value={
                    currentValue ?
                      [
                        getProperty(currentValue, "tableName"),
                        getProperty(currentValue, "columnName"),
                      ].join(separator)
                    : undefined
                  }
                  onChange={(newValue) => {
                    const [tableName, columnName] = newValue.split(separator);
                    setUserInputValue((prev) => ({
                      ...prev,
                      [inputKey]: { tableName, columnName },
                    }));
                  }}
                />
              );
            }

            return (
              <div key={inputKey}>Unsupported input type: {inputItem.type}</div>
            );
          })}
        </FlexRowWrap>
      )}
    </>
  );
};

const InputDataTypeToFormFieldTypeMap = {
  string: "text",
  boolean: "checkbox",
  Date: "date",
} as const;
