import React, { useState } from "react";

import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { Services } from "@pages/ServerSettings/Services";
import Popup from "../../Popup/Popup";
import { SwitchToggle } from "../../SwitchToggle";
import {
  SpeechModeOptions,
  type ChatSpeechSetupState,
} from "./useChatSpeechSetup";

export const ChatSpeechSetup = ({
  onClose,
  autosend,
  setAutosend,
  setSpeechToTextMode,
  speechToTextMode,
  anchorEl,
  transcribeAudio,
}: { onClose: VoidFunction; anchorEl: HTMLElement } & ChatSpeechSetupState) => {
  const { user, dbs, dbsMethods, dbsTables } = usePrgl();
  // const [localSpeechToTextMode, setLocalSpeechToTextMode] =
  //   useState(speechToTextMode);
  return (
    <Popup
      title={"Microphone options"}
      onClickClose={false}
      onClose={onClose}
      positioning="above-center"
      contentClassName="p-1 gap-1"
      anchorEl={anchorEl}
      clickCatchStyle={{ opacity: 1 }}
    >
      <Select
        label={"Speech mode"}
        value={speechToTextMode}
        onChange={setSpeechToTextMode}
        fullOptions={SpeechModeOptions}
        variant="button-group-vertical"
      />
      {speechToTextMode === "stt-local" && (
        <Services
          showSpecificService={{
            title: !transcribeAudio ? "Must enable Speech to Text Service" : "",
            serviceName: "speechToText",
          }}
          dbs={dbs}
          dbsMethods={dbsMethods}
          dbsTables={dbsTables}
        />
      )}
      {speechToTextMode !== "off" && (
        <SwitchToggle
          label={"Send automatically"}
          checked={autosend}
          onChange={(v) => setAutosend(v)}
        />
      )}
    </Popup>
  );
};
