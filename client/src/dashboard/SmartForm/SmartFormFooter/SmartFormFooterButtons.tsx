import { mdiContentCopy, mdiDelete } from "@mdi/js";
import { isEmpty } from "prostgles-types";
import React from "react";
import { dataCommand } from "../../../Testing";
import Btn from "../../../components/Btn";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import { Footer } from "../../../components/Popup/Popup";
import { type SmartFormProps } from "../SmartForm";
import type { SmartFormState } from "../useSmartForm";
import { type SmartFormActionsState } from "./useSmartFormActions";

type P = SmartFormState &
  SmartFormActionsState &
  Pick<SmartFormProps, "onClose" | "parentForm" | "db">;

export const SmartFormFooterButtons = (props: P): JSX.Element => {
  const {
    error,
    errors,
    onClose,
    parentForm,
    successMessage,
    confirmPopup,
    buttons,
  } = props;

  /** Showing Success animation. Will close soon */
  if (successMessage) {
    return <></>;
  }

  if (confirmPopup) {
    return (
      <>
        <div
          className="absolute "
          style={{
            inset: 0,
            opacity: 0.5,
            background: "gray",
            zIndex: 1, // needed to be on top of focused code editors
          }}
        />
        <ConfirmationDialog
          className="bg-color-0"
          style={{ zIndex: 2 }}
          {...confirmPopup}
        />
      </>
    );
  }
  if (!buttons) {
    return <></>;
  }

  const errorMsg =
    error || !isEmpty(errors) ? "Must fix error first" : undefined;

  const actionButtons = (
    <>
      {buttons.onClickUpdate && (
        <Btn
          {...dataCommand("SmartForm.update")}
          color="action"
          className=""
          variant="filled"
          disabledInfo={errorMsg}
          onClick={buttons.onClickUpdate}
        >
          Update
        </Btn>
      )}
      {buttons.onClickDelete && (
        <Btn
          {...dataCommand("SmartForm.delete")}
          title="Delete record"
          color="danger"
          disabledInfo={errorMsg}
          iconPath={mdiDelete}
          onClick={buttons.onClickDelete}
        >
          Delete
        </Btn>
      )}
      {buttons.onClickClone && (
        <Btn
          color="action"
          {...dataCommand("SmartForm.clone")}
          iconPath={mdiContentCopy}
          variant="filled"
          title="Prepare a duplicate insert that excludes primary key fields"
          className="ml-auto"
          onClick={buttons.onClickClone}
        >
          Clone
        </Btn>
      )}
      {buttons.onClickInsert && (
        <Btn
          color="action"
          {...dataCommand("SmartForm.insert")}
          disabledInfo={errorMsg}
          className=" "
          variant="filled"
          onClick={buttons.onClickInsert}
        >
          {parentForm?.type === "insert" ? `Add` : `Insert`}
        </Btn>
      )}
    </>
  );

  return (
    <Footer>
      {onClose && (
        <Btn
          className=" bg-color-0 mr-auto"
          {...dataCommand("SmartForm.close")}
          onClick={() => onClose(true)}
        >
          Close
        </Btn>
      )}
      {actionButtons}
    </Footer>
  );
};
