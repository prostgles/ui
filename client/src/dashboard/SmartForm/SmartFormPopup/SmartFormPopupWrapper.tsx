import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import {
  type AnyObject,
  getKeys,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useMemo } from "react";
import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import type { PopupProps } from "@components/Popup/Popup";
import Popup from "@components/Popup/Popup";
import { SvgIcon } from "@components/SvgIcon";
import type { SmartFormProps } from "../SmartForm";
import type { SmartFormState } from "../useSmartForm";

type P = Pick<SmartFormProps, "onPrevOrNext" | "prevNext" | "asPopup"> & {
  rowFilterObj: AnyObject | undefined;
  displayedColumns: Pick<
    ValidatedColumnInfo,
    "name" | "is_pkey" | "references"
  >[];
  headerText: string;
  children: React.ReactNode;
  maxWidth: string;
  onClose: () => void;
  table: SmartFormState["table"];
};
export const SmartFormPopupWrapper = ({
  onPrevOrNext,
  prevNext,
  rowFilterObj,
  displayedColumns,
  headerText,
  children,
  maxWidth,
  onClose,
  asPopup,
  table,
}: P) => {
  const prevNextClass = "smartformprevnext";

  const autoFocusFirstIfIsInsert = !rowFilterObj;
  const extraProps: Pick<
    PopupProps,
    "onKeyDown" | "headerRightContent" | "autoFocusFirst"
  > = useMemo(() => {
    return !onPrevOrNext ?
        ({
          autoFocusFirst: autoFocusFirstIfIsInsert ? "content" : undefined,
        } satisfies Pick<PopupProps, "autoFocusFirst">)
      : {
          autoFocusFirst: "header",
          onKeyDown: (e, section) => {
            if (section !== "header") return;

            if (e.key === "ArrowLeft") {
              onPrevOrNext(-1);
            }
            if (e.key === "ArrowRight") {
              onPrevOrNext(1);
            }
          },
          headerRightContent: (
            <div className={"flex-row mx-1 " + prevNextClass}>
              <Btn
                iconPath={mdiChevronLeft}
                disabledInfo={
                  prevNext?.prev === false ? "Reached end" : undefined
                }
                data-command="SmartForm.header.previousRow"
                onClick={({ currentTarget }) => {
                  currentTarget.focus();
                  onPrevOrNext(-1);
                }}
              />
              <Btn
                iconPath={mdiChevronRight}
                data-command="SmartForm.header.nextRow"
                disabledInfo={
                  prevNext?.next === false ? "Reached end" : undefined
                }
                onClick={({ currentTarget }) => {
                  currentTarget.focus();
                  onPrevOrNext(1);
                }}
              />
            </div>
          ),
        };
  }, [autoFocusFirstIfIsInsert, onPrevOrNext, prevNext?.next, prevNext?.prev]);

  const { subTitle } = useMemo(() => {
    const filterKeys =
      rowFilterObj && "$and" in rowFilterObj ?
        rowFilterObj.$and.flatMap((f) => getKeys(f))
      : getKeys(rowFilterObj ?? {});
    /** Do not show subTitle rowFilter if it's primary key and shows in columns */
    const knownJoinColumns = displayedColumns
      .filter((c) => c.is_pkey || c.references)
      .map((c) => c.name);
    const subTitle =
      rowFilterObj ?
        filterKeys.every((col) => knownJoinColumns.includes(col)) ?
          undefined
        : sliceText(
            " (" +
              Object.entries(rowFilterObj)
                .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                .join(" AND ") +
              ")",
            100,
          )
      : "";
    return { subTitle };
  }, [displayedColumns, rowFilterObj]);

  if (!asPopup) {
    return children;
  }
  return (
    <Popup
      title={
        <FlexRow
          data-command="SmartForm.header.tableIconAndName"
          className="gap-1"
        >
          {table.icon && <SvgIcon size={34} icon={table.icon} />}
          {headerText}
        </FlexRow>
      }
      subTitle={subTitle}
      {...extraProps}
      contentClassName={`${maxWidth} pt-1`}
      positioning="right-panel"
      onClose={onClose}
      clickCatchStyle={{ opacity: 0.2 }}
      showFullscreenToggle={{
        getStyle: (fullscreen) =>
          fullscreen ? {} : { width: "min(600px, 100vw)" },
      }}
    >
      {children}
    </Popup>
  );
};
