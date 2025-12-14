import React from "react";

import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { Services } from "@pages/ServerSettings/Services";
import Popup from "../../Popup/Popup";
import {
  SpeechModeOptions,
  SpeechToTextSendModes,
  type ChatSpeechSetupState,
} from "./useChatSpeechSetup";

export const ChatSpeechSetup = ({
  onClose,
  sendMode,
  setSendMode,
  setSpeechToTextMode,
  speechToTextMode,
  anchorEl,
  mustEnableTranscriptionService,
}: {
  onClose: VoidFunction;
  anchorEl: HTMLElement;
  mustEnableTranscriptionService: boolean;
} & ChatSpeechSetupState) => {
  const { dbs, dbsMethods, dbsTables } = usePrgl();
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
        onChange={(newMode) => setSpeechToTextMode(newMode)}
        fullOptions={SpeechModeOptions}
        variant="button-group-vertical"
      />
      {speechToTextMode === "stt-local" && (
        <Services
          showSpecificService={{
            color: mustEnableTranscriptionService ? "red" : undefined,
            title:
              mustEnableTranscriptionService ?
                "Must enable Speech to Text Service"
              : "Transcription service",
            serviceName: "speechToText",
          }}
          dbs={dbs}
          dbsMethods={dbsMethods}
          dbsTables={dbsTables}
        />
      )}
      {speechToTextMode !== "off" && (
        <Select
          fullOptions={SpeechToTextSendModes}
          label={"Send mode"}
          value={sendMode}
          onChange={setSendMode}
          variant="button-group-vertical"
        />
      )}
    </Popup>
  );
};
