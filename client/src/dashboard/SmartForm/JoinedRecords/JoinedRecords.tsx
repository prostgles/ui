import { mdiTable } from "@mdi/js";
import { isDefined, isEmpty, type AnyObject } from "prostgles-types";
import React, { useEffect } from "react";
import {
  type DetailedFilterBase,
  type SmartGroupFilter,
} from "../../../../../commonTypes/filterUtils";
import type { Prgl } from "../../../App";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow, classOverride } from "../../../components/Flex";
import Loading from "../../../components/Loading";
import { SvgIcon } from "../../../components/SvgIcon";
import Tabs, { type TabItem } from "../../../components/Tabs";
import SmartTable from "../../SmartTable";
import type { SmartFormProps } from "../SmartForm";
import type { NewRow, NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import { JoinedRecordsAddRow } from "./JoinedRecordsAddRow";
import { JoinedRecordsSection } from "./JoinedRecordsSection";
import { useJoinedRecordsSections } from "./useJoinedRecordsSections";
import ErrorComponent from "../../../components/ErrorComponent";

export type JoinedRecordsProps = Pick<
  Prgl,
  "db" | "tables" | "methods" | "connection"
> &
  Pick<SmartFormProps, "onSuccess" | "parentForm"> & {
    className?: string;
    style?: React.CSSProperties;
    tableName: string;
    rowFilter?: DetailedFilterBase[];
    newRowData: NewRow | undefined;
    newRowDataHandler: NewRowDataHandler;
    showLookupTables?: boolean;
    showRelated?: "descendants";
    modeType?: "update" | "insert" | "view";
    onTabChange: (tabKey: string | undefined) => void;
    activeTabKey: string | undefined;
    showOnlyFKeyTables?: boolean;
    errors: AnyObject;
  };

export type JoinedRecordSection = {
  label: string;
  tableName: string;
  path: string[];
  expanded?: boolean;
  existingDataCount: number;
  canInsert?: boolean;
  error?: string;
  joinFilter: AnyObject;
  detailedJoinFilter: SmartGroupFilter;
  count: number;
};

export const JoinedRecords = (props: JoinedRecordsProps) => {
  const res = useJoinedRecordsSections(props);
  const { sections = [], isLoadingSections, descendants, isInsert } = res;
  const [quickView, setQuickView] = React.useState<JoinedRecordSection>();
  const {
    db,
    tables,
    methods,
    style,
    className = "",
    modeType: action,
    connection,
    activeTabKey,
    onTabChange,
  } = props;

  /** Open errored section */
  useEffect(() => {
    const erroredSection = sections.find((s) => s.error);
    if (erroredSection && erroredSection.tableName !== activeTabKey) {
      onTabChange(erroredSection.tableName);
    }
  }, [sections, onTabChange, activeTabKey]);

  if (isLoadingSections) {
    return <Loading className="m-1 as-center" />;
  } else if (!sections.length) {
    return null;
  }

  if (action === "insert" && sections.every((s) => !s.canInsert)) {
    return null;
  }

  return (
    <FlexCol
      data-command="JoinedRecords"
      className={classOverride(
        "gap-0 bt b-color min-h-0 bg-inherit f-1",
        className,
      )}
      style={style}
    >
      <Tabs
        className="f-1"
        contentClass="o-auto f-1"
        activeKey={activeTabKey}
        onChange={(activeKey) => {
          onTabChange(activeKey);
        }}
        items={Object.fromEntries(
          sections.map((section) => {
            const { label, path, count, tableName } = section;
            const countNode = (
              <span
                className="text-1p5 font-18"
                style={{ fontWeight: "lighter" }}
              >
                {section.count.toLocaleString()}
              </span>
            );
            const showCountNode = !(isInsert && !count);
            const icon = connection?.table_options?.[tableName]?.icon;
            return [
              path.join("."),
              {
                label: (
                  <FlexRow className="gap-p5">
                    {icon && <SvgIcon icon={icon} />}
                    <div>{label}</div>
                    {showCountNode && countNode}
                  </FlexRow>
                ),
                content: (
                  <FlexCol className="p-p25">
                    <FlexRow className=" p-p25 jc-end">
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
                          disabledInfo={
                            !count ? "No records to show" : undefined
                          }
                          onClick={async () => {
                            setQuickView(section);
                          }}
                        />
                      )}
                      <JoinedRecordsAddRow {...props} section={section} />
                    </FlexRow>
                    <JoinedRecordsSection
                      {...props}
                      section={section}
                      descendants={descendants}
                      isInsert={isInsert}
                    />
                  </FlexCol>
                ),
              } satisfies TabItem,
            ];
          }),
        )}
      />
      {quickView && (
        <SmartTable
          db={db}
          methods={methods}
          tableName={quickView.tableName}
          tables={tables}
          filter={quickView.detailedJoinFilter}
          onClosePopup={() => {
            setQuickView(undefined);
          }}
        />
      )}
      {/* <h4
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

        </h4> */}

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
      {/* {expanded && (
          <FlexCol className="gap-0 o-auto f-1 px-1 bg-inherit">
            {sections.map((s, i) => {
              const onToggle: React.MouseEventHandler = ({ currentTarget }) => {
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
              const isInsert = this.isInsert;
              const count =
                (isInsert ?
                  this.nestedInsertData?.[s.tableName]?.length
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
        )} */}
    </FlexCol>
  );
};
