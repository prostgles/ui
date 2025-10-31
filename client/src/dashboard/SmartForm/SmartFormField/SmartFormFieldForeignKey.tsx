import { mdiClose } from "@mdi/js";
import { useIsMounted, useMemoDeep } from "prostgles-client/dist/prostgles";
import {
  isDefined,
  isObject,
  pickKeys,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { FileInput } from "@components/FileInput/FileInput";
import { FlexRow, FlexRowWrap } from "@components/Flex";
import Select, { type FullOption } from "@components/Select/Select";
import {
  type ColumnData,
  NewRowDataHandler,
} from "../SmartFormNewRowDataHandler";
import { RenderValue } from "./RenderValue";
import type { SmartColumnInfo, SmartFormFieldProps } from "./SmartFormField";
import { type SmartFormFieldLinkedDataInsertState } from "./SmartFormFieldLinkedData";
import { fetchForeignKeyOptions } from "./fetchForeignKeyOptions";

export type SmartFormFieldForeignKeyProps = Pick<
  SmartFormFieldProps,
  "value" | "db" | "tables" | "row" | "table"
> &
  SmartFormFieldLinkedDataInsertState & {
    column: SmartColumnInfo & {
      references: NonNullable<ValidatedColumnInfo["references"]>;
    };
    onChange: (newValue: ColumnData) => Promise<void> | void;
    readOnly: boolean;
    newRowDataHandler: NewRowDataHandler;
  };

export const SmartFormFieldForeignKey = (
  props: SmartFormFieldForeignKeyProps,
) => {
  const {
    column,
    db,
    onChange,
    tables,
    value,
    row,
    readOnly,
    newRowDataHandler,
    table,
    setShowNestedInsertForm,
  } = props;

  const [fullOptions, setFullOptions] = useState<FullOption[]>();
  const getuseIsMounted = useIsMounted();
  const newValue = newRowDataHandler.getNewRow()[column.name];

  const rowWithFkeyVals = useMemo(() => {
    if (!row) return;
    const fkeyColNames = column.references.flatMap((r) => r.cols);
    return pickKeys(row, fkeyColNames);
  }, [row, column]);

  const rowWithFkeyValsMemo = useMemoDeep(
    () => rowWithFkeyVals,
    [rowWithFkeyVals],
  );
  const onSearchOptions = useCallback(
    async (term: string) => {
      const options = await fetchForeignKeyOptions({
        column,
        db,
        table,
        tables,
        row: rowWithFkeyValsMemo,
        term,
      });
      if (!getuseIsMounted()) return;
      setFullOptions(options);
    },
    [column, db, table, tables, rowWithFkeyValsMemo, getuseIsMounted],
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

  const paddingValue = 0;
  const isNullOrEmpty = value === null || value === undefined;
  const displayValue = (
    <FlexRowWrap
      className={"gap-p5 min-w-0"}
      style={{
        /** Empty values too tall */
        padding: isNullOrEmpty && !readOnly ? 0 : `${paddingValue} 0`,
      }}
    >
      {selectedOption?.leftContent}
      <div className="text-ellipsis max-w-fit" style={valueStyle}>
        <RenderValue
          value={value}
          column={column}
          showTitle={false}
          maxLength={30}
          getValues={undefined}
        />
      </div>
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
    </FlexRowWrap>
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
          className={
            "mt-p5 f-0 formfield-bg-color " +
            (table.info.isFileTable ? "mt-2" : "")
          }
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

    const referencedInsertDataObj =
      referencedInsertData instanceof NewRowDataHandler ?
        referencedInsertData.getRow()
      : referencedInsertData;
    const newDataText = sliceText(
      Object.entries(referencedInsertDataObj ?? {})
        .map(([k, v]) =>
          isObject(v) ? `{ ${k} }`
          : Array.isArray(v) ? `[{ ${k} }]`
          : v?.toString(),
        )
        .join(", "),
      60,
    );

    return (
      <FlexRow
        className="gap-0 f-1"
        style={{ justifyContent: "space-between" }}
      >
        <Btn
          className="formfield-bg-color"
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
      className="SmartFormFieldForeignKey FormField_Select noselect formfield-bg-color"
      variant="div"
      fullOptions={fullOptions ?? []}
      onSearch={onSearchOptions}
      onChange={(newVal) => onChange({ type: "column", value: newVal })}
      value={value}
      labelAsValue={true}
      btnProps={{
        children: displayValue,
        style: {
          justifyContent: "space-between",
          flex: 1,
          paddingLeft: "6px",
        },
      }}
    />
  );
};
