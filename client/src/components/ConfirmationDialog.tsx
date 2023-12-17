import RTComp from "../dashboard/RTComp";
import React from "react";
import Btn from "./Btn";
import Popup, { PopupProps } from "./Popup/Popup";
import Icon from "@mdi/react";
import { FlexRowWrap } from "./Flex";
import { Command } from "../Testing";

export type ConfirmDialogProps = Pick<PopupProps, "anchorEl" | "positioning"> & {
  title?: string;
  message: string;
  iconPath?: string;
  acceptBtn: {
    color: "warn" | "danger" | "action";
    text: string;
    dataCommand: Command;
  }
  onAccept: VoidFunction;
  onClose: VoidFunction;
  asPopup?: boolean;
  className?: string;
  style?: React.CSSProperties;
}


type S = {

}

export default class ConfirmationDialog extends RTComp<ConfirmDialogProps, S> {
  state: S = {

  }

  render() {
    const { onClose, onAccept, acceptBtn, message, title, asPopup, className = "", style, iconPath, ...popupProps } = this.props;

    const content = <div className={"flex-col " + className} style={style}>
      <div className="flex-row  jc-end p-1 gap-1">
        {iconPath && <Icon path={iconPath} size={1} className="f-0 text-gray-400" />}
        <div className="">{message}</div>
      </div>
      <FlexRowWrap className="p-p5 f-0 bt b-gray-400 jc-end ">
        <Btn 
          className="mr-1"
          variant="faded"
          onClick={() => onClose()}
        >Cancel</Btn>
        <Btn color={acceptBtn.color}
          variant="filled"
          data-command={acceptBtn.dataCommand}
          onClick={async () => {
            await onAccept();
          }}
        >
          {acceptBtn.text}
        </Btn>
      </FlexRowWrap>
    </div>

    if(!asPopup) return content;

    return <Popup 
      positioning={"right-panel"}
      {...popupProps}
      title={title}
      rootStyle={{ padding: 0 }}
      clickCatchStyle={{ opacity: .3 }}
      contentClassName="flex-col ai-center"
      onClose={onClose}
    >
      {content}
    </Popup>
  }
}