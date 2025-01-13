import React from "react";
import { CodeEditorWithSaveButton } from "../../CodeEditor/CodeEditorWithSaveButton";

type P = {
  query: string;
  onChange: (value: string) => void;
  autoSave?: boolean;
};
export const OverpassQuery = ({ query, onChange, autoSave }: P) => {
  return (
    <div style={{ minWidth: "500px" }}>
      <CodeEditorWithSaveButton
        language="text"
        label="Overpass Query"
        autoSave={autoSave}
        value={query}
        onSave={onChange}
      />
    </div>
  );
};
