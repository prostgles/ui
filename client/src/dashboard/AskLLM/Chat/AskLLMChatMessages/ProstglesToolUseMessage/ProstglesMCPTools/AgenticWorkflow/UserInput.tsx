import { getTableFilterFromDetailedGroupFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import { Select, type FullOption } from "@components/Select/Select";
import { mdiChevronDown, mdiChevronUp } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { getProperty } from "prostgles-types";
import React, { useState } from "react";
import { RenderFilter } from "src/dashboard/RenderFilter";
import type { useUserInput } from "./hooks/useUserInput";
import { UserInputColumnValues } from "./UserInputColumnValues";

export const UserInput = ({
  setUserInputValue,
  userInputValue,
  userInput,
  localFilter,
  setLocalFilter,
}: ReturnType<typeof useUserInput>) => {
  const { tables } = usePrgl();
  const [show, setShow] = useState(true);
  if (!userInput) return null;
  return (
    <>
      <FullscreenWrapper
        className="bt b-color bg-color-2 w-full ta-start rounded-unset"
        maxContentHeight={300}
        title={
          <Btn
            size="small"
            title="Toggle"
            iconPosition="right"
            iconPath={show ? mdiChevronDown : mdiChevronUp}
            onClick={() => setShow(!show)}
          >
            Inputs
          </Btn>
        }
      >
        {show && (
          <FlexRowWrap className="p-1 o-auto">
            {Object.entries(userInput).map(([inputKey, inputItem]) => {
              const currentValue =
                userInputValue?.[inputKey] ?? inputItem.defaultValue;
              const title =
                (inputItem.title || inputKey) +
                (inputItem.optional ? " (optional)" : "");
              if (inputItem.type === "enum") {
                return (
                  <FormField
                    key={inputKey}
                    optional={inputItem.optional}
                    value={(currentValue as string) || ""}
                    labelStyle={{ lineHeight: "1em", fontWeight: "normal" }}
                    label={title}
                    title={title}
                    data-key={inputKey}
                    type={"text"}
                    options={inputItem.values}
                    onChange={(newValue) => {
                      setUserInputValue((prev) => ({
                        ...prev,
                        [inputKey]: newValue,
                      }));
                    }}
                  />
                );
              }
              if (inputItem.type === "custom") {
                return (
                  <FormField
                    key={inputKey}
                    value={currentValue}
                    labelStyle={{ lineHeight: "1em", fontWeight: "normal" }}
                    label={title}
                    optional={inputItem.optional}
                    title={title}
                    data-key={inputKey}
                    type={getProperty(
                      InputDataTypeToFormFieldTypeMap,
                      inputItem.dataType,
                    )}
                    onChange={(newValueRaw: unknown) => {
                      const newValue =
                        inputItem.dataType === "boolean" ? Boolean(newValueRaw)
                        : inputItem.dataType === "number" ? Number(newValueRaw)
                        : inputItem.dataType === "Date" ?
                          new Date(String(newValueRaw)).toISOString()
                        : String(newValueRaw);
                      setUserInputValue((prev) => ({
                        ...prev,
                        [inputKey]: newValue,
                      }));
                    }}
                  />
                );
              }
              if (inputItem.type === "table-filter") {
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
                    mode={{
                      children: "Edit filters",
                      variant: "faded",
                      label: {
                        label: title,
                        variant: "normal",
                        className: "mb-p25",
                      },
                    }}
                    filter={detailedFilter}
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
                    optional={inputItem.optional}
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
                const table = tables.find(
                  (t) => t.name === inputItem.tableName,
                );
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
                    optional={inputItem.optional}
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
                    optional={inputItem.optional}
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

              if (
                inputItem.type === "table-column-value" ||
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                inputItem.type === "table-column-values"
              ) {
                return (
                  <UserInputColumnValues
                    key={inputKey}
                    type={inputItem.type}
                    title={title}
                    inputValue={currentValue}
                    tableName={inputItem.tableName}
                    columnName={inputItem.columnName}
                    optional={inputItem.optional}
                    inputKey={inputKey}
                    onChange={(newValue) => {
                      setUserInputValue((prev) => ({
                        ...prev,
                        [inputKey]: newValue,
                      }));
                    }}
                  />
                );
              }

              return (
                <div key={inputKey}>
                  Unsupported input type: {(inputItem as any).type}
                </div>
              );
            })}
          </FlexRowWrap>
        )}
      </FullscreenWrapper>
    </>
  );
};

const InputDataTypeToFormFieldTypeMap = {
  string: "text",
  boolean: "checkbox",
  Date: "date",
} as const;
