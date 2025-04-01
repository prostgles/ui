import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import { SmartForm } from "../SmartForm/SmartForm";
import { mdiPlus } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";

export const AddLLMPromptForm = ({
  dbs,
  dbsTables,
}: Pick<Prgl, "dbs" | "dbsTables">) => {
  return (
    <PopupMenu
      button={
        <Btn iconPath={mdiPlus} color="action" variant="filled">
          Create new prompt
        </Btn>
      }
      render={(pClose) => (
        <SmartForm
          db={dbs as DBHandlerClient}
          tableName="llm_prompts"
          tables={dbsTables}
          methods={{}}
          onSuccess={pClose}
        />
      )}
    />
  );
};
