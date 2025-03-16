import { mdiClose } from "@mdi/js";
import { useIsMounted } from "prostgles-client/dist/prostgles";
import { isDefined, isObject, type ValidatedColumnInfo } from "prostgles-types";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Btn from "../../../components/Btn";
import FileInput from "../../../components/FileInput/FileInput";
import { FlexRow } from "../../../components/Flex";
import Select, { type FullOption } from "../../../components/Select/Select";
import type { ColumnData } from "../SmartForm";
import { renderNull } from "./RenderValue";
import type { SmartColumnInfo, SmartFormFieldProps } from "./SmartFormField";
import { type SmartFormFieldLinkedDataInsertState } from "./SmartFormFieldLinkedData";
import { fetchForeignKeyOptions } from "./fetchForeignKeyOptions";
import { sliceText } from "../../../../../commonTypes/utils";

export type SmartFormFieldForeignKeyProps = Pick<
  SmartFormFieldProps,
  "value" | "db" | "tables" | "row" | "tableName" | "tableInfo"
> &
  SmartFormFieldLinkedDataInsertState & {
    column: SmartColumnInfo & {
      references: NonNullable<ValidatedColumnInfo["references"]>;
    };
    onChange: (newValue: ColumnData) => Promise<void> | void;
    readOnly: boolean;
    newValue: ColumnData | undefined;
  };

export const SmartFormFieldForeignKey = ({
  column,
  db,
  onChange,
  tables,
  tableName,
  value,
  row,
  readOnly,
  newValue,
  tableInfo,
  setShowNestedInsertForm,
}: SmartFormFieldForeignKeyProps) => {
  const [fullOptions, setFullOptions] = useState<FullOption[]>();
  const getuseIsMounted = useIsMounted();
  const onSearchOptions = useCallback(
    async (term: string) => {
      const options = await fetchForeignKeyOptions({
        column,
        db,
        tableName,
        tables,
        row,
        term,
      });
      if (!getuseIsMounted()) return;
      setFullOptions(options);
    },
    [column, db, tableName, tables, row, getuseIsMounted],
  );

  useEffect(() => {
    onSearchOptions("");
  }, [value, onSearchOptions]);

  const valueStyle = {
    fontSize: "16px",
    fontWeight: 500,
    paddingLeft: "6px 0",
  };

  const selectedOption = fullOptions?.find((o) => o.key === value);
  const valueNode = (
    <div className="text-ellipsis max-w-fit" style={valueStyle}>
      {renderNull(value, {}, true) ?? (value as string)}
    </div>
  );

  const paddingValue = isDefined(selectedOption?.subLabel) ? "6px" : "12px";
  const displayValue = (
    <div
      className={"flex-col gap-p5 min-w-0"}
      style={{
        padding: readOnly ? `${paddingValue} 0` : paddingValue,
        // border: "1px solid var(--b-default)"
      }}
    >
      {valueNode}
      {isDefined(selectedOption?.subLabel) && (
        <div
          className="SmartFormFieldForeignKey.subLabel ta-left text-ellipsis"
          style={{
            opacity: 0.75,
            fontSize: "14px",
            fontWeight: "normal",
            maxWidth: "300px",
          }}
        >
          {selectedOption.subLabel}
        </div>
      )}
    </div>
  );

  if (readOnly) {
    return displayValue;
  }

  const referencedInsertData =
    newValue?.type === "nested-column" ? newValue.value : undefined;

  if (referencedInsertData) {
    if (column.file) {
      const media =
        newValue?.type === "nested-file-column" && newValue.value ?
          [newValue.value]
        : [];
      return (
        <FileInput
          className={"mt-p5 f-0 " + (tableInfo.isFileTable ? "mt-2" : "")}
          label={column.label}
          media={media}
          minSize={470}
          maxFileCount={1}
          onAdd={([value]) => {
            onChange({
              type: "nested-file-column",
              value,
            });
          }}
          onDelete={async (mediaItem) => {
            onChange({
              type: "nested-file-column",
              value: undefined,
            });
          }}
        />
      );
    }

    const newDataText = sliceText(
      Object.entries(referencedInsertData)
        .map(([k, v]) =>
          isObject(v) ? `{ ${k} }`
          : Array.isArray(v) ? `[{ ${k} }]`
          : v?.toString(),
        )
        .join(", "),
      60,
    );

    return (
      <FlexRow className="gap-0">
        <Btn
          className=" bg-color-0"
          color="action"
          title="View insert data"
          onClick={() => {
            setShowNestedInsertForm(true);
          }}
        >
          {newDataText}
        </Btn>
        <Btn
          title="Remove nested insert"
          iconPath={mdiClose}
          onClick={() => {
            onChange({ type: "nested-column", value: undefined });
          }}
        />
      </FlexRow>
    );
  }

  return (
    <Select
      className="SmartFormFieldForeignKey FormField_Select noselect bg-color-0"
      variant="div"
      fullOptions={fullOptions ?? []}
      onSearch={onSearchOptions}
      onChange={(newVal) => onChange({ type: "column", value: newVal })}
      value={value}
      labelAsValue={true}
      btnProps={{
        children: displayValue,
        style: {
          padding: "0",
          justifyContent: "space-between",
          flex: 1,
        },
      }}
    />
  );
};
