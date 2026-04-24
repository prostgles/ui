import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { SvgIcon } from "@components/SvgIcon";
import { mdiTextBoxOutline } from "@mdi/js";
import { type AnyObject, type ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import type { SmartFormProps } from "../SmartForm";
import type { SmartFormState } from "../useSmartForm";
import { SmartFormPrevNext } from "./SmartFormPrevNext";
import { useSmartFormPrevNext } from "./useSmartFormPrevNext";
import { useSmartFormSubTitle } from "./useSmartFormSubTitle";

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
  showAsMarkdown: boolean;
  setShowAsMarkdown: React.Dispatch<React.SetStateAction<boolean>> | undefined;
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
  setShowAsMarkdown,
  showAsMarkdown,
}: P) => {
  const prevNextState = useSmartFormPrevNext({ onPrevOrNext, prevNext });
  const { subTitle } = useSmartFormSubTitle({ displayedColumns, rowFilterObj });

  if (!asPopup) {
    return children;
  }
  const autoFocusFirstIfIsInsert = !rowFilterObj;
  return (
    <Popup
      title={
        <FlexRow
          data-command="SmartForm.header.tableIconAndName"
          className="gap-p25"
        >
          {table.icon && <SvgIcon size={24} icon={table.icon} />}
          {headerText}
        </FlexRow>
      }
      subTitle={subTitle}
      headerRightContent={
        <FlexRow className="gap-p25">
          {prevNextState && <SmartFormPrevNext {...prevNextState} />}
          {setShowAsMarkdown && (
            <Btn
              title="Show as markdown"
              iconPath={mdiTextBoxOutline}
              variant={showAsMarkdown ? "filled" : "icon"}
              color={showAsMarkdown ? "action" : undefined}
              onClick={() => setShowAsMarkdown((v) => !v)}
            />
          )}
        </FlexRow>
      }
      onKeyDown={prevNextState?.onKeyDown}
      autoFocusFirst={autoFocusFirstIfIsInsert ? "content" : undefined}
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
