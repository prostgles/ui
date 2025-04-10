import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { type AnyObject } from "prostgles-types";
import React, { useEffect } from "react";
import {
  type DetailedFilterBase,
  type SmartGroupFilter,
} from "../../../../../commonTypes/filterUtils";
import type { Prgl } from "../../../App";
import { FlexCol, FlexRow, classOverride } from "../../../components/Flex";
import Loading from "../../../components/Loading";
import { Section } from "../../../components/Section";
import { SvgIcon } from "../../../components/SvgIcon";
import Tabs, { type TabItem } from "../../../components/Tabs";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import SmartTable from "../../SmartTable";
import type { SmartFormProps } from "../SmartForm";
import type { NewRow, NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import { JoinedRecordsSection } from "./JoinedRecordsSection";
import {
  useJoinedRecordsSections,
  type JoinedRecordSection,
} from "./useJoinedRecordsSections";
import { JoinedRecordsAddRow } from "./JoinedRecordsAddRow";
import Btn from "../../../components/Btn";
import { mdiTable } from "@mdi/js";

export type JoinedRecordsProps = Pick<Prgl, "db" | "tables" | "methods"> &
  Pick<SmartFormProps, "onSuccess" | "parentForm"> & {
    className?: string;
    style?: React.CSSProperties;
    tableName: string;
    rowFilter?: DetailedFilterBase[];
    newRowData: NewRow | undefined;
    newRowDataHandler: NewRowDataHandler | undefined;
    showLookupTables?: boolean;
    showRelated?: "descendants";
    modeType?: "update" | "insert" | "view";
    onTabChange: (tabKey: string | undefined) => void;
    activeTabKey: string | undefined;
    errors: AnyObject;
    row?: AnyObject;
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
      {sections.map((section) => {
        const { label, path, count, table } = section;
        const icon = table.icon;
        return (
          <Section
            key={path.join(".")}
            className="trigger-hover"
            titleIcon={icon && <SvgIcon icon={icon} />}
            title={
              <FlexRow data-key={path.join(".")}>
                <div>{label}</div>
                <div className="text-2" style={{ fontWeight: "normal" }}>
                  {count}
                </div>
              </FlexRow>
            }
            titleRightContent={
              props.newRowDataHandler && (
                <FlexRow className="show-on-trigger-hover">
                  {!isInsert && (
                    <Btn
                      iconPath={mdiTable}
                      title="Open in table"
                      disabledInfo={!count ? "No records to show" : undefined}
                      onClick={() => {
                        setQuickView(section);
                      }}
                    />
                  )}
                  <JoinedRecordsAddRow
                    {...props}
                    btnProps={{ size: "small" }}
                    section={section}
                    newRowDataHandler={props.newRowDataHandler}
                  />
                </FlexRow>
              )
            }
          >
            <JoinedRecordsSection
              {...props}
              section={section}
              descendants={descendants}
              isInsert={isInsert}
              onSetQuickView={() => {
                setQuickView(section);
              }}
            />
          </Section>
        );
      })}
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
    </FlexCol>
  );
};

/* {variant === "inline" ? */

// : <Tabs
//     className="f-1"
//     contentClass="o-auto f-1"
//     activeKey={activeTabKey}
//     onChange={(activeKey) => {
//       onTabChange(activeKey);
//     }}
//     items={Object.fromEntries(
//       sections.map((section) => {
//         const { label, path, count, table } = section;
//         const icon = table.icon;
//         const countNode = (
//           <span
//             className="text-1p5 font-18"
//             style={{ fontWeight: "lighter" }}
//           >
//             {section.count.toLocaleString()}
//           </span>
//         );
//         const showCountNode = !(isInsert && !count);
//         return [
//           path.join("."),
//           {
//             label: (
//               <FlexRow className="gap-p5">
//                 {icon && <SvgIcon icon={icon} />}
//                 <div>{label}</div>
//                 {showCountNode && countNode}
//               </FlexRow>
//             ),
//             content: (
//               <JoinedRecordsSection
//                 {...props}
//                 section={section}
//                 descendants={descendants}
//                 isInsert={isInsert}
//                 onSetQuickView={() => {
//                   setQuickView(section);
//                 }}
//               />
//             ),
//           } satisfies TabItem,
//         ];
//       }),
//     )}
//   />
// }
