import React from "react"
import { SmartCodeEditor } from "../../CodeEditor/SmartCodeEditor";

type P = {
  query: string;
  onChange: (value: string) => void;
}
export const OverpassQuery = ({ query, onChange }: P) => {
  
  return <div style={{ minWidth: "500px" }}>
    <SmartCodeEditor
      language="text"
      label="Overpass Query"
      value={query}
      onSave={onChange} 
    />
  </div>
}