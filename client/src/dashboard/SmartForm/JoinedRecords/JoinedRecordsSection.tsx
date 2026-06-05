import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { isDefined } from "prostgles-types";
import React, { useMemo } from "react";
import { SmartCardList } from "../../SmartCardList/SmartCardList";
import { SmartCardListJoinedNewRecords } from "../../SmartCardList/SmartCardListJoinedNewRecords";
import { NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import type { JoinedRecordsProps } from "./JoinedRecords";
import type { JoinedRecordSection } from "./useJoinedRecordsSections";
import { useJoinedSectionFieldConfigs } from "./useJoinedSectionFieldConfigs";
import { JoinedRecordsAddRow } from "./JoinedRecordsAddRow";

export const JoinedRecordsSection = ({
  section,
  descendants,
  isInsert,
  ...props
}: JoinedRecordsProps & {
  section: JoinedRecordSection;
  isInsert: boolean;
  descendants: JoinedRecordsProps["tables"];
}) => {
  return (
    <FlexCol className=" px-1 pb-1 pt-p5 " data-command="JoinedRecords.Section">
      {section.error && (
        <ErrorComponent
          error={section.error}
          variant="outlined"
          className=" f-1"
        />
      )}
      <JoinedRecordsSectionCardList
        {...props}
        section={section}
        descendants={descendants}
        isInsert={isInsert}
      />
    </FlexCol>
  );
};

const JoinedRecordsSectionCardList = (
  props: JoinedRecordsProps & {
    section: JoinedRecordSection;
    isInsert: boolean;
    descendants: JoinedRecordsProps["tables"];
  },
) => {
  const {
    db,
    tables,
    methods,
    newRowData,
    onSuccess,
    section: s,
    isInsert,
    descendants,
    newRowDataHandler,
    tableName,
    tablesToShow,
    sql,
  } = props;

  const descendantInsertTables = useMemo(
    () => descendants.filter((t) => db[t.name]?.insert).map((t) => t.name),
    [db, descendants],
  );

  const nestedInsertData = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(newRowData ?? {})
          .map(([k, d]) =>
            d.type === "nested-table" ?
              [
                k,
                d.value.map((_v) =>
                  _v instanceof NewRowDataHandler ? _v.getRow() : _v,
                ),
              ]
            : undefined,
          )
          .filter(isDefined),
      ),
    [newRowData],
  );

  const fieldConfigs = useJoinedSectionFieldConfigs({
    sectionTable: s.table,
    tables,
    tableName,
    tablesToShow,
  });

  const { count } = s;

  const noDataComponent = (
    <InfoRow
      className=" "
      color="info"
      variant="filled"
      contentClassname="flex-row gap-1 ai-center"
    >
      <div>No records</div>
      {newRowDataHandler && (
        <JoinedRecordsAddRow
          {...props}
          btnProps={{
            size: "small",
            variant: "filled",
            children: "Add",
            "data-command": "JoinedRecords.AddRowNoRecords",
          }}
          section={s}
          newRowDataHandler={newRowDataHandler}
        />
      )}
    </InfoRow>
  );

  const limit = 20;
  if (isInsert) {
    if (!descendantInsertTables.includes(s.tableName)) {
      return null;
    }
    return (
      <SmartCardListJoinedNewRecords
        key={s.path.join(".")}
        db={db}
        sql={sql}
        methods={methods}
        table={s.table}
        tables={tables}
        className="px-1"
        excludeNulls={true}
        onSuccess={onSuccess}
        data={nestedInsertData?.[s.tableName] ?? []}
        onChange={(newData) => {
          newRowDataHandler?.setNestedTable(s.tableName, newData);
        }}
        noDataComponent={noDataComponent}
        noDataComponentMode="hide-all"
      />
    );
  }

  return (
    <div className="flex-col gap-p25">
      {count > 20 && <div className="text-2">Showing top {limit} records</div>}
      <SmartCardList
        key={s.path.join(".")}
        db={db}
        sql={sql}
        tables={tables}
        methods={methods}
        tableName={s.tableName}
        filter={s.joinFilter}
        className="px-1"
        onSuccess={onSuccess}
        realtime={true}
        excludeNulls={true}
        showTopBar={false}
        noDataComponent={noDataComponent}
        noDataComponentMode="hide-all"
        fieldConfigs={fieldConfigs}
      />
    </div>
  );
};
