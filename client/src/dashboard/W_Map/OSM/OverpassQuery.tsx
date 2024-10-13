import React from "react"
import { SmartCodeEditor } from "../../CodeEditor/SmartCodeEditor";

type P = {
  query: string;
  onChange: (value: string) => void;
  autoSave?: boolean;
}
export const OverpassQuery = ({ query, onChange, autoSave }: P) => {
  
  return <div style={{ minWidth: "500px" }}>
    <SmartCodeEditor
      language="text"
      label="Overpass Query"
      autoSave={autoSave}
      value={query}
      onSave={onChange} 
    />
  </div>
}