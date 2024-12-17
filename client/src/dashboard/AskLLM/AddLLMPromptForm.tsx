import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import SmartForm from "../SmartForm/SmartForm";
import { mdiPlus } from "@mdi/js";

export const AddLLMPromptForm = ({
  theme,
  dbs,
  dbsTables,
}: Pick<Prgl, "theme" | "dbs" | "dbsTables">) => {
  return (
    <PopupMenu
      button={
        <Btn iconPath={mdiPlus} color="action" variant="filled">
          Create new prompt
        </Btn>
      }
      render={(pClose) => (
        <SmartForm
          db={dbs as any}
          tableName="llm_prompts"
          tables={dbsTables}
          methods={{}}
          theme={theme}
          onInserted={pClose}
        />
      )}
    />
  );
};
