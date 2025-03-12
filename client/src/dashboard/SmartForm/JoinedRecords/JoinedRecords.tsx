import { mdiPlus, mdiTable } from "@mdi/js";
import { isDefined, type AnyObject } from "prostgles-types";
import React from "react";
import {
  getSmartGroupFilter,
  type DetailedFilterBase,
} from "../../../../../commonTypes/filterUtils";
import type { Prgl } from "../../../App";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow, classOverride } from "../../../components/Flex";
import Loading from "../../../components/Loading";
import { MediaViewer } from "../../../components/MediaViewer";
import type { Command } from "../../../Testing";
import RTComp from "../../RTComp";
import SmartCardList from "../../SmartCard/SmartCardList";
import SmartTable from "../../SmartTable";
import type { TargetPath } from "../../W_Table/tableUtils/getJoinPaths";
import type { SmartFormProps, SmartFormState } from "../SmartForm";
import { getJoinFilter } from "./getJoinFilter";
import { prepareJoinedRecordsSections } from "./prepareJoinedRecordsSections";
import { JoinedRecordsAddRow } from "./JoinedRecordsAddRow";
import type { SmartFormUpperFooterProps } from "../SmartFormUpperFooter";

export type JoinedRecordsProps = Pick<
  Prgl,
  "db" | "tables" | "methods" | "theme"
> &
  Pick<SmartFormProps, "onSuccess"> & {
    className?: string;
    style?: React.CSSProperties;
    tableName: string;
    rowFilter?: DetailedFilterBase[];
    newRowData: SmartFormState["newRowData"];
    onSetNestedInsertData?: SmartFormUpperFooterProps["onSetNestedInsertData"];
    showLookupTables?: boolean;
    showRelated?: "descendants";
    action?: "update" | "insert" | "view";
    onToggle?: (expanded: boolean) => void;
    showOnlyFKeyTables?: boolean;
    expanded?: boolean;
  };

export type JoinedRecordsState = {
  expanded: boolean;
  isLoadingSections?: boolean;
  sections: {
    label: string;
    tableName: string;
    path: string[];
    expanded?: boolean;
    existingDataCount: number;
    canInsert?: boolean;
    error?: string;
  }[];
  // insert?: {
  //   table: string;
  //   data: AnyObject;
  // };

  quickView?: {
    tableName: string;
    path: string[];
  };
  extraSectionPaths: TargetPath[];

  // nestedInsertTable?: string;
};
export class JoinedRecords extends RTComp<
  JoinedRecordsProps,
  JoinedRecordsState
