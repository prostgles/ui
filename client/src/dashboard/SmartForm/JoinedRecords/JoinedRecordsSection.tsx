import { isDefined } from "prostgles-types";
import React from "react";
import { MediaViewer } from "../../../components/MediaViewer";
import SmartCardList from "../../SmartCard/SmartCardList";
import type { JoinedRecordSection, JoinedRecordsProps } from "./JoinedRecords";

export const JoinedRecordsSection = (
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
    tableName,
    newRowData,
    onSetNestedInsertData,
    onSuccess,
    section: s,
    isInsert,
    descendants,
  } = props;

  const descendantInsertTables = descendants
    .filter((t) => db[t.name]?.insert)
    .map((t) => t.name);

  const nestedInsertData = Object.fromEntries(
    Object.entries(newRowData ?? {})
      .map(([k, d]) => (d.type === "nested-table" ? [k, d.value] : undefined))
      .filter(isDefined),
  );

  // const onToggle: React.MouseEventHandler = ({ currentTarget }) => {
  //   const newSections = sections.map((_s) => ({
  //     ..._s,
  //     expanded: _s.path.join() === s.path.join() ? !_s.expanded : _s.expanded,
  //   }));

  //   this.setState({
  //     sections: newSections,
  //   });

  //   setTimeout(() => {
  //     currentTarget.scrollIntoView({ behavior: "smooth" });
  //   }, 300);
  // };
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
        <SmartCardList
          key={s.path.join(".")}
          db={db as any}
          methods={methods}
          tableName={s.tableName}
          tables={tables}
          className="px-1"
          excludeNulls={true}
          // variant="row"
          onSuccess={onSuccess}
          data={nestedInsertData?.[s.tableName] ?? []}
          onChange={(newData) => {
            onSetNestedInsertData!(s.tableName, newData);
          }}
        />
      );
    }

    return null;
  } else {
    return (
      <div className="flex-col py-1">
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
          noDataComponent={<>hey</>}
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
