import { type AnyObject } from "prostgles-types";
import React, { useEffect } from "react";
import { type DetailedFilterBase } from "@common/filterUtils";
import type { Prgl } from "../../../App";
import { FlexCol, FlexRow, classOverride } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { Section } from "@components/Section";
import { SvgIcon } from "@components/SvgIcon";
import type { SmartFormProps } from "../SmartForm";
import { ViewMoreSmartCardList } from "../SmartFormField/ViewMoreSmartCardList";
import type { NewRow, NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import { JoinedRecordsAddRow } from "./JoinedRecordsAddRow";
import { JoinedRecordsSection } from "./JoinedRecordsSection";
import { useJoinedRecordsSections } from "./useJoinedRecordsSections";
import type { FieldConfig } from "../../SmartCard/SmartCard";

export type JoinedRecordsProps = Pick<Prgl, "db" | "tables" | "methods"> &
  Pick<SmartFormProps, "onSuccess" | "parentForm"> & {
    className?: string;
    style?: React.CSSProperties;
    tableName: string;
    rowFilter?: DetailedFilterBase[];
    newRowData: NewRow | undefined;
    newRowDataHandler: NewRowDataHandler | undefined;
    showRelated?: "descendants";
    modeType?: "update" | "insert" | "view";
    onTabChange: (tabKey: string | undefined) => void;
    activeTabKey: string | undefined;
    errors: AnyObject;
    row?: AnyObject;
    tablesToShow?: Record<
      string,
      | true
      | {
          /**
           * @deprecated
           */
          fieldConfigs?: FieldConfig[];
        }
    >;
  };

export const JoinedRecords = (props: JoinedRecordsProps) => {
  const sectionData = useJoinedRecordsSections(props);
  const {
    sections = [],
    isLoadingSections,
    descendants,
    isInsert,
  } = sectionData;
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
            className="trigger-hover pl-p5"
            btnProps={{
              ["data-command"]: "JoinedRecords.SectionToggle",
              ["data-key"]: path.join("."),
            }}
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
                    <ViewMoreSmartCardList
                      db={db}
                      methods={methods}
                      ftable={table}
                      searchFilter={section.detailedJoinFilter}
                      getActions={undefined}
                      tables={tables}
                      rootTableName={table.name}
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
            />
          </Section>
        );
      })}
    </FlexCol>
  );
};