> {
  state: JoinedRecordsState = {
    sections: [],
    expanded: false,
    extraSectionPaths: [],
  };

  getDataSignature = () => {
    const { tableName, rowFilter } = this.props;
    return JSON.stringify({
      tableName,
      rowFilter,
      extraSectionPaths: this.state.extraSectionPaths,
    });
  };

  getDetailedFilter = getJoinFilter.bind(this);

  getJoinFilter(path: string[]) {
    return getSmartGroupFilter(this.getDetailedFilter(path));
  }

  dataSignature?: string;
  prepareSections = prepareJoinedRecordsSections.bind(this);

  async onDelta() {
    this.prepareSections();
  }

  get tableHandler() {
    const { db, tableName } = this.props;
    return db[tableName];
  }

  render(): React.ReactNode {
    const { sections, quickView, isLoadingSections } = this.state;
    const {
      db,
      tables,
      methods,
      tableName,
      newRowData,
      onSetNestedInsertData,
      rowFilter,
      theme,
      showRelated,
      style,
      className = "",
      action,
      expanded = this.state.expanded,
      onSuccess,
    } = this.props;
    let quickViewPopup: React.ReactNode = null;
    if (quickView) {
      quickViewPopup = (
        <SmartTable
          theme={theme}
          db={db}
          methods={methods}
          tableName={quickView.tableName}
          tables={tables}
          filter={this.getDetailedFilter(quickView.path)}
          onClosePopup={() => {
            this.setState({ quickView: undefined });
          }}
        />
      );
    }

    if (isLoadingSections) {
      return <Loading className="m-1 as-center" />;
    } else if (!sections.length) {
      return null;
    }

    if (action === "insert" && sections.every((s) => !s.canInsert)) {
      return null;
    }

    const dencendants = tables.filter((t) =>
      t.columns.some((c) => c.references?.some((r) => r.ftable === tableName)),
    );
    const descendantInsertTables = dencendants
      .filter((t) => db[t.name]?.insert)
      .map((t) => t.name);

    const nestedInsertData = Object.fromEntries(
      Object.entries(newRowData ?? {})
        .map(([k, d]) => (d.type === "nested-table" ? [k, d.value] : undefined))
        .filter(isDefined),
    );

    return (
      <FlexCol
        data-command="JoinedRecords"
        className={classOverride(
          "gap-0 bt b-color min-h-0 bg-inherit ",
          className,
        )}
        style={style}
      >
        <h4
          title="Toggle section"
          data-command={"JoinedRecords.toggle" satisfies Command}
          onClick={() => {
            this.props.onToggle?.(!expanded);
            this.setState({ expanded: !expanded });
          }}
          className="m-0 pointer noselect ta-left f-0 ws-pre flex-row ai-center gap-1 p-1 text-1p5"
        >
          <div className="">Related data </div>
          {!!sections.length && (
            <span
              className="text-1p5 font-18"
              style={{ fontWeight: "lighter" }}
            >
              {sections.reduce((a, v) => a + v.existingDataCount, 0)}
            </span>
          )}

          {/* TODO allow customising Related data section */}
          {/* <JoinPathSelectorV2 
          onChange={path => {
            this.setState({ extraSectionPaths: [ path, ...this.state.extraSectionPaths] });
          }}
          tableName={tableName}
          tables={tables}
          value={undefined}
          btnProps={{
            className: "ml-auto",
            iconPath: mdiPlus,
            size: "small",
            children: "",
            variant: undefined,
            color: "action",
          }}          
        /> */}
        </h4>
        {quickViewPopup}
        {expanded && (
          <FlexCol className="gap-0 o-auto f-1 px-1 bg-inherit">
            {sections
              .filter(
                (s) =>
                  !showRelated ||
                  dencendants.some((t) => t.name === s.tableName),
              )
              .map((s, i) => {
                const onToggle: React.MouseEventHandler = ({
                  currentTarget,
                }) => {
                  const newSections = sections.map((_s) => ({
                    ..._s,
                    expanded:
                      _s.path.join() === s.path.join() ?
                        !_s.expanded
                      : _s.expanded,
                  }));

                  this.setState({
                    sections: newSections,
                  });

                  setTimeout(() => {
                    currentTarget.scrollIntoView({ behavior: "smooth" });
                  }, 300);
                };
                const isInsert = !!onSetNestedInsertData && !rowFilter;
                const count =
                  (isInsert ?
                    nestedInsertData?.[s.tableName]?.length
                  : s.existingDataCount) ?? 0;
                const disabledInfo = !count ? "No records to show" : undefined;
                let countNode: React.ReactNode = (
                  <span
                    className="ws-pre text-1p5 font-18"
                    style={{ fontWeight: "normal" }}
                  >
                    {" "}
                    {count.toLocaleString()}
                  </span>
                );
                if (isInsert && !count) {
                  countNode = null;
                }

                let content: React.ReactNode = null;
                const limit = 20;
                if (isInsert) {
                  if (descendantInsertTables.includes(s.tableName)) {
                    // const { nestedInsertData } = this.state;
                    content = (
                      <SmartCardList
                        theme={theme}
                        key={s.path.join(".")}
                        db={db as any}
                        methods={methods}
                        tableName={s.tableName}
                        tables={tables}
                        className="px-1"
                        // variant="row"
                        onSuccess={onSuccess}
                        data={nestedInsertData?.[s.tableName] ?? []}
                        onChange={(newData) => {
                          this.setState(
                            {
                              // nestedInsertData: {
                              //   ...this.state.nestedInsertData,
                              //   [s.tableName]: newData,
                              // },
                            },
                            () => {
                              onSetNestedInsertData(s.tableName, newData);
                            },
                          );
                        }}
                      />
                    );
                  } else {
                    return null;
                  }
                } else {
                  content = (
                    <div className="flex-col py-1">
                      {count > 20 && <div>Showing top {limit} records</div>}
                      <SmartCardList
                        theme={theme}
                        key={s.path.join(".")}
                        db={db as any}
                        tables={tables}
                        methods={methods}
                        tableName={s.tableName}
                        filter={this.getJoinFilter(s.path)}
                        className="px-1"
                        onSuccess={onSuccess}
                        fieldConfigs={
                          (
                            tables.some(
                              (t) =>
                                t.info.isFileTable && t.name === s.tableName,
                            )
                          ) ?
                            [
                              {
                                name: "url",
                                render: (url, row) => (
                                  <MediaViewer
                                    style={{ maxWidth: "300px" }}
                                    url={url}
                                  />
                                ),
                              },
                            ]
                          : undefined
                        }
                      />
                    </div>
                  );
                }

                const key = s.path.join(".") + this.dataSignature;
                return (
                  <div
                    key={key}
                    data-key={s.path.join(".")}
                    className="flex-col min-h-0 f-0 relative bg-inherit"
                  >
                    <div
                      className="flex-row ai-center noselect pointer f-0 bg-inherit bt b-color"
                      style={
                        !s.expanded ? undefined : (
                          {
                            position: "sticky",
                            top: 0,
                            zIndex: 432432,
                            marginBottom: ".5em",
                          }
                        )
                      }
                    >
                      <Btn
                        className="f-1 p-p5 ta-left font-20 bold jc-start"
                        variant="text"
                        data-label="Expand section"
                        title="Expand section"
                        disabledInfo={s.error ?? disabledInfo}
                        color={s.error ? "warn" : "action"}
                        onClick={onToggle}
                      >
                        {s.path.join(".")}
                        {countNode}
                      </Btn>

                      <FlexRow className="show-on-parent-hover gap-0">
                        <Btn
                          iconPath={mdiTable}
                          title="Open in table"
                          disabledInfo={disabledInfo}
                          onClick={async () => {
                            this.setState({
                              quickView: {
                                tableName: s.tableName,
                                path: s.path,
                              },
                            });
                          }}
                        />
                        <JoinedRecordsAddRow {...this.props} section={s} />
                      </FlexRow>
                    </div>
                    {s.expanded && content}
                  </div>
                );
              })}
          </FlexCol>
        )}
      </FlexCol>
    );
  }
}
