import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { isDefined } from "prostgles-types";
import React, { useMemo } from "react";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { SmartCardList } from "../../SmartCardList/SmartCardList";
import { SmartCardListJoinedNewRecords } from "../../SmartCardList/SmartCardListJoinedNewRecords";
import { NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import type { JoinedRecordsProps } from "./JoinedRecords";
import type { JoinedRecordSection } from "./useJoinedRecordsSections";
import { useJoinedSectionFieldConfigs } from "./useJoinedSectionFieldConfigs";

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
    <FlexCol className=" p-1 " data-command="JoinedRecords.Section">
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

  const limit = 20;
  if (isInsert) {
    if (!descendantInsertTables.includes(s.tableName)) {
      return null;
    }
    return (
      <SmartCardListJoinedNewRecords
        key={s.path.join(".")}
        db={db}
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
        noDataComponent={
          <InfoRow className=" " color="info" variant="filled">
            No records
          </InfoRow>
        }
        noDataComponentMode="hide-all"
      />
    );
  }

  return (
    <div className="flex-col">
      {count > 20 && <div>Showing top {limit} records</div>}
      <SmartCardList
        key={s.path.join(".")}
        db={db}
        tables={tables}
        methods={methods}
        tableName={s.tableName}
        filter={s.joinFilter}
        className="px-1"
        onSuccess={onSuccess}
        realtime={true}
        excludeNulls={true}
        showTopBar={false}
        noDataComponent={
          <InfoRow className=" " color="info" variant="filled">
            No records
          </InfoRow>
        }
        noDataComponentMode="hide-all"
        fieldConfigs={fieldConfigs}
      />
    </div>
  );
};
