import React from "react";
import Popup from "../../components/Popup/Popup";
import { SuccessMessage } from "../../components/Animations";
import { InfoRow } from "../../components/InfoRow";

export const AuthNotifPopup = ({
  success,
  message,
  onClose,
}: {
  success: boolean;
  message: string;
  onClose: () => void;
}) => {
  return (
    <Popup
      data-command="AuthNotifPopup"
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
      footerButtons={[
        {
          label: "OK",
          onClickClose: true,
          variant: "filled",
          color: "action",
        },
      ]}
    >
      {success ?
        <SuccessMessage variant="small" message={message} />
      : <InfoRow color="danger" variant="naked">
          {message}
        </InfoRow>
      }
    </Popup>
  );
};
