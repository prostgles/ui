import { isDefined } from "prostgles-types";
import React from "react";
import { MediaViewer } from "../../../components/MediaViewer";
import { SmartCardList } from "../../SmartCardList/SmartCardList";
import type { JoinedRecordSection, JoinedRecordsProps } from "./JoinedRecords";
import { NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import { InfoRow } from "../../../components/InfoRow";
import { FlexCol, FlexRow } from "../../../components/Flex";
import ErrorComponent from "../../../components/ErrorComponent";
import { mdiTable } from "@mdi/js";
import { JoinedRecordsAddRow } from "./JoinedRecordsAddRow";
import Btn from "../../../components/Btn";
import { SmartCardListJoinedNewRecords } from "../../SmartCardList/SmartCardListJoinedNewRecords";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";

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
  } = props;

  const descendantInsertTables = descendants
    .filter((t) => db[t.name]?.insert)
    .map((t) => t.name);

  const nestedInsertData = Object.fromEntries(
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
  );

  const { count } = s;
  let countNode: React.ReactNode = (
    <span className="ws-pre text-1p5 font-18" style={{ fontWeight: "normal" }}>
      {" "}
      {count.toLocaleString()}
    </span>
  );
  if (isInsert && !count) {
    countNode = null;
  }

  const limit = 20;
  if (isInsert) {
    if (descendantInsertTables.includes(s.tableName)) {
      return (
        <SmartCardListJoinedNewRecords
          key={s.path.join(".")}
          db={db as DBHandlerClient}
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
        />
      );
    }

    return null;
  } else {
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
          noDataComponent={
            <InfoRow className=" " color="info" variant="filled">
              No records
            </InfoRow>
          }
          noDataComponentMode="hide-all"
          fieldConfigs={
            tables.some((t) => t.info.isFileTable && t.name === s.tableName) ?
              [
                {
                  name: "url",
                  render: (url, row) => (
                    <MediaViewer style={{ maxWidth: "300px" }} url={url} />
                  ),
                },
              ]
            : undefined
          }
        />
      </div>
    );
  }

  // const key = s.path.join(".") + dataSignature;
  // return (
  //   <div
  //     key={key}
  //     data-key={s.path.join(".")}
  //     className="flex-col min-h-0 f-0 relative bg-inherit"
  //   >
  //     <div
  //       className="flex-row ai-center noselect pointer f-0 bg-inherit bt b-color"
  //       style={
  //         !s.expanded ? undefined : (
  //           {
  //             position: "sticky",
  //             top: 0,
  //             zIndex: 432432,
  //             marginBottom: ".5em",
  //           }
  //         )
  //       }
  //     >
  //       <Btn
  //         className="f-1 p-p5 ta-left font-20 bold jc-start"
  //         variant="text"
  //         data-label="Expand section"
  //         title="Expand section"
  //         disabledInfo={s.error ?? disabledInfo}
  //         color={s.error ? "warn" : "action"}
  //         onClick={onToggle}
  //       >
  //         {s.path.join(".")}
  //         {countNode}
  //       </Btn>

  //       <FlexRow className="show-on-parent-hover gap-0">
  //         <Btn
  //           iconPath={mdiTable}
  //           title="Open in table"
  //           disabledInfo={disabledInfo}
  //           onClick={async () => {
  //             this.setState({
  //               quickView: {
  //                 tableName: s.tableName,
  //                 path: s.path,
  //               },
  //             });
  //           }}
  //         />
  //         <JoinedRecordsAddRow {...props} section={s} />
  //       </FlexRow>
  //     </div>
  //     {s.expanded && content}
  //   </div>
  // );
};

export const JoinedRecordsSection = ({
  section,
  descendants,
  onSetQuickView,
  isInsert,
  ...props
}: JoinedRecordsProps & {
  section: JoinedRecordSection;
  isInsert: boolean;
  descendants: JoinedRecordsProps["tables"];
  onSetQuickView: VoidFunction;
}) => {
  const { count } = section;
  return (
    <FlexCol className=" p-1 ">
      <FlexRow className="jc-end">
        {section.error && (
          <ErrorComponent
            error={section.error}
            variant="outlined"
            className=" f-1"
          />
        )}
        {!isInsert && (
          <Btn
            iconPath={mdiTable}
            title="Open in table"
            disabledInfo={!count ? "No records to show" : undefined}
            onClick={onSetQuickView}
          />
        )}
        {props.newRowDataHandler && (
          <JoinedRecordsAddRow
            {...props}
            section={section}
            newRowDataHandler={props.newRowDataHandler}
          />
        )}
      </FlexRow>
      <JoinedRecordsSectionCardList
        {...props}
        section={section}
        descendants={descendants}
        isInsert={isInsert}
      />
    </FlexCol>
  );
};
