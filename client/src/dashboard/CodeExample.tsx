import React from "react";
import CodeEditor, { CodeEditorProps } from "./CodeEditor";

type P = CodeEditorProps & {
  header?: React.ReactNode;
}
const CodeExample = ({ header, ...props }: P) => {

  return <div className={"flex-col gap-p1 f-1 b b-gray-400 rounded o-hidden "  + (props.className || "")} >
    {header}
    <CodeEditor
      style={{ minWidth: "200px", minHeight: "100px"}}
      {...props}
      className={"f-1 "}
      options={{ 
        tabSize: 2,
        minimap: {
          enabled: false
        },
        lineNumbers: "off",
        ...props.options
      }} 
    />
</div>
}

export default CodeExample;