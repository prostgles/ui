import React from "react";
import type { CodeEditorProps } from "./CodeEditor/CodeEditor";
import { CodeEditor } from "./CodeEditor/CodeEditor";

type P = CodeEditorProps & {
  header?: React.ReactNode;
};
const CodeExample = ({ header, ...props }: P) => {
  return (
    <div
      className={
        "flex-col gap-p1 f-1 b b-color-2 rounded o-hidden " +
        (props.className || "")
      }
    >
      {header}
      <CodeEditor
        style={{ minWidth: "200px", minHeight: "100px" }}
        {...props}
        className={"f-1 b-none"}
        options={{
          tabSize: 2,
          minimap: {
            enabled: false,
          },
          lineNumbers: "off",
          ...props.options,
        }}
      />
    </div>
  );
};

export default CodeExample;
